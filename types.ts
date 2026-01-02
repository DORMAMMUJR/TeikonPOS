
export type Role = 'admin' | 'seller' | 'superuser' | 'SUPER_ADMIN';

// ==========================================
// NUEVAS INTERFACES PARA BACKEND
// ==========================================

export interface Organization {
  id: string;
  nombre: string;
  slug: string;
  propietario: string;
  email: string;
  telefono?: string;
  activo: boolean;
}

export interface Store {
  id: string;
  organizationId: string;
  nombre: string;
  slug: string;
  usuario: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
}

export interface User {
  fullName: string;
  id: string;
  username: string;
  role: Role;
  department: string;
  storeName?: string;
  phone?: string;
  fullName?: string; // Nombre completo del usuario
  // Nuevos campos para backend
  storeId?: string;
  organizationId?: string;
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
  storeId: string; // Cambiado de ownerId
  sku: string;
  name: string;
  category: string;
  costPrice: number; // Costo histórico
  salePrice: number;
  unitProfit: number;
  stock: number;
  minStock: number;
  taxRate: number;
  isActive: boolean;
  image?: string;
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

// Interfaz para procesar la venta (Backend logic)
export interface CartItem {
  name: string;
  sellingPrice: number;
  unitCost: number;
  quantity: number;
  productId?: string;
}

// Interfaz extendida para el Estado del UI del POS
export interface CartItemState extends CartItem {
  productId: string; // Obligatorio en el UI
  subtotal: number;
}

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
  totalCost: number; // Nuevo: costo total
  netProfit: number; // Nuevo: utilidad bruta
  status: 'ACTIVE' | 'CANCELLED' | 'PENDING_SYNC'; // Agregado PENDING_SYNC
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  items: SaleDetail[];
  storeId: string; // Cambiado de ownerId
  syncedAt?: string; // Nuevo: timestamp de sincronización
}

// ==========================================
// NUEVAS INTERFACES PARA GESTIÓN DE NEGOCIO
// ==========================================

export interface Expense {
  id: string;
  storeId: string;
  categoria: 'RENT' | 'UTILITIES' | 'PAYROLL' | 'SUPPLIES' | 'MAINTENANCE' | 'OTHER';
  descripcion: string;
  monto: number;
  fecha: string;
  recurrente: boolean;
  comprobante?: string;
  registradoPor: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  storeId: string;
  tipo: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'THEFT' | 'RETURN' | 'TRANSFER';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  referenciaId?: string;
  registradoPor: string;
  createdAt: string;
}

export interface CashShift {
  id: string;
  storeId: string;
  cajero: string;
  apertura: string;
  cierre?: string;
  montoInicial: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  gastos: number;
  montoEsperado?: number;
  montoReal?: number;
  diferencia?: number;
  notas?: string;
  status: 'OPEN' | 'CLOSED';
}

// Interfaz para cola offline
export interface PendingSale {
  tempId: string;
  vendedor: string;
  items: CartItem[];
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  total: number;
  createdAt: string;
}

export interface FinancialSettings {
  monthlyFixedCosts: number;
}
