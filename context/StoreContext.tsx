
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, InventoryMovement, FinancialSettings, Role, User } from '../types';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  movements: InventoryMovement[];
  settings: FinancialSettings;
  currentUser: User | null;
  currentUserRole: Role | undefined;
  
  login: (user: User) => void;
  logout: () => void;
  addProduct: (product: Omit<Product, 'ownerId' | 'id'>) => void;
  updateProduct: (product: Product) => void;
  processSale: (sale: Omit<Sale, 'ownerId'>) => void;
  cancelSale: (saleId: string) => void;
  updateSettings: (settings: FinancialSettings) => void;
  getDashboardStats: (period: 'day' | 'month') => any;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // GESTIÓN DE SESIÓN: sessionStorage garantiza que la sesión muera al cerrar el navegador
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = sessionStorage.getItem('user_session');
    return session ? JSON.parse(session) : null;
  });

  // BASE DE DATOS PERSISTENTE: localStorage actúa como nuestro disco duro
  const [allProducts, setAllProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('products') || '[]'));
  const [allSales, setAllSales] = useState<Sale[]>(() => JSON.parse(localStorage.getItem('sales') || '[]'));
  const [allMovements, setAllMovements] = useState<InventoryMovement[]>(() => JSON.parse(localStorage.getItem('movements') || '[]'));
  const [settings, setSettings] = useState<FinancialSettings>(() => JSON.parse(localStorage.getItem('settings') || '{"monthlyFixedCosts": 10000, "targetMargin": 0.3}'));

  // AISLAMIENTO DE DATOS: Filtro automático basado en el usuario logueado
  // Ningún componente fuera de este contexto puede ver datos de otros usuarios
  const products = allProducts.filter(p => p.ownerId === currentUser?.id);
  const sales = allSales.filter(s => s.ownerId === currentUser?.id);
  const movements = allMovements.filter(m => m.ownerId === currentUser?.id);
  const currentUserRole = currentUser?.role;

  // Sincronización con "Base de Datos"
  useEffect(() => localStorage.setItem('products', JSON.stringify(allProducts)), [allProducts]);
  useEffect(() => localStorage.setItem('sales', JSON.stringify(allSales)), [allSales]);
  useEffect(() => localStorage.setItem('movements', JSON.stringify(allMovements)), [allMovements]);
  useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);

  const login = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('user_session', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('user_session');
  };

  const addProduct = (productData: Omit<Product, 'ownerId' | 'id'>) => {
    if (!currentUser) return;
    const newProduct: Product = {
      ...productData,
      id: crypto.randomUUID(),
      ownerId: currentUser.id // Vinculación obligatoria al usuario
    };
    setAllProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (updated: Product) => {
    // Verificación de seguridad: El usuario debe ser el dueño
    if (updated.ownerId !== currentUser?.id) return;
    setAllProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const processSale = (saleData: Omit<Sale, 'ownerId'>) => {
    if (!currentUser) return;
    const sale: Sale = { ...saleData, ownerId: currentUser.id };
    
    setAllSales(prev => [...prev, sale]);

    // Lógica de inventario vinculada
    setAllProducts(prevProducts => {
      const nextProducts = [...prevProducts];
      sale.items.forEach(item => {
        const idx = nextProducts.findIndex(p => p.id === item.productId && p.ownerId === currentUser.id);
        if (idx !== -1) {
          nextProducts[idx] = { ...nextProducts[idx], stock: nextProducts[idx].stock - item.quantity };
        }
      });
      return nextProducts;
    });
  };

  const cancelSale = (saleId: string) => {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED' || sale.ownerId !== currentUser?.id) return;

    setAllSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELLED' } : s));
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
    const activeSales = sales.filter(s => s.status === 'ACTIVE');
    const totalRevenue = activeSales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = activeSales.reduce((acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + (item.quantity * item.unitCost), 0), 0);
    
    return {
      salesCount: activeSales.length,
      totalRevenue,
      totalProfit: totalRevenue - totalCost,
      ticketAverage: activeSales.length > 0 ? totalRevenue / activeSales.length : 0
    };
  };

  return (
    <StoreContext.Provider value={{
      products, sales, movements, settings, currentUser, currentUserRole,
      login, logout, addProduct, updateProduct, processSale, cancelSale, updateSettings, getDashboardStats
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
