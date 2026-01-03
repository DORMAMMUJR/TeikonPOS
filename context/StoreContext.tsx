import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Product, Sale, FinancialSettings, Role, User, CashSession, CartItem, SaleResult, SaleDetail, PendingSale } from '../types';
import { productsAPI, salesAPI, dashboardAPI, authAPI, setAuthToken, clearAuthToken, getCurrentUserFromToken } from '../utils/api';
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

  // Refresh currentUser from token periodically to detect token changes/expiration
  useEffect(() => {
    const interval = setInterval(() => {
      const user = getCurrentUserFromToken();
      setCurrentUser(user);
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  // Restore cash session from localStorage on mount
  useEffect(() => {
    if (!currentUser) return;

    const savedSession = localStorage.getItem('cashSession');
    if (savedSession) {
      try {
        const session: CashSession = JSON.parse(savedSession);

        // Validate session belongs to current user and is still open
        if (session.ownerId === currentUser.id && session.status === 'OPEN') {
          console.log('✅ Restored cash session from localStorage:', session.id);
          setAllSessions([session]);
        } else {
          // Invalid session, clear it
          console.warn('⚠️ Invalid session in localStorage, clearing...');
          localStorage.removeItem('cashSession');
        }
      } catch (e) {
        console.error('❌ Error parsing saved session:', e);
        localStorage.removeItem('cashSession');
      }
    }
  }, [currentUser]);

  // Initial Data Fetch
  const syncData = useCallback(async () => {
    if (!currentUser || !isOnline) return;
    try {
      // 1. Sync Pending Offline Sales first
      const pendingSales = await getPendingSales();
      if (pendingSales.length > 0) {
        console.log(`Syncing ${pendingSales.length} offline sales...`);
        // We sync one by one or batch if API supports it. Current API supports batch.
        // Transforming PendingSale to structure API expects if needed, or just sending
        // For 'sync' endpoint.
        await salesAPI.sync(pendingSales);
        await clearPendingSales();
        console.log('Offline sales synced successfully');
      }

      // 2. Fetch fresh data
      const [fetchedProducts, fetchedSales] = await Promise.all([
        productsAPI.getAll(),
        salesAPI.getAll()
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

      // Expenses and Sessions could be fetched here too if needed
    } catch (error: any) {
      console.error('Data Sync Error:', error);

      // Handle session expiration - the global interceptor will have already
      // shown the alert and redirected, but we clean up local state too
      if (error.message === 'SESIÓN_EXPIRADA') {
        logout();
      }
    }
  }, [currentUser, isOnline]);

  useEffect(() => {
    syncData();
  }, [syncData]);

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
    // Force reload to clear any stale state
    window.location.href = user?.role === 'SUPER_ADMIN' ? '/admin/stores' : '/dashboard';
  };

  const logout = () => {
    clearAuthToken(); // This now also clears sessionStorage
    setCurrentUser(null);
    setProducts([]);
    setSales([]);

    // Clear cash session from localStorage
    localStorage.removeItem('cashSession');
    console.log('🚪 Logout: Cash session cleared from localStorage');
  };

  const openSession = async (startBalance: number) => {
    // TODO: Implement API call for opening session (CashShift)
    // Mocking strictly local for now as CashShift API integration wasn't explicitly detailed in the prompt request for this specific context method, 
    // but ideally this should hit the API.
    // For robustness, I'll keep local state update for now to unblock the UI flow.
    const newSession: CashSession = {
      id: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      startBalance,
      expectedBalance: startBalance,
      cashSales: 0,
      refunds: 0,
      status: 'OPEN',
      ownerId: currentUser?.id || 'unknown'
    };
    setAllSessions(prev => [...prev, newSession]);

    // Save to localStorage for persistence across reloads
    localStorage.setItem('cashSession', JSON.stringify(newSession));
    console.log('💾 Cash session saved to localStorage:', newSession.id);
  };

  const closeSession = async (endBalanceReal: number) => {
    if (!currentSession) return;
    // TODO: Implement API call
    const expected = currentSession.startBalance + currentSession.cashSales - currentSession.refunds;
    setAllSessions(prev => prev.map(s => s.id === currentSession.id ? {
      ...s,
      status: 'CLOSED',
      endTime: new Date().toISOString(),
      expectedBalance: expected,
      endBalanceReal
    } : s));

    // Clear from localStorage
    localStorage.removeItem('cashSession');
    console.log('🗑️ Cash session cleared from localStorage');
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
      alert(`Error al crear producto: ${e.message || 'Error desconocido'}`);
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
        // Call API to cancel
        // await salesAPI.cancel(saleId); // Need to implement this in API util if not existing
      }
      // Local update
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELLED' } : s));

      // Revert stock logic... (Simplified for now)
    } catch (e) {
      console.error(e);
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

  return (
    <StoreContext.Provider value={{
      products, sales, allSessions, settings, currentUser, currentUserRole: currentUser?.role, currentSession, isOnline, isLoading, error,
      login, logout, updateCurrentUser, openSession, closeSession, addProduct, updateProduct, deleteProduct, processSaleAndContributeToGoal, cancelSale, updateSettings, getDashboardStats, calculateTotalInventoryValue, syncData
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
