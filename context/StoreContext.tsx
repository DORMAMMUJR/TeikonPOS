import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Sale, FinancialSettings, Role, User, CashSession, CartItem, SaleResult, SaleDetail, PendingSale } from '../types';
import { Product } from "@/Product";
import { productsAPI, salesAPI, dashboardAPI, authAPI, setAuthToken, clearAuthToken, getCurrentUserFromToken, API_URL, getHeaders } from '../utils/api';
import { addPendingSale, getPendingSales, clearPendingSales } from '../utils/offlineSync';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  allSessions: CashSession[];
  settings: FinancialSettings;
  currentUser: User | null;
  currentUserRole: Role | undefined;
  currentSession: CashSession | null;
  isOnline: boolean;
  isLoading: boolean;
  isRecoveringSession: boolean; // NEW: Prevents showing modal before recovery completes
  isOpeningSession: boolean; // NEW: Loading state for session opening
  error: string | null;

  login: (token: string) => void;
  logout: () => void;
  updateCurrentUser: (userData: Partial<User>) => void;
  openSession: (startBalance: number) => Promise<void>;
  closeSession: (endBalance: number) => Promise<void>;
  addProduct: (product: Omit<Product, 'ownerId' | 'id'>, activeStoreId?: string) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  processSaleAndContributeToGoal: (cartItems: CartItem[], paymentMethod: 'CASH' | 'CARD' | 'TRANSFER') => Promise<SaleResult>;
  cancelSale: (saleId: string) => Promise<void>;
  updateSettings: (settings: FinancialSettings) => void;
  getDashboardStats: (period: 'day' | 'month', storeId?: string) => Promise<any>;
  calculateTotalInventoryValue: () => number;
  syncData: () => Promise<void>;
  searchProductBySKU: (sku: string) => Promise<Product | null>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
  const [error, setError] = useState<string | null>(null);

  const currentSession = allSessions.find(s => s.status === 'OPEN') || null;

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

        const response = await fetch(`${API_URL}/api/shifts/current?storeId=${storeId}`, {
          headers: getHeaders()
        });

        if (response.ok) {
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Server returned non-JSON response, assuming no active shift');
            setAllSessions([]);
            localStorage.removeItem('cashSession');
            lastCheckedStoreId.current = storeId || null;
            return;
          }

          const data = await response.json();
          console.log('📦 Session Found:', data);

          const session: CashSession = {
            id: data.id,
            startTime: data.start_time || data.startTime,
            startBalance: parseFloat(data.initial_amount || data.initialAmount || 0),
            expectedBalance: parseFloat(data.expected_amount || data.expectedAmount || data.initial_amount || data.initialAmount || 0),
            cashSales: parseFloat(data.cash_sales || data.cashSales || 0),
            refunds: 0,
            status: 'OPEN',
            ownerId: userId || data.opened_by
          };

          console.log('✅ Active session restored:', session.id);
          setAllSessions([session]);
          localStorage.setItem('cashSession', JSON.stringify(session));
          lastCheckedStoreId.current = storeId || null;

        } else if (response.status === 204 || response.status === 404) {
          console.log('ℹ️ No active session found (User must open shift)');
          setAllSessions([]);
          localStorage.removeItem('cashSession');
          lastCheckedStoreId.current = storeId || null;
        } else {
          console.error(`❌ Session check failed with status: ${response.status}`);
          // Clear session on error to allow fresh start
          setAllSessions([]);
          localStorage.removeItem('cashSession');
        }

      } catch (error) {
        console.error('❌ Network/Server error checking session:', error);
        // Clear session on error to allow fresh start
        setAllSessions([]);
        localStorage.removeItem('cashSession');
      } finally {
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
        } catch (syncError) {
          console.warn('⚠️ Failed to sync offline sales, will retry later:', syncError);
          // Don't block the app, just log and continue
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

      const mappedProducts = Array.isArray(fetchedProducts) ? fetchedProducts.map((p: any) => ({
        ...p,
        name: p.nombre || p.name || 'Sin Nombre',
        category: p.categoria || p.category || 'General',
        image: p.imagen || p.image,
        costPrice: Number(p.costPrice || 0),
        salePrice: Number(p.salePrice || 0),
        // Bidirectional mapping: backend 'activo' <-> frontend 'isActive'
        isActive: p.activo !== undefined ? p.activo : (p.isActive !== undefined ? p.isActive : true)
      })) : [];

      setProducts(mappedProducts as Product[]);
      setSales(fetchedSales);
      setIsLoading(false);

      // Cache data for offline fallback (only essential data to avoid quota issues)
      try {
        // Only cache essential product fields (exclude images and large data)
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

        localStorage.setItem('cachedProducts', JSON.stringify(essentialProducts));
        localStorage.setItem('cachedSales', JSON.stringify(fetchedSales.slice(-50))); // Only last 50 sales
        console.log('💾 Data cached successfully for offline use');
      } catch (cacheError: any) {
        // If still quota exceeded, clear old cache and try again
        if (cacheError.name === 'QuotaExceededError') {
          console.warn('⚠️ Storage quota exceeded, clearing old cache...');
          try {
            localStorage.removeItem('cachedProducts');
            localStorage.removeItem('cachedSales');
            console.log('✅ Old cache cleared');
          } catch (e) {
            console.error('❌ Failed to clear cache:', e);
          }
        } else {
          console.warn('⚠️ Failed to cache data:', cacheError);
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
   * Updates product cache every 30 seconds for fresh prices and stock
   */
  const syncDataSilently = useCallback(async () => {
    if (!currentUser || !isOnline) return;

    try {
      console.log('🔄 Background sync: Refreshing product data...');

      const fetchedProducts = await productsAPI.getAll();

      const mappedProducts = Array.isArray(fetchedProducts) ? fetchedProducts.map((p: any) => ({
        ...p,
        name: p.nombre || p.name || 'Sin Nombre',
        category: p.categoria || p.category || 'General',
        image: p.imagen || p.image,
        costPrice: Number(p.costPrice || 0),
        salePrice: Number(p.salePrice || 0),
        isActive: p.activo !== undefined ? p.activo : (p.isActive !== undefined ? p.isActive : true)
      })) : [];

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
        localStorage.setItem('cachedProducts', JSON.stringify(essentialProducts));
        console.log('✅ Background sync: Products updated and cached');
      } catch (cacheError: any) {
        if (cacheError.name === 'QuotaExceededError') {
          localStorage.removeItem('cachedProducts');
        }
        console.warn('⚠️ Background sync: Failed to cache data:', cacheError);
      }

    } catch (error) {
      console.warn('⚠️ Background sync failed (will retry):', error);
      // Don't show error to user - this is a silent background operation
    }
  }, [currentUser, isOnline]);

  // Initial sync on mount
  useEffect(() => {
    syncData();
  }, [syncData]);

  // IMPROVED: Background sync every 30 seconds
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    // Start background sync after initial load
    const interval = setInterval(() => {
      syncDataSilently();
    }, 30000); // 30 seconds

    console.log('🔄 Background sync enabled (every 30s)');

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

      const response = await fetch(`${API_URL}/api/shifts/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          storeId: currentUser.storeId,
          initialAmount: startBalance,
          openedBy: currentUser.username
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);

        // Special handling for "shift already exists" error
        if (errorData.error && errorData.error.includes('Ya existe un turno')) {
          // Try to recover the existing shift
          const existingShiftResponse = await fetch(`${API_URL}/api/shifts/current?storeId=${currentUser.storeId}`, {
            headers: getHeaders()
          });

          if (existingShiftResponse.ok) {
            const existingShift = await existingShiftResponse.json();
            const session: CashSession = {
              id: existingShift.id,
              startTime: existingShift.start_time || existingShift.startTime,
              startBalance: parseFloat(existingShift.initial_amount || existingShift.initialAmount || 0),
              expectedBalance: parseFloat(existingShift.expected_amount || existingShift.expectedAmount || 0),
              cashSales: parseFloat(existingShift.cash_sales || existingShift.cashSales || 0),
              refunds: 0,
              status: 'OPEN',
              ownerId: currentUser.id
            };

            setAllSessions([session]);
            localStorage.setItem('cashSession', JSON.stringify(session));
            console.log('✅ Recovered existing shift:', session.id);
            return; // Exit successfully
          }
        }

        throw new Error(errorData.error || 'Error al abrir turno de caja');
      }

      const backendShift = await response.json();
      console.log('📦 Backend shift response:', backendShift);

      // CRITICAL FIX: Map PostgreSQL column names correctly
      // Backend returns: start_time, initial_amount (snake_case)
      // Frontend expects: startTime, initialAmount (camelCase)
      const newSession: CashSession = {
        id: backendShift.id,
        startTime: backendShift.start_time || backendShift.startTime || new Date().toISOString(),
        startBalance: parseFloat(backendShift.initial_amount || backendShift.initialAmount || startBalance),
        expectedBalance: parseFloat(backendShift.expected_amount || backendShift.expectedAmount || backendShift.initial_amount || backendShift.initialAmount || startBalance),
        cashSales: 0,
        refunds: 0,
        status: 'OPEN',
        ownerId: currentUser.id
      };

      console.log('✅ Mapped session object:', newSession);

      // Update local state
      setAllSessions(prev => [...prev, newSession]);

      // Save to localStorage for offline fallback
      localStorage.setItem('cashSession', JSON.stringify(newSession));

      console.log('✅ Cash shift opened successfully:', newSession.id);
      console.log('   Session saved to state and localStorage');
    } catch (error: any) {
      console.error('❌ Error opening cash shift:', error);
      throw error;
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

  const processSaleAndContributeToGoal = async (cartItems: CartItem[], paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'): Promise<SaleResult> => {
    if (!currentUser) return { totalRevenueAdded: 0, totalProfitAdded: 0, success: false };

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
      status: 'ACTIVE',
      items: saleItems,
      syncedAt: isOnline ? new Date() : null
    };

    try {
      if (isOnline) {
        // Try online sync
        const savedSale = await salesAPI.create(newSale);
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
        // We need to cast it to 'Sale' type for local state
        const optimisticSale: Sale = {
          id: offlineSale.tempId || 'temp',
          sellerId: newSale.vendedor,
          date: new Date().toISOString(),
          ownerId: currentUser.id,
          ...newSale
        } as any;

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

        // Sync updated session to localStorage
        const updatedSession = updatedSessions.find(s => s.id === currentSession.id);
        if (updatedSession) {
          localStorage.setItem('cashSession', JSON.stringify(updatedSession));
        }
      }

      return {
        totalRevenueAdded: totalTransactionRevenue,
        totalProfitAdded: totalTransactionProfit,
        success: true
      };

    } catch (error) {
      console.error('Sale processing error:', error);
      return { totalRevenueAdded: 0, totalProfitAdded: 0, success: false };
    }
  };

  const addProduct = async (productData: Omit<Product, 'ownerId' | 'id'>, activeStoreId?: string) => {
    if (!currentUser) return;
    try {
      if (isOnline) {
        // Map frontend field names (English) to backend API names (Spanish)
        const productPayload: any = {
          sku: productData.sku,
          nombre: productData.name,
          categoria: productData.category || '',
          costPrice: productData.costPrice,
          salePrice: productData.salePrice,
          stock: productData.stock || 0,
          minStock: productData.minStock || 0,
          taxRate: productData.taxRate || 0,
          imagen: productData.image,
          // Bidirectional mapping: frontend 'isActive' -> backend 'activo'
          activo: productData.isActive !== undefined ? productData.isActive : true,
          storeId: activeStoreId || (currentUser.role === 'SUPER_ADMIN'
            ? (productData as any).storeId
            : currentUser.storeId)
        };

        // DEBUG: Log payload before sending
        console.log('📦 Payload:', JSON.stringify(productPayload, null, 2));
        console.log('👤 User:', currentUser.username, 'Role:', currentUser.role);
        console.log('🏪 StoreId:', productPayload.storeId);

        // Validate storeId is present
        if (!productPayload.storeId) {
          console.error('❌ ERROR: storeId is null');
          alert('Error: Debe seleccionar una tienda para crear el producto.');
          throw new Error('Store ID is required to create products');
        }

        const newProduct = await productsAPI.create(productPayload);
        console.log('✅ Product created:', newProduct);
        setProducts(prev => [...prev, newProduct]);
      } else {
        console.warn('Cannot add products while offline');
        alert('No se pueden agregar productos sin conexión a internet.');
      }
    } catch (e: any) {
      console.error('Error creating product:', e);
      alert(`Error al crear producto: ${e.message || 'Error desconocido'} `);
    }
  };


  const updateProduct = async (updated: Product) => {
    try {
      if (isOnline) {
        // Map frontend field names to backend field names
        const updatePayload: any = {
          ...updated,
          nombre: updated.name,
          categoria: updated.category,
          imagen: updated.image,
          activo: updated.isActive
        };

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
        const response = await fetch(`${API_URL}/api/sales/${saleId}/cancel`, {
          method: 'POST',
          headers: getHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cancelar venta');
        }

        const result = await response.json();
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

  return (
    <StoreContext.Provider value={{
      products, sales, allSessions, settings, currentUser, currentUserRole: currentUser?.role, currentSession, isOnline, isLoading, isRecoveringSession, isOpeningSession: isOpeningSessionState, error,
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
