
export type Role = 'admin' | 'seller';

export interface User {
  id: string;
  username: string;
  role: Role;
  department: string;
}

export interface CashSession {
  id: string;
  startTime: string;
  endTime?: string;
  startBalance: number;
  expectedBalance: number;
  endBalanceReal?: number;
  cashSales: number;
  refunds: number;
  status: 'OPEN' | 'CLOSED';
  ownerId: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  unitProfit: number;
  stock: number;
  minStock: number;
  taxRate: number;
  isActive: boolean;
  image?: string;
  ownerId: string;
}

export interface SaleDetail {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  subtotal: number;
}

// Nueva interfaz para ítems del carrito según requerimiento
export interface CartItem {
  name: string;
  sellingPrice: number;
  unitCost: number;
  quantity: number;
  productId?: string; // Opcional para vinculación con DB
}

// Nueva interfaz para el resultado de la transacción
export interface SaleResult {
  totalRevenueAdded: number;
  totalProfitAdded: number;
  success: boolean;
}

export interface Sale {
  id: string;
  date: string;
  sellerId: string;
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  total: number;
  status: 'ACTIVE' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  items: SaleDetail[];
  ownerId: string;
}

export interface FinancialSettings {
  monthlyFixedCosts: number;
}
