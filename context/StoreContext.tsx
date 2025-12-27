
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, FinancialSettings, Role, User, CashSession, CartItem, SaleResult, SaleDetail } from '../types';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  allSessions: CashSession[];
  settings: FinancialSettings;
  currentUser: User | null;
  currentUserRole: Role | undefined;
  currentSession: CashSession | null;
  
  login: (user: User) => void;
  logout: () => void;
  openSession: (startBalance: number) => void;
  closeSession: (endBalance: number) => void;
  addProduct: (product: Omit<Product, 'ownerId' | 'id'>) => void;
  updateProduct: (product: Product) => void;
  processSaleAndContributeToGoal: (cartItems: CartItem[], paymentMethod: 'CASH' | 'CARD' | 'TRANSFER') => Promise<SaleResult>;
  cancelSale: (saleId: string) => void;
  updateSettings: (settings: FinancialSettings) => void;
  getDashboardStats: (period: 'day' | 'month') => any;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Producto Semilla para Pruebas
const SEED_PRODUCTS: Product[] = [
  {
    id: 'seed-papas-001',
    sku: '0003',
    name: 'Papas',
    category: 'Snacks',
    costPrice: 15,
    salePrice: 22,
    unitProfit: 7, // $22 - $15
    stock: 12,
    minStock: 3,
    taxRate: 0,
    isActive: true,
    ownerId: 'usr-1' // Vinculado al admin por defecto
  }
];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = sessionStorage.getItem('user_session');
    return session ? JSON.parse(session) : null;
  });

  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    if (saved) return JSON.parse(saved);
    return SEED_PRODUCTS; // Cargar semilla si no hay datos
  });

  const [allSales, setAllSales] = useState<Sale[]>(() => JSON.parse(localStorage.getItem('sales') || '[]'));
  const [allSessions, setAllSessions] = useState<CashSession[]>(() => JSON.parse(localStorage.getItem('cash_sessions') || '[]'));
  const [settings, setSettings] = useState<FinancialSettings>(() => JSON.parse(localStorage.getItem('settings') || '{"monthlyFixedCosts": 10000}'));

  const products = allProducts.filter(p => p.ownerId === currentUser?.id);
  const sales = allSales.filter(s => s.ownerId === currentUser?.id);
  const currentSession = allSessions.find(s => s.ownerId === currentUser?.id && s.status === 'OPEN') || null;

  useEffect(() => localStorage.setItem('products', JSON.stringify(allProducts)), [allProducts]);
  useEffect(() => localStorage.setItem('sales', JSON.stringify(allSales)), [allSales]);
  useEffect(() => localStorage.setItem('cash_sessions', JSON.stringify(allSessions)), [allSessions]);
  useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);

  const login = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('user_session', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('user_session');
  };

  const openSession = (startBalance: number) => {
    if (!currentUser) return;
    const newSession: CashSession = {
      id: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      startBalance,
      expectedBalance: startBalance,
      cashSales: 0,
      refunds: 0,
      status: 'OPEN',
      ownerId: currentUser.id
    };
    setAllSessions(prev => [...prev, newSession]);
  };

  const closeSession = (endBalanceReal: number) => {
    if (!currentSession) return;
    const expected = currentSession.startBalance + currentSession.cashSales - currentSession.refunds;
    
    setAllSessions(prev => prev.map(s => s.id === currentSession.id ? { 
      ...s, 
      status: 'CLOSED', 
      endTime: new Date().toISOString(),
      expectedBalance: expected,
      endBalanceReal
    } : s));
  };

  const processSaleAndContributeToGoal = async (cartItems: CartItem[], paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'): Promise<SaleResult> => {
    if (!currentUser || !currentSession) return { totalRevenueAdded: 0, totalProfitAdded: 0, success: false };

    let totalTransactionRevenue = 0;
    let totalTransactionProfit = 0;

    const saleItems: SaleDetail[] = cartItems.map(item => {
      const itemRevenue = item.sellingPrice * item.quantity;
      let itemProfit = 0;

      if (!item.unitCost || item.unitCost <= 0) {
        console.warn(`[TEIKON FINANCIAL] Missing Cost for item: ${item.name}. Assuming 100% margin.`);
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

    totalTransactionRevenue = Math.round(totalTransactionRevenue * 100) / 100;
    totalTransactionProfit = Math.round(totalTransactionProfit * 100) / 100;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      sellerId: currentUser.username,
      subtotal: totalTransactionRevenue,
      totalDiscount: 0,
      taxTotal: 0,
      total: totalTransactionRevenue,
      status: 'ACTIVE',
      paymentMethod,
      items: saleItems,
      ownerId: currentUser.id
    };

    setAllSales(prev => [...prev, newSale]);

    if (paymentMethod === 'CASH') {
      setAllSessions(prev => prev.map(s => 
        s.id === currentSession.id 
          ? { ...s, cashSales: Math.round((s.cashSales + totalTransactionRevenue) * 100) / 100 } 
          : s
      ));
    }

    setAllProducts(prevProducts => {
      const nextProducts = [...prevProducts];
      saleItems.forEach(item => {
        const idx = nextProducts.findIndex(p => p.id === item.productId);
        if (idx !== -1) nextProducts[idx] = { ...nextProducts[idx], stock: nextProducts[idx].stock - item.quantity };
      });
      return nextProducts;
    });
    
    return {
      totalRevenueAdded: totalTransactionRevenue,
      totalProfitAdded: totalTransactionProfit,
      success: true
    };
  };

  const addProduct = (productData: Omit<Product, 'ownerId' | 'id'>) => {
    if (!currentUser) return;
    const newProduct: Product = { ...productData, id: crypto.randomUUID(), ownerId: currentUser.id };
    setAllProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (updated: Product) => {
    if (updated.ownerId !== currentUser?.id) return;
    setAllProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const cancelSale = (saleId: string) => {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED' || !currentSession) return;

    setAllSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELLED' } : s));

    if (sale.paymentMethod === 'CASH') {
      setAllSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, refunds: s.refunds + sale.total } : s));
    }

    setAllProducts(prevProducts => {
      const nextProducts = [...prevProducts];
      sale.items.forEach(item => {
        const idx = nextProducts.findIndex(p => p.id === item.productId);
        if (idx !== -1) nextProducts[idx] = { ...nextProducts[idx], stock: nextProducts[idx].stock + item.quantity };
      });
      return nextProducts;
    });
  };

  const updateSettings = (newSettings: FinancialSettings) => setSettings(newSettings);

  const getDashboardStats = (period: 'day' | 'month') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().slice(0, 7);

    const filteredSales = sales.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      const saleDate = s.date.split('T')[0];
      if (period === 'day') return saleDate === todayStr;
      if (period === 'month') return saleDate.startsWith(monthStr);
      return true;
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    
    const totalCost = filteredSales.reduce((acc, s) => {
      return acc + s.items.reduce((iAcc, item) => iAcc + (item.unitCost * item.quantity), 0);
    }, 0);

    const totalProfit = filteredSales.reduce((acc, s) => {
      return acc + s.items.reduce((iAcc, item) => {
        const profit = item.unitCost > 0 ? (item.unitPrice - item.unitCost) : item.unitPrice;
        return iAcc + (profit * item.quantity);
      }, 0);
    }, 0);
    
    return {
      salesCount: filteredSales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      ticketAverage: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    };
  };

  return (
    <StoreContext.Provider value={{
      products, sales, allSessions, settings, currentUser, currentUserRole: currentUser?.role, currentSession,
      login, logout, openSession, closeSession, addProduct, updateProduct, processSaleAndContributeToGoal, cancelSale, updateSettings, getDashboardStats
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
