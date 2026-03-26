import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Sale, FinancialSettings, Role, User, CashSession, CartItem, SaleResult, SaleDetail, PendingSale } from '../types';
import { Product } from "@/Product";
import { productsAPI, salesAPI, dashboardAPI, authAPI, setAuthToken, clearAuthToken, getCurrentUserFromToken, API_URL, getHeaders } from '../utils/api';
import { addPendingSale, getPendingSales, clearPendingSales } from '../utils/offlineSync';
import { mapShiftToSession, mapBackendProduct, mapProductToBackend, validateStoreId, getStoreId } from '../utils/dataMappers';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  allSessions: CashSession[];
  settings: FinancialSettings;
  currentUser: User | null;
  currentUserRole: Role | undefined;
  currentSession: CashSession | null;
  isCashRegisterOpen: boolean; // NEW: Derived state for cash register status
  isOnline: boolean;
  isLoading: boolean;
  isRecoveringSession: boolean; // NEW: Prevents showing modal before recovery completes
  isOpeningSession: boolean; // NEW: Loading state for session opening
  isTransactionInProgress: boolean; // NEW: Lock to prevent sync during checkout
  error: string | null;

  login: (token: string) => void;
  logout: () => void;
  safeLogout: () => boolean; // Returns false if blocked by open cash shift
  updateCurrentUser: (userData: Partial<User>) => void;
  openSession: (startBalance: number) => Promise<void>;
  closeSession: (endBalance: number) => Promise<void>;
  addProduct: (product: Omit<Product, 'ownerId' | 'id'>, activeStoreId?: string) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  processSaleAndContributeToGoal: (
    cartItems: CartItem[],
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
    options?: {
      clientId?: string;
      saleType?: 'RETAIL' | 'WHOLESALE' | 'ECOMMERCE';
      deliveryDate?: string;
      shippingAddress?: string;
      ecommerceOrderId?: string;
      status?: 'ACTIVE' | 'PENDING';
      transactionId?: string; // Clave de idempotencia
    }
  ) => Promise<SaleResult>;
  cancelSale: (saleId: string) => Promise<void>;
  updateSettings: (settings: FinancialSettings) => void;
  getDashboardStats: (period: 'day' | 'month', storeId?: string) => Promise<any>;
  calculateTotalInventoryValue: () => number;
  syncData: () => Promise<void>;
  searchProductBySKU: (sku: string) => Promise<Product | null>;
  setTransactionInProgress: (inProgress: boolean) => void; // NEW: Control transaction lock
  importProducts: (productsData: any[]) => Promise<{ success: boolean; imported: number }>;
  refreshProducts: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /**
   * HELPER: Safe localStorage setter with QuotaExceededError protection
   * Automatically clears old cache if quota is exceeded and retries with minimal data
   */
  const safeSetLocalStorage = (key: string, value: string, isCritical: boolean = false): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.error(`❌ Storage quota exceeded while saving '${key}'`);

        if (isCritical) {
          // For critical data (like cashSession), clear non-critical cache and retry
          console.warn('   Clearing non-critical cache to save critical data...');
          try {
            localStorage.removeItem('cachedProducts');
            localStorage.removeItem('cachedSales');
            localStorage.setItem(key, value);
            console.log(`✅ Critical data '${key}' saved after clearing cache`);
            return true;
          } catch (retryError) {
            console.error(`❌ Failed to save '${key}' even after clearing cache`);
            return false;
          }
        } else {
          // For non-critical data, just log and continue
          console.warn(`   Skipping non-critical data '${key}' due to quota`);
          return false;
        }
      } else {
        console.error(`❌ Unexpected error saving '${key}':`, error);
        return false;
      }
    }
  };

  // Derive currentUser from JWT token instead of storing in state
  // This ensures each tab has its own isolated session
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUserFromToken());

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [allSessions, setAllSessions] = useState<CashSession[]>([]);
  const [settings, setSettings] = useState<FinancialSettings>({ monthlyFixedCosts: 10000 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveringSession, setIsRecoveringSession] = useState(true); // Start as true to prevent premature modal
  const [isOpeningSessionState, setIsOpeningSessionState] = useState(false); // Loading state for UI
  const [isTransactionInProgress, setIsTransactionInProgress] = useState(false); // Lock to prevent sync during checkout
  const [error, setError] = useState<string | null>(null);

  const currentSession = allSessions.find(s => s.status === 'OPEN') || null;
  const isCashRegisterOpen = !!currentSession;

  // Monitor online status
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Token validation is handled by HTTP interceptors - no need for polling

  // PERFORMANCE FIX: Ref to prevent duplicate session checks
  const sessionCheckInProgress = useRef(false);
  const lastCheckedStoreId = useRef<string | null>(null);

  // DEBOUNCE FIX: Prevent duplicate POST requests when opening session
  const isOpeningSession = useRef(false);

  /**
   * Helper: Check if a session is from today
   * Used to determine if cached session is still valid for current day
   */
  const isSessionFromToday = (session: CashSession): boolean => {
    try {
      const sessionDate = new Date(session.startTime);
      const today = new Date();
      return sessionDate.toDateString() === today.toDateString();
    } catch (error) {
      console.warn('⚠️ Failed to parse session date:', error);
      return false;
    }
  };

  // Session Recovery: Restore cash session from backend on mount
  // OPTIMIZED: Uses primitive dependencies to prevent infinite loops
  useEffect(() => {
    // Extract primitive values to avoid object reference changes
    const userId = currentUser?.id;
    const userRole = currentUser?.role;
    let storeId = currentUser?.storeId;

    // Fallback: Try localStorage for storeId (F5/Reload case)
    if (!storeId) {
      const stored = localStorage.getItem('selectedStore');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          storeId = typeof parsed === 'object' ? (parsed.id || parsed.storeId) : parsed;
        } catch {
          storeId = stored;
        }
      }
    }

    // GUARD 0: Skip if no currentUser (user is not logged in)
    if (!currentUser) {
      console.log('👤 No user logged in, skipping session recovery');
      setIsRecoveringSession(false);
      return;
    }

    // GUARD 1: Prevent duplicate calls if already checking
    if (sessionCheckInProgress.current) {
      console.log('⏭️ Session check already in progress, skipping...');
      return;
    }

    // GUARD 2: Don't re-check if storeId hasn't changed and we already have a session
    if (storeId && storeId === lastCheckedStoreId.current && currentSession) {
      console.log('✅ Session already loaded for this store, skipping check');
      setIsRecoveringSession(false);
      return;
    }

    // GUARD 3: Skip if offline
    if (!isOnline) {
      setIsRecoveringSession(false);
      return;
    }

    // GUARD 4: Skip if no storeId and not SUPER_ADMIN
    if (!storeId && userRole !== 'SUPER_ADMIN') {
      console.warn('⚠️ No storeId available for session recovery');
      setIsRecoveringSession(false);
      return;
    }

    // SUPER_ADMIN bypass
    if (userRole === 'SUPER_ADMIN') {
      console.log('👑 SUPER_ADMIN detected - Skipping active shift requirement');
      setIsRecoveringSession(false);
      return;
    }

    // START RECOVERY
    const checkSession = async () => {
      sessionCheckInProgress.current = true;
      setIsRecoveringSession(true);

      try {
        console.log(`🔄 Recovering active shift for store: ${storeId}`);

        // Add timeout protection (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_URL}/api/shifts/current?storeId=${storeId}`, {
          headers: getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Validar JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Server returned non-JSON response');
            setAllSessions([]);
            localStorage.removeItem('cashSession');
            setIsRecoveringSession(false);
            return;
          }

          const data = await response.json();
          console.log('📦 Session Found:', data);

          // BLINDAJE 1: Si data es null o vacío, la caja está CERRADA.
          // Borramos cualquier basura local y salimos.
          if (!data || Object.keys(data).length === 0) {
            console.log('ℹ️ No active session (Data is null/empty)');
            setAllSessions([]);
            localStorage.removeItem('cashSession'); // <--- MATAMOS AL ZOMBIE
            lastCheckedStoreId.current = storeId || null;
            setIsRecoveringSession(false);
            return;
          }

          // BLINDAJE 2: Usar el mapper seguro
          const session = mapShiftToSession(data, userId);

          // Si el mapper devolvió null (datos inválidos), limpiamos y salimos
          if (!session) {
            console.warn('⚠️ Mapper returned null (Invalid Data)');
            setAllSessions([]);
            localStorage.removeItem('cashSession');
            setIsRecoveringSession(false);
            return;
          }

          // CRITICAL: Check if session is from today
          if (!isSessionFromToday(session)) {
            console.log('🗑️ Backend session is from previous day, clearing...');
            localStorage.removeItem('cashSession');
            setAllSessions([]);
            lastCheckedStoreId.current = storeId || null;
            setIsRecoveringSession(false);
            return;
          }

          console.log('✅ Active session restored:', session.id);
          setAllSessions([session]);
          localStorage.setItem('cashSession', JSON.stringify(session));
          lastCheckedStoreId.current = storeId || null;
          setIsRecoveringSession(false);

        } else if (response.status === 204 || response.status === 404) {
          console.log('ℹ️ No active session found (User must open shift)');
          setAllSessions([]);
          localStorage.removeItem('cashSession');
          lastCheckedStoreId.current = storeId || null;
          setIsRecoveringSession(false);
        } else {
          // Handle other error status codes
          console.error(`❌ Session check failed with status: ${response.status}`);

          // Try to parse error message if JSON
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            try {
              const errorData = await response.json();
              console.error('   Error details:', errorData);
            } catch (e) {
              console.warn('   Could not parse error response');
            }
          }

          // Clear session on error to allow fresh start
          setAllSessions([]);
          localStorage.removeItem('cashSession');
          lastCheckedStoreId.current = storeId || null;
          setIsRecoveringSession(false);
        }

      } catch (error: any) {
        console.error('❌ Error in checkSession:', error);

        // ✅ IMPROVED: Determine if error is network-related or logic-related
        const isNetworkError =
          error.name === 'AbortError' ||
          (error instanceof TypeError && error.message.includes('fetch')) ||
          !navigator.onLine;

        const isParseError = error instanceof SyntaxError;

        // Log specific error type
        if (error.name === 'AbortError') {
          console.error('   Type: Session recovery timeout (10s exceeded)');
          console.warn('   Backend may be slow or unreachable');
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('   Type: Network error - Cannot reach backend');
          console.warn('   Check if server is running and accessible');
        } else if (isParseError) {
          console.error('   Type: JSON parse error - Backend returned invalid data');
          console.warn('   Backend may have returned HTML instead of JSON');
        } else {
          console.error('   Type: Unexpected error');
        }

        // ✅ CRITICAL: Only use localStorage fallback for NETWORK errors
        if (isNetworkError) {
          console.log('🔄 Network error detected - Attempting localStorage fallback...');
          try {
            const cachedSession = localStorage.getItem('cashSession');
            if (cachedSession) {
              const parsed = JSON.parse(cachedSession);

              // CRITICAL: Check if session is from today
              if (isSessionFromToday(parsed)) {
                console.log('📦 Loaded session from localStorage fallback (today):', parsed.id);
                setAllSessions([parsed]);
                lastCheckedStoreId.current = storeId || null;
                setIsRecoveringSession(false);
                return;
              } else {
                console.log('🗑️ Cached session is from previous day, clearing...');
                localStorage.removeItem('cashSession');
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ Could not load cached session:', cacheError);
          }
        } else {
          // ✅ CRITICAL: For non-network errors (parse, logic, etc.), CLEAR localStorage
          console.warn('🗑️ Non-network error detected - Clearing stale localStorage data');
          localStorage.removeItem('cashSession');
        }

        // Clear session state to allow fresh start
        setAllSessions([]);
        setIsRecoveringSession(false);
      } finally {
        // ✅ SAFETY: Ensure recovery flag is always cleared
        setIsRecoveringSession(false);
        sessionCheckInProgress.current = false;
      }
    };

    checkSession();

    // CRITICAL: Only depend on PRIMITIVE values, not objects
    // NOTE: currentSession removed from deps to prevent infinite loop (it derives from allSessions which we update)
  }, [currentUser?.id, currentUser?.storeId, currentUser?.role, isOnline]);

  // Initial Data Fetch
  const syncData = useCallback(async () => {
    if (!currentUser || !isOnline) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Sync Pending Offline Sales first
      const pendingSales = await getPendingSales();
      if (pendingSales.length > 0) {
        console.log(`Syncing ${pendingSales.length} offline sales...`);
        try {
          await salesAPI.sync(pendingSales);
          await clearPendingSales();
          console.log('✅ Offline sales synced successfully');
        } catch (syncError: any) {
          // Handle specific NO_OPEN_SHIFT error (409)
          if (syncError.message && syncError.message.includes('NO_OPEN_SHIFT')) {
            console.warn('⚠️ Cannot sync offline sales: No open shift.');
            // Alert user visually
            alert('Caja Cerrada: Abre un turno para sincronizar las ventas pendientes.');
            // We do NOT clear pending sales, preserving them for later
          } else {
            console.warn('⚠️ Failed to sync offline sales, will retry later:', syncError);
          }
          // Don't block the app, continue loading
        }
      }

      // 2. Fetch fresh data with timeout and retry logic
      const fetchWithTimeout = async (promise: Promise<any>, timeoutMs = 10000) => {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
        );
        return Promise.race([promise, timeoutPromise]);
      };

      const [fetchedProducts, fetchedSales] = await Promise.all([
        fetchWithTimeout(productsAPI.getAll()),
        fetchWithTimeout(salesAPI.getAll())
      ]);

      const mappedProducts = Array.isArray(fetchedProducts)
        ? fetchedProducts.map(mapBackendProduct)
        : [];

      setProducts(mappedProducts as Product[]);
      setSales(fetchedSales);
      setIsLoading(false);

      // Cache data for offline fallback (only essential data to avoid quota issues)
      try {
        // OPTIMIZATION: Only cache essential product fields (exclude images and large data)
        const essentialProducts = mappedProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sku: p.sku,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
          stock: p.stock,
          isActive: p.isActive
          // Removed: image, ownerId, timestamps to save space
        }));

        // Only cache last 30 sales (reduced from 50)
        const recentSales = fetchedSales.slice(-30);

        // Calculate approximate size before storing
        const productsSize = JSON.stringify(essentialProducts).length;
        const salesSize = JSON.stringify(recentSales).length;
        const totalSize = productsSize + salesSize;

        console.log(`💾 Caching data: ${(totalSize / 1024).toFixed(2)} KB`);

        // Warn if approaching 1MB (localStorage limit is typically 5-10MB)
        if (totalSize > 1000000) {
          console.warn('⚠️ Cache size exceeds 1MB, consider reducing data');
        }

        localStorage.setItem('cachedProducts', JSON.stringify(essentialProducts));
        localStorage.setItem('cachedSales', JSON.stringify(recentSales));
        console.log('✅ Data cached successfully for offline use');

      } catch (cacheError: any) {
        // Handle QuotaExceededError specifically
        if (cacheError.name === 'QuotaExceededError' || cacheError.code === 22) {
          console.error('❌ Storage quota exceeded!');
          console.warn('   Clearing old cache and retrying with minimal data...');

          try {
            // Clear ALL non-essential localStorage items
            const keysToRemove = ['cachedProducts', 'cachedSales', 'pendingSales'];
            keysToRemove.forEach(key => {
              try {
                localStorage.removeItem(key);
                console.log(`   Removed: ${key}`);
              } catch (e) {
                console.warn(`   Failed to remove ${key}`);
              }
            });

            // Retry with MINIMAL data (only top 10 products and 5 sales)
            const minimalProducts = mappedProducts.slice(0, 10).map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              salePrice: p.salePrice,
              stock: p.stock
            }));

            const minimalSales = fetchedSales.slice(-5);

            localStorage.setItem('cachedProducts', JSON.stringify(minimalProducts));
            localStorage.setItem('cachedSales', JSON.stringify(minimalSales));
            console.log('✅ Minimal cache saved successfully');

          } catch (retryError) {
            console.error('❌ Failed to save even minimal cache:', retryError);
            console.warn('   App will work online-only until cache is cleared manually');
          }
        } else {
          console.warn('⚠️ Failed to cache data (non-quota error):', cacheError);
        }
      }

      console.log('✅ Data synced successfully from SaaS server');

    } catch (error: any) {
      console.error('❌ Data Sync Error:', error);

      // Handle different error types
      if (error.message === 'SESIÓN_EXPIRADA') {
        // Session expired - the global interceptor will have already handled redirect
        logout();
        setIsLoading(false);
        return;
      }

      if (error.message === 'NETWORK_ERROR' || error.message === 'REQUEST_TIMEOUT' || error.name === 'TypeError') {
        // Network error or timeout - Enter graceful offline mode
        console.warn('⚠️ Servidor SaaS no disponible - Activando Modo Offline');
        setError('Modo Offline: No se pudo conectar al servidor. Los datos se sincronizarán cuando vuelva la conexión.');
        setIsOnline(false);

        // Try to load cached data from localStorage as fallback
        try {
          const cachedProducts = localStorage.getItem('cachedProducts');
          const cachedSales = localStorage.getItem('cachedSales');

          if (cachedProducts) {
            setProducts(JSON.parse(cachedProducts));
            console.log('📦 Loaded products from cache');
          }

          if (cachedSales) {
            setSales(JSON.parse(cachedSales));
            console.log('💰 Loaded sales from cache');
          }
        } catch (cacheError) {
          console.error('Failed to load cached data:', cacheError);
        }

        setIsLoading(false);

        // Retry connection after 30 seconds
        setTimeout(() => {
          console.log('🔄 Retrying connection to SaaS server...');
          setIsOnline(navigator.onLine);
          if (navigator.onLine) {
            syncData();
          }
        }, 30000);

        return;
      }

      // Other errors - show generic error but don't block app
      setError('Error al sincronizar datos. La app funcionará con datos locales.');
      setIsLoading(false);
    }
  }, [currentUser, isOnline]);

  /**
   * IMPROVED: Background sync - Silent data refresh without blocking UI
   * Updates product cache every 5 minutes for fresh prices and stock
   * SMART SYNC: Respects transaction lock to prevent conflicts during checkout
   */
  const syncDataSilently = useCallback(async () => {
    if (!currentUser || !isOnline) return;

    // 🔒 CRITICAL: Block sync if transaction is in progress
    if (isTransactionInProgress) {
      console.log('⏸️ Background sync skipped: Transaction in progress');
      return;
    }

    try {
      console.log('🔄 Background sync: Refreshing product data...');

      const fetchedProducts = await productsAPI.getAll();

      const mappedProducts = Array.isArray(fetchedProducts)
        ? fetchedProducts.map(mapBackendProduct)
        : [];

      // Update state without loading indicator
      setProducts(mappedProducts as Product[]);

      // Update cache silently (only essential data to avoid quota issues)
      try {
        const essentialProducts = mappedProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sku: p.sku,
          costPrice: p.costPrice,
          salePrice: p.salePrice,
          stock: p.stock,
          isActive: p.isActive
        }));
        safeSetLocalStorage('cachedProducts', JSON.stringify(essentialProducts), false); // Non-critical cache
        console.log('✅ Background sync: Products updated and cached');
      } catch (cacheError: any) {
        console.warn('⚠️ Background sync: Failed to process data:', cacheError);
      }

    } catch (error) {
      console.warn('⚠️ Background sync failed (will retry):', error);
      // Don't show error to user - this is a silent background operation
    }
  }, [currentUser, isOnline, isTransactionInProgress]);

  // Initial sync on mount
  useEffect(() => {
    syncData();
  }, [syncData]);

  // SMART SYNC: Background sync every 5 minutes (reduced from 30 seconds)
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    // Start background sync after initial load
    const interval = setInterval(() => {
      syncDataSilently();
    }, 300000); // 5 minutes (300000ms) - was 30 seconds

    console.log('🔄 Background sync enabled (every 5 min)');

    return () => {
      clearInterval(interval);
      console.log('🛑 Background sync disabled');
    };
  }, [currentUser, isOnline, syncDataSilently]);

  // Function to update current user profile locally
  const updateCurrentUser = (userData: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };

      // Update state
      setCurrentUser(updatedUser);

      // Also update token in localStorage if possible, or just user details if we are using a different storage mechanism
      // Since token is JWT, we can't easily modify it client-side without re-issuing.
      // However, we can update a separate 'userDetails' in localStorage if we used that.
      // For now, updating the state is enough for the current session UI.
    }
  };

  const login = (token: string) => {
    setAuthToken(token);
    const user = getCurrentUserFromToken();
    setCurrentUser(user);
    // Navigation handled by Login component - removed window.location.href to fix token persistence
    // window.location.href = user?.role === 'SUPER_ADMIN' ? '/admin/stores' : '/dashboard';
  };

  const logout = () => {
    // 1. Borrar Token y Usuario
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');

    // 2. IMPORTANTE: Borrar datos de la sesión de caja vieja
    localStorage.removeItem('cashSession');
    localStorage.removeItem('activeSession');

    // 3. Borrar preferencias
    localStorage.removeItem('selectedStore');

    // 4. Resetear estados de React
    setCurrentUser(null);
    setProducts([]);
    setSales([]);
    setAllSessions([]); // ✅ CORRECTO: setAllSessions existe, setActiveSession NO

    console.log('🚪 Logout: All data cleared');
  };

  /**
   * safeLogout: Guard that prevents logout when a cash shift is open.
   * - Returns TRUE  → logout proceeded (no open shift or SUPER_ADMIN)
   * - Returns FALSE → logout blocked (open shift found, UI must show warning)
   */
  const safeLogout = (): boolean => {
    // SUPER_ADMIN bypass: no cash shifts to worry about
    if (currentUser?.role === 'SUPER_ADMIN') {
      logout();
      return true;
    }

    // Check for any open cash session
    const openSession = allSessions.find(s => s.status === 'OPEN');
    if (openSession) {
      console.warn('⚠️ safeLogout: Blocked — active cash shift found:', openSession.id);
      return false; // Caller should show OpenShiftWarningModal
    }

    // No open shift — safe to logout
    logout();
    return true;
  };

  const openSession = async (startBalance: number) => {
    if (!currentUser) {
      console.error('❌ Cannot open session: No user logged in');
      throw new Error('Usuario no autenticado');
    }

    // DEBOUNCE: Prevent duplicate POST requests
    if (isOpeningSession.current) {
      console.warn('⚠️ Session opening already in progress, ignoring duplicate request');
      return;
    }

    try {
      isOpeningSession.current = true; // Lock to prevent duplicates
      setIsOpeningSessionState(true); // Show loading UI

      console.log('🔵 Opening cash shift via API...');
      console.log('   Store ID:', currentUser.storeId);
      console.log('   Initial amount:', startBalance);

      // Add timeout protection (15 seconds for POST operations)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}/api/shifts/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          storeId: currentUser.storeId,
          initialAmount: startBalance,
          openedBy: currentUser.id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let errorData: any = {};

        if (contentType?.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (e) {
            console.error('❌ Failed to parse error response as JSON');
            throw new Error(`Error del servidor (HTTP ${response.status})`);
          }
        } else {
          console.error('❌ Server returned non-JSON error response');
          throw new Error(`Error del servidor: Respuesta inválida (HTTP ${response.status})`);
        }

        console.error('❌ Server error:', errorData);

        // Special handling for "shift already exists" error (409 Conflict or specific message)
        if (response.status === 409 || (errorData.error && errorData.error.includes('Ya existe un turno'))) {
          console.log('⚠️ Shift already exists, attempting to recover...');

          try {
            // Try to recover the existing shift
            const existingShiftResponse = await fetch(`${API_URL}/api/shifts/current?storeId=${currentUser.storeId}`, {
              headers: getHeaders()
            });

            if (existingShiftResponse.ok) {
              const contentType = existingShiftResponse.headers.get('content-type');

              if (!contentType?.includes('application/json')) {
                // Backend returned HTML - log response for debugging
                const responseText = await existingShiftResponse.text();
                console.error('❌ Backend returned HTML instead of JSON');
                console.error('   Response preview:', responseText.substring(0, 200));
                console.error('   Content-Type:', contentType);

                // Since we know shift exists but can't recover it, show helpful message
                throw new Error('El servidor confirmó que existe un turno abierto, pero no pudo proporcionar los detalles. Por favor, contacta al administrador para cerrar el turno anterior desde la base de datos.');
              }

              const existingShift = await existingShiftResponse.json();

              // Use standardized mapper
              const session = mapShiftToSession(existingShift, currentUser.id);

              // SEGURIDAD: Manejar datos corruptos
              if (!session) {
                console.error('❌ mapShiftToSession returned null for existing shift');
                throw new Error('Los datos del turno existente están corruptos.');
              }

              setAllSessions([session]);
              localStorage.setItem('cashSession', JSON.stringify(session));
              console.log('✅ Recovered existing shift:', session.id);
              console.log('   You can continue working with the existing shift');
              return; // Exit successfully
            } else {
              // Recovery endpoint returned error
              console.error('❌ Failed to fetch existing shift, status:', existingShiftResponse.status);
              throw new Error('No se pudo recuperar el turno existente del servidor.');
            }
          } catch (recoveryError: any) {
            console.error('❌ Failed to recover existing shift:', recoveryError);

            // If the error already has a user-friendly message, use it
            if (recoveryError.message.includes('servidor') || recoveryError.message.includes('administrador')) {
              throw recoveryError;
            }

            // Otherwise, provide generic guidance
            throw new Error('Ya existe un turno abierto pero no se pudo recuperar. Verifica tu conexión o contacta al administrador.');
          }
        }

        // Throw user-friendly error message
        throw new Error(errorData.error || errorData.message || 'Error al abrir turno de caja');
      }

      // Parse successful response
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Backend returned non-JSON response');
      }

      const backendShift = await response.json();
      console.log('📦 Backend shift response:', backendShift);

      // Use standardized mapper
      const newSession = mapShiftToSession(backendShift, currentUser.id);

      // SEGURIDAD: Manejar datos corruptos
      if (!newSession) {
        console.error('❌ mapShiftToSession returned null for new shift');
        throw new Error('Los datos del turno recibidos del servidor están corruptos.');
      }

      console.log('✅ Mapped session object:', newSession);

      // Update local state
      setAllSessions(prev => [...prev, newSession]);

      // Save to localStorage for offline fallback (with quota protection)
      try {
        localStorage.setItem('cashSession', JSON.stringify(newSession));
      } catch (storageError) {
        console.warn('⚠️ Failed to save session to localStorage:', storageError);
      }

      console.log('✅ Cash shift opened successfully:', newSession.id);
      console.log('   Session saved to state and localStorage');

    } catch (error: any) {
      // Handle different error types with user-friendly messages
      if (error.name === 'AbortError') {
        console.error('❌ Session opening timeout (15s exceeded)');
        throw new Error('La operación tardó demasiado. Verifica tu conexión e intenta nuevamente.');
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Network error opening session:', error);
        throw new Error('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      } else {
        console.error('❌ Error opening cash shift:', error);
        throw error; // Re-throw with original message
      }
    } finally {
      // CRITICAL: Always release lock and hide loading, even on error
      isOpeningSession.current = false;
      setIsOpeningSessionState(false);
    }
  };

  const closeSession = async (endBalanceReal: number) => {
    if (!currentSession) {
      console.error('❌ Cannot close session: No active session');
      return;
    }

    if (!currentUser) {
      console.error('❌ Cannot close session: No user logged in');
      throw new Error('Usuario no autenticado');
    }

    try {
      console.log('🔵 Closing cash shift via API...');

      const expected = currentSession.startBalance + currentSession.cashSales - currentSession.refunds;

      const response = await fetch(`${API_URL}/api/shifts/end`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          storeId: currentUser.storeId,
          finalAmount: endBalanceReal,
          expectedAmount: expected,
          notes: '' // Can be extended to accept notes parameter
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cerrar turno de caja');
      }

      const closedShift = await response.json();

      console.log('✅ Cash shift closed successfully:', closedShift.id);
      console.log(`   Expected: $${expected}, Real: $${endBalanceReal}, Difference: $${closedShift.difference} `);

      // Update local state to reflect closed status
      setAllSessions(prev => prev.map(s => s.id === currentSession.id ? {
        ...s,
        status: 'CLOSED',
        endTime: closedShift.endTime,
        expectedBalance: expected,
        endBalanceReal
      } : s));

      // Clear from localStorage
      localStorage.removeItem('cashSession');
      console.log('🗑️ Cash session cleared from localStorage');
    } catch (error: any) {
      console.error('❌ Error closing cash shift:', error);
      throw error;
    }
  };

  const calculateTotalInventoryValue = () => {
    return products.reduce((acc, product) => {
      const cost = Number(product.costPrice) || 0;
      const currentStock = Number(product.stock) || 0;
      return acc + (cost * currentStock);
    }, 0);
  };

  const processSaleAndContributeToGoal = async (
    cartItems: CartItem[],
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
    options?: {
      clientId?: string;
      saleType?: 'RETAIL' | 'WHOLESALE' | 'ECOMMERCE';
      deliveryDate?: string;
      shippingAddress?: string;
      ecommerceOrderId?: string;
      status?: 'ACTIVE' | 'PENDING';
      transactionId?: string; // Clave de idempotencia para evitar ventas duplicadas
    }
  ): Promise<SaleResult> => {
    if (!currentUser) return { totalRevenueAdded: 0, totalProfitAdded: 0, success: false };

    // 🔒 CRITICAL: Lock to prevent background sync during transaction
    setIsTransactionInProgress(true);

    try {
      let totalTransactionRevenue = 0;
      let totalTransactionProfit = 0;

      const saleItems: SaleDetail[] = cartItems.map(item => {
        const itemRevenue = item.sellingPrice * item.quantity;
        let itemProfit = 0;
        if (!item.unitCost || item.unitCost <= 0) {
          itemProfit = itemRevenue;
        } else {
          itemProfit = (item.sellingPrice - item.unitCost) * item.quantity;
        }
        totalTransactionRevenue += itemRevenue;
        totalTransactionProfit += itemProfit;

        return {
          productId: item.productId || 'unknown',
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          unitCost: item.unitCost || 0,
          discount: 0,
          subtotal: itemRevenue
        };
      });

      const newSale = {
        storeId: currentUser.storeId || 'unknown',
        vendedor: currentUser.username,
        subtotal: totalTransactionRevenue,
        totalDiscount: 0,
        taxTotal: 0,
        total: totalTransactionRevenue,
        totalCost: totalTransactionRevenue - totalTransactionProfit, // Approximate
        netProfit: totalTransactionProfit,
        paymentMethod,
        status: options?.status || 'ACTIVE',
        clientId: options?.clientId,
        saleType: options?.saleType || 'RETAIL',
        deliveryDate: options?.deliveryDate,
        shippingAddress: options?.shippingAddress,
        ecommerceOrderId: options?.ecommerceOrderId,
        items: saleItems,
        syncedAt: isOnline ? new Date() : null,
        transactionId: options?.transactionId || null
      };

      let finalSale: Sale | undefined;

      if (isOnline) {
        // Try online sync
        const savedSale = await salesAPI.create(newSale);
        finalSale = savedSale; // Capture the saved sale

        // Update local state with real data from server
        setSales(prev => [...prev, savedSale]);

        // Optimistic stock update
        setProducts(prevProducts => {
          const nextProducts = [...prevProducts];
          saleItems.forEach(item => {
            const idx = nextProducts.findIndex(p => p.id === item.productId);
            if (idx !== -1) nextProducts[idx] = { ...nextProducts[idx], stock: nextProducts[idx].stock - item.quantity };
          });
          return nextProducts;
        });

      } else {
        // Offline mode
        const offlineSale: PendingSale = {
          ...newSale,
          tempId: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        } as any; // Casting to fit PendingSale if types slightly mismatch

        await addPendingSale(offlineSale);
        console.log('Sale saved offline');

        // Update UI optimistically
        const optimisticSale: Sale = {
          id: offlineSale.tempId || 'temp',
          sellerId: newSale.vendedor,
          date: new Date().toISOString(),
          ownerId: currentUser.id,
          ...newSale
        } as any;

        finalSale = optimisticSale; // Capture the optimistic sale

        setSales(prev => [...prev, optimisticSale]);
      }

      // Update Session if CASH
      if (paymentMethod === 'CASH' && currentSession) {
        const updatedSessions = allSessions.map(s =>
          s.id === currentSession.id
            ? { ...s, cashSales: Math.round((s.cashSales + totalTransactionRevenue) * 100) / 100 }
            : s
        );
        setAllSessions(updatedSessions);

        // Sync updated session to localStorage (with quota protection)
        const updatedSession = updatedSessions.find(s => s.id === currentSession.id);
        if (updatedSession) {
          try {
            localStorage.setItem('cashSession', JSON.stringify(updatedSession));
          } catch (storageError) {
            console.warn('⚠️ Failed to save session to localStorage:', storageError);
          }
        }
      }

      const result = {
        totalRevenueAdded: totalTransactionRevenue,
        totalProfitAdded: totalTransactionProfit,
        success: true,
        sale: finalSale
      };

      // 🔄 SMART SYNC: Trigger immediate sync after successful sale
      if (isOnline) {
        console.log('✅ Sale completed - Triggering immediate sync');
        // Don't await to avoid blocking the UI
        syncDataSilently().catch(err =>
          console.warn('⚠️ Post-sale sync failed:', err)
        );
      }

      return result;

    } catch (error) {
      console.error('Sale processing error:', error);
      return { totalRevenueAdded: 0, totalProfitAdded: 0, success: false };
    } finally {
      // 🔓 CRITICAL: Always release lock, even on error
      setIsTransactionInProgress(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'ownerId' | 'id'>, activeStoreId?: string) => {
    if (!currentUser) return;

    try {
      if (isOnline) {
        // Get storeId with fallback
        const storeId = activeStoreId || getStoreId(currentUser);

        // Validate storeId exists
        validateStoreId(storeId, 'crear producto');

        // Use standardized mapper
        const productPayload = mapProductToBackend(productData, storeId!);

        // DEBUG: Log payload before sending
        console.log('📦 Payload:', JSON.stringify(productPayload, null, 2));
        console.log('👤 User:', currentUser.username, 'Role:', currentUser.role);
        console.log('🏪 StoreId:', productPayload.storeId);

        const newProduct = await productsAPI.create(productPayload);
        console.log('✅ Product created:', newProduct);
        setProducts(prev => [...prev, mapBackendProduct(newProduct)]);
      } else {
        console.warn('Cannot add products while offline');
        alert('No se pueden agregar productos sin conexión a internet.');
      }
    } catch (e: any) {
      console.error('Error creating product:', e);
      alert(`Error al crear producto: ${e.message || 'Error desconocido'}`);
    }
  };


  const updateProduct = async (updated: Product) => {
    try {
      if (isOnline) {
        // Use standardized mapper
        const updatePayload = mapProductToBackend(updated);

        await productsAPI.update(updated.id, updatePayload);
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      if (isOnline) {
        await productsAPI.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        alert("No se puede eliminar productos en modo offline");
      }
    } catch (e) {
      console.error("Error deleting product:", e);
      alert("Error al eliminar producto");
    }
  };

  const cancelSale = async (saleId: string) => {
    try {
      if (isOnline) {
        // Call backend API to cancel sale (restores stock and updates DB)
        const result = await salesAPI.cancel(saleId);

        console.log('✅ Venta cancelada:', result);

        // Update local state after successful backend cancellation
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELLED' } : s));

        // Refresh products to reflect restored stock
        await syncData();

        alert('✅ Venta cancelada exitosamente. El inventario ha sido restaurado.');
      } else {
        // Offline mode - cannot cancel sales without backend
        alert('⚠️ No se pueden cancelar ventas en modo offline. Conéctate a internet e intenta nuevamente.');
      }
    } catch (e: any) {
      console.error('Error al cancelar venta:', e);
      alert(`❌ Error al cancelar venta: ${e.message || 'Error desconocido'}`);
      throw e; // Rethrow to let caller handle it if needed
    }
  };

  const updateSettings = (newSettings: FinancialSettings) => setSettings(newSettings);

  const getDashboardStats = async (period: 'day' | 'month', storeId?: string) => {
    // If online, fetch from optimized endpoint
    if (isOnline) {
      try {
        return await dashboardAPI.getSummary(period, storeId);
      } catch (e) {
        console.error('Failed to fetch dashboard stats, falling back to local calc', e);
      }
    }

    // Fallback: Local calculation (same as before)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().slice(0, 7);

    // Filter sales by storeId if provided
    let relevantSales = sales;
    if (storeId) {
      relevantSales = sales.filter(s => s.storeId === storeId); // Assuming Sale has storeId locally, if not this fallback might be limited
    }

    const filteredSales = relevantSales.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      const saleDate = s.date.split('T')[0];
      if (period === 'day') return saleDate === todayStr;
      if (period === 'month') return saleDate.startsWith(monthStr);
      return true;
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    // ... Simplified cost/profit calc for offline fallback
    return {
      salesToday: totalRevenue, // Renamed to match new interface
      salesCount: filteredSales.length,
      ordersCount: filteredSales.length, // Added alias
      totalRevenue,
      grossProfit: totalRevenue * 0.3, // Estimated 30% margin fallback
      netProfit: totalRevenue * 0.2, // Estimated 20% margin fallback
      investment: 0,
      dailyTarget: 0,
      dailyOperationalCost: 0
    };
  };

  /**
   * Search product by SKU - Optimized for barcode scanner
   * Uses dedicated endpoint with database index for ultra-fast lookup
   */
  const searchProductBySKU = async (sku: string): Promise<Product | null> => {
    if (!sku || sku.trim() === '') {
      console.warn('searchProductBySKU: Empty SKU provided');
      return null;
    }

    const normalizedSKU = sku.trim().toUpperCase();

    try {
      // Try online search first
      if (isOnline) {
        console.log(`🔍 Searching product by SKU: ${normalizedSKU}`);

        const response = await fetch(`${API_URL}/api/products/search-sku/${encodeURIComponent(normalizedSKU)}`, {
          headers: getHeaders()
        });

        if (response.status === 404) {
          console.log(`❌ Product not found: ${normalizedSKU}`);
          return null;
        }

        if (!response.ok) {
          throw new Error('Error al buscar producto');
        }

        const product = await response.json();
        console.log(`✅ Product found: ${product.name}`);
        return product as Product;
      } else {
        // Offline fallback: search in cached products
        console.log(`🔍 Offline search for SKU: ${normalizedSKU}`);
        const product = products.find(p =>
          p.sku?.trim().toUpperCase() === normalizedSKU && p.isActive !== false
        );

        if (product) {
          console.log(`✅ Product found in cache: ${product.name}`);
          return product;
        } else {
          console.log(`❌ Product not found in cache: ${normalizedSKU}`);
          return null;
        }
      }
    } catch (error) {
      console.error('Error searching product by SKU:', error);

      // Fallback to local search on error
      const product = products.find(p =>
        p.sku?.trim().toUpperCase() === normalizedSKU && p.isActive !== false
      );

      if (product) {
        console.log(`✅ Product found in local fallback: ${product.name}`);
        return product;
      }

      return null;
    }
  };

  // Helper function to refresh products from server
  const refreshProducts = async () => {
    try {
      const fetchedProducts = await productsAPI.getAll();
      const mappedProducts = Array.isArray(fetchedProducts)
        ? fetchedProducts.map(mapBackendProduct)
        : [];
      setProducts(mappedProducts as Product[]);
      console.log('✅ Products refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh products:', error);
      throw error;
    }
  };


  // Import products with Spanish-to-English column translation
  const importProducts = async (productsData: any[]) => {
    try {
      console.log("📦 Datos Crudos (Fila 1):", productsData[0]); // Para depurar

      // PASO 1: Normalizador de Llaves (La Solución Mágica)
      // Convierte "SKU", "sku ", "ï»¿SKU" -> "sku" limpio
      const normalizeRow = (row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          // Quitamos espacios, BOM y pasamos a minúsculas
          const cleanKey = key.trim().toLowerCase().replace(/^[\uFEFF]/, '');
          newRow[cleanKey] = row[key];
        });
        return newRow;
      };

      // PASO 2: Mapeo Seguro
      const mappedData = productsData.map(rawRow => {
        const p = normalizeRow(rawRow); // Usamos la fila limpia

        return {
          sku: p.sku || p.clave || '',
          name: p.nombre || p.name || p.producto || '',
          salePrice: parseFloat(p.precio || p.price || p.venta || 0),
          costPrice: parseFloat(p.costo || p.cost || p.compra || 0),
          stock: parseInt(p.existencia || p.stock || p.cantidad || 0),
          category: p.categoria || p.category || 'General',
          minStock: 5,
          image: null
        };
      }).filter(p => p.sku && p.sku !== ''); // Filtramos filas vacías

      console.log(`✅ Detectados ${mappedData.length} productos válidos.`);

      if (mappedData.length === 0) {
        throw new Error("El archivo no tiene columnas reconocibles (SKU, Nombre, Precio)");
      }

      // PASO 3: Enviar al Servidor
      const response = await fetch(`${API_URL}/api/products/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(mappedData)
      });

      if (!response.ok) throw new Error('Error al guardar en base de datos');

      await refreshProducts();
      return { success: true, imported: mappedData.length };

    } catch (error) {
      console.error("❌ Error Importación:", error);
      throw error;
    }
  };


  const value = React.useMemo<StoreContextType>(() => ({
    products,
    sales,
    allSessions,
    settings,
    currentUser,
    currentUserRole: currentUser?.role,
    currentSession, // Derived from allSessions
    isCashRegisterOpen, // Derived boolean
    isOnline,
    isLoading,
    isRecoveringSession,
    isOpeningSession: isOpeningSessionState,
    isTransactionInProgress,
    error,
    login, // Assumed stable (not wrapped in useCallback in this snippet but should be)
    logout, // Assumed stable
    safeLogout,
    updateCurrentUser, // Assumed stable
    openSession, // Assumed stable
    closeSession, // Assumed stable
    addProduct,
    updateProduct,
    deleteProduct,
    processSaleAndContributeToGoal,
    cancelSale,
    updateSettings,
    getDashboardStats,
    calculateTotalInventoryValue,
    syncData,
    searchProductBySKU,
    setTransactionInProgress: setIsTransactionInProgress,
    importProducts,
    refreshProducts
  }), [
    products,
    sales,
    allSessions,
    settings,
    currentUser,
    currentSession,
    isCashRegisterOpen,
    isOnline,
    isLoading,
    isRecoveringSession,
    isOpeningSessionState,
    error,
    login, // Assumed stable (not wrapped in useCallback in this snippet but should be)
    logout, // Assumed stable
    safeLogout,
    updateCurrentUser, // Assumed stable
    openSession, // Assumed stable
    closeSession, // Assumed stable
    addProduct,
    updateProduct,
    deleteProduct,
    processSaleAndContributeToGoal,
    cancelSale,
    updateSettings,
    getDashboardStats,
    calculateTotalInventoryValue,
    syncData,
    searchProductBySKU
  ]);

  return (
    <StoreContext.Provider value={{
      products, sales, allSessions, settings, currentUser, currentUserRole: currentUser?.role, currentSession,
      isCashRegisterOpen: currentSession !== null && currentSession.status === 'OPEN', // Derived state
      isOnline, isLoading, isRecoveringSession, isOpeningSession: isOpeningSessionState, error,
      login, logout, updateCurrentUser, openSession, closeSession, addProduct, updateProduct, deleteProduct, processSaleAndContributeToGoal, cancelSale, updateSettings, getDashboardStats, calculateTotalInventoryValue, syncData, searchProductBySKU
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
