/**
 * Centralización de tipos de carrito y producto.
 * Siguiendo la regla estricta de arquitectura para evitar discrepancias de UI.
 */

export interface Product {
  id: string;
  storeId?: string;
  sku: string;
  name: string;
  category?: string;
  costPrice: number;
  salePrice: number;
  unitProfit?: number;
  stock: number;
  minStock: number;
  taxRate?: number;
  isActive: boolean;
  image?: string;
}

export interface CartItemState {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  unitCost: number;
  image?: string;
  subtotal: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type SaleType = 'IN_STORE' | 'ONLINE' | 'WHATSAPP';
export type OrderStatus = 'COMPLETED' | 'PENDING_DELIVERY';

export interface PosTotals {
  subtotal: number;
  tax: number;
  total: number;
}
