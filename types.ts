export type Role = 'admin' | 'seller';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  costPrice: number; // Costo de compra
  salePrice: number; // Precio de venta
  stock: number;
  minStock: number;
  taxRate: number; // Porcentaje (ej. 0.16)
  isActive: boolean;
  image?: string; // Base64 or URL
}

export interface InventoryMovement {
  id: string;
  date: string; // ISO String
  type: 'IN' | 'OUT' | 'ADJUST';
  productId: string;
  quantity: number;
  cost: number; // Snapshot of cost at time of movement
  reason: string;
}

export interface SaleDetail {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Snapshot of price
  unitCost: number; // Snapshot of cost
  discount: number; // Monto de descuento
  subtotal: number; // (qty * price) - discount
}

export interface Sale {
  id: string;
  date: string;
  sellerId: string; // "Admin" or "Seller"
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  total: number;
  status: 'ACTIVE' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  items: SaleDetail[];
}

export interface FinancialSettings {
  monthlyFixedCosts: number;
  targetMargin: number; // e.g., 0.35 for 35%
}