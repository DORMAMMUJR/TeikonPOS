export type Role = 'admin' | 'seller';

export interface User {
  id: string;
  username: string;
  role: Role;
  department: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  taxRate: number;
  isActive: boolean;
  image?: string;
  ownerId: string; // ID del usuario propietario del registro
}

export interface InventoryMovement {
  id: string;
  date: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  productId: string;
  quantity: number;
  cost: number;
  reason: string;
  ownerId: string; // Aislamiento
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
  ownerId: string; // Aislamiento
}

export interface FinancialSettings {
  monthlyFixedCosts: number;
  targetMargin: number;
}