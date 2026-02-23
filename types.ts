
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
  sale?: Sale;
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
  status: 'ACTIVE' | 'CANCELLED' | 'PENDING_SYNC' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  items: SaleDetail[];
  storeId: string; // Cambiado de ownerId
  syncedAt?: string; // Nuevo: timestamp de sincronización
  // Omnichannel fields
  clientId?: string;
  saleType?: 'RETAIL' | 'WHOLESALE' | 'ECOMMERCE';
  deliveryDate?: string;
  shippingAddress?: string;
  ecommerceOrderId?: string;
}

// ==========================================
// NUEVAS INTERFACES PARA GESTIÓN DE NEGOCIO
// ==========================================

export interface Client {
  id: string;
  storeId: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  rfc?: string;
  activo: boolean;
}

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

// ==========================================
// MÓDULOS FINANCIEROS Y COMPRAS
// ==========================================

export interface Supplier {
  id: string;
  storeId: string;
  nombre: string;
  rfc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  diasCredito: number;
  limiteCredito: number;
  activo: boolean;
}

export interface PurchaseOrderItem {
  id?: string;
  purchaseOrderId?: string;
  inventoryItemId?: string;
  nombre: string;
  cantidad: number;
  cantidadRecibida?: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  storeId: string;
  supplierId: string;
  supplier?: Supplier; // Para includes
  fechaEmision: string;
  fechaEsperada?: string;
  estado: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  totalImpuestos: number;
  total: number;
  estadoPago: 'UNPAID' | 'PARTIAL' | 'PAID';
  items?: PurchaseOrderItem[];
}

export interface AccountReceivable {
  id: string;
  storeId: string;
  clientId: string;
  client?: Client;
  saleId: string;
  sale?: Sale;
  montoTotal: number;
  saldoPendiente: number;
  fechaVencimiento: string;
  estado: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface AccountPayable {
  id: string;
  storeId: string;
  supplierId?: string;
  supplier?: Supplier;
  referenciaId: string;
  tipoReferencia: 'PURCHASE' | 'EXPENSE' | 'OTHER';
  montoTotal: number;
  saldoPendiente: number;
  fechaVencimiento: string;
  estado: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface PaymentTransaction {
  id: string;
  storeId: string;
  cuentaId: string;
  tipoCuenta: 'RECEIVABLE' | 'PAYABLE';
  monto: number;
  metodoPago: 'CASH' | 'CARD' | 'TRANSFER';
  fecha: string;
  comprobante?: string;
  referencia?: string;
  registradoPor: string;
  shiftId?: number;
}
