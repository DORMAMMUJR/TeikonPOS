import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, InventoryMovement, FinancialSettings, Role } from '../types';

interface StoreContextType {
  products: Product[];
  sales: Sale[];
  movements: InventoryMovement[];
  settings: FinancialSettings;
  currentUserRole: Role;
  
  // Actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  processSale: (sale: Sale) => void;
  cancelSale: (saleId: string) => void;
  addStock: (productId: string, qty: number, cost: number, reason: string) => void;
  updateSettings: (settings: FinancialSettings) => void;
  switchRole: (role: Role) => void;
  
  // Helpers
  getDashboardStats: (period: 'day' | 'month') => any;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_SETTINGS: FinancialSettings = {
  monthlyFixedCosts: 10000,
  targetMargin: 0.30
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage or defaults
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [movements, setMovements] = useState<InventoryMovement[]>(() => {
    const saved = localStorage.getItem('movements');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<FinancialSettings>(() => {
    const saved = localStorage.getItem('settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [currentUserRole, setCurrentUserRole] = useState<Role>('admin');

  // Persistence Effects
  useEffect(() => localStorage.setItem('products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('sales', JSON.stringify(sales)), [sales]);
  useEffect(() => localStorage.setItem('movements', JSON.stringify(movements)), [movements]);
  useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
    // Initial stock movement
    if (product.stock > 0) {
      addStock(product.id, product.stock, product.costPrice, "Inventario Inicial");
    }
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const addStock = (productId: string, quantity: number, cost: number, reason: string) => {
    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'IN',
      productId,
      quantity,
      cost,
      reason
    };
    
    setMovements(prev => [...prev, movement]);
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, stock: p.stock + quantity } : p
    ));
  };

  const processSale = (sale: Sale) => {
    // 1. Add Sale
    setSales(prev => [...prev, sale]);

    // 2. Create Movement (OUT) and Update Stock
    const newMovements: InventoryMovement[] = [];
    
    // We update products state atomically
    setProducts(prevProducts => {
      const nextProducts = [...prevProducts];
      
      sale.items.forEach(item => {
        // Create movement record
        newMovements.push({
          id: crypto.randomUUID(),
          date: sale.date,
          type: 'OUT',
          productId: item.productId,
          quantity: item.quantity,
          cost: item.unitCost,
          reason: `Venta #${sale.id.slice(0,6)}`
        });

        // Update stock number
        const productIndex = nextProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          nextProducts[productIndex] = {
            ...nextProducts[productIndex],
            stock: nextProducts[productIndex].stock - item.quantity
          };
        }
      });
      return nextProducts;
    });

    setMovements(prev => [...prev, ...newMovements]);
  };

  const cancelSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELLED') return;

    // 1. Mark sale as cancelled
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELLED' } : s));

    // 2. Return stock (IN movement)
    setProducts(prevProducts => {
      const nextProducts = [...prevProducts];
      const newMovements: InventoryMovement[] = [];

      sale.items.forEach(item => {
        newMovements.push({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          type: 'IN', // Reverse the OUT
          productId: item.productId,
          quantity: item.quantity,
          cost: item.unitCost,
          reason: `Cancelación Venta #${sale.id.slice(0,6)}`
        });

        const productIndex = nextProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          nextProducts[productIndex] = {
            ...nextProducts[productIndex],
            stock: nextProducts[productIndex].stock + item.quantity
          };
        }
      });

      setMovements(prev => [...prev, ...newMovements]);
      return nextProducts;
    });
  };

  const updateSettings = (newSettings: FinancialSettings) => setSettings(newSettings);
  const switchRole = (role: Role) => setCurrentUserRole(role);

  const getDashboardStats = (period: 'day' | 'month') => {
    const now = new Date();
    const activeSales = sales.filter(s => s.status === 'ACTIVE');
    
    // Filter by period
    const periodSales = activeSales.filter(s => {
      const d = new Date(s.date);
      if (period === 'day') {
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
    });

    const totalSales = periodSales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = periodSales.reduce((acc, s) => {
      const costOfSale = s.items.reduce((iAcc, item) => iAcc + (item.quantity * item.unitCost), 0);
      return acc + costOfSale;
    }, 0);
    
    const profit = totalSales - totalCost - periodSales.reduce((acc, s) => acc + s.taxTotal, 0); // Simplified gross profit

    return {
      salesCount: periodSales.length,
      totalRevenue: totalSales,
      totalProfit: profit,
      ticketAverage: periodSales.length > 0 ? totalSales / periodSales.length : 0
    };
  };

  return (
    <StoreContext.Provider value={{
      products, sales, movements, settings, currentUserRole,
      addProduct, updateProduct, processSale, cancelSale, addStock, updateSettings, switchRole, getDashboardStats
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
