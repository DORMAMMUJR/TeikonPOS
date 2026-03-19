import { CartItemState } from '../types';
import { Product } from '../Product';

// Tipos requeridos
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface TransactionSuccess {
  success: true;
  saleTicket: {
    folio: string;
    date: string;
    items: CartItemState[];
    paymentMethod: PaymentMethod;
    revenue: number; // Ingreso bruto (Revenue)
  };
}

/**
 * Custom Error de Negocio para operaciones de venta abortadas
 */
export class OutOfStockError extends Error {
  public failedSkus: string[];

  constructor(message: string, failedSkus: string[]) {
    super(message);
    this.name = 'OutOfStockError';
    this.failedSkus = failedSkus;
    
    // Mantiene correctamente la pila de llamadas en V8 (Chrome/Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OutOfStockError);
    }
  }
}

/**
 * Simula una consulta a base de datos de los productos especificados
 * para traer su Estado Real de Stock actual.
 */
async function fetchCurrentStockFromDatabase(skus: string[]): Promise<Map<string, number>> {
  // Simulamos un retraso de red (latency)
  await new Promise(resolve => setTimeout(resolve, 300));

  // En un entorno real harías: 
  // const dbProducts = await db.query('SELECT sku, stock FROM products WHERE sku IN (?)', [skus]);
  
  // Aquí devolvemos un Map mock. Asumiremos mágicamente que hay 50 de stock en DB
  // para propósitos de la simulación, aunque si el carrito pide más de 50 fallará.
  const stockDb = new Map<string, number>();
  skus.forEach(sku => stockDb.set(sku, 50)); 

  return stockDb;
}

/**
 * Servicio fundamental de Transacción del POS.
 * Asegura que ningún proceso de checkout termine exitosamente si la
 * cantidad total requerida supera el nivel de inventario persistido.
 * 
 * @param cart Arreglo de ítems preparados desde el hook useSalesTerminal
 * @param paymentMethod Método seleccionado por el cajero
 * @returns Objeto de éxito con ticket generado
 * @throws {OutOfStockError} Si al menos un SKU rebasa el stock disponible
 */
export async function processTransaction(
  cart: CartItemState[],
  paymentMethod: PaymentMethod
): Promise<TransactionSuccess> {
  
  if (!cart || cart.length === 0) {
    throw new Error('No se puede procesar una transacción con el carrito vacío.');
  }

  // 1. Recolección de claves para consulta en bloque (Performance)
  // Como cart no tiene la prop sku directamente garantizada, usamos productId
  // o iteramos por ID en este caso simulando que buscamos por ID o SKU.
  const productIds = cart.map(item => item.productId);

  // 2. Consulta de la verdad absoluta (Base de datos remota)
  const currentDbStock = await fetchCurrentStockFromDatabase(productIds);

  // 3. Verificación Atómica
  const failedItems: string[] = [];

  for (const requestedItem of cart) {
    // Si la DB no contesta con el ID/SKU, asumimos stock 0 (o error de integridad)
    const realStock = currentDbStock.get(requestedItem.productId) ?? 0;

    if (requestedItem.quantity > realStock) {
      failedItems.push(requestedItem.name || requestedItem.productId);
    }
  }

  // 4. Abortar transacción dura
  if (failedItems.length > 0) {
    throw new OutOfStockError(
      'Inventario insuficiente. La transacción fue abortada para prevenir ventas en negativo.',
      failedItems
    );
  }

  // 5. Commit de la Transacción (Consumo del inventario simulado aquí)
  // ...await db.executeTransaction()...

  // 6. Generación del Recibo
  const totalRevenue = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  
  return {
    success: true,
    saleTicket: {
      folio: crypto.randomUUID().split('-')[0].toUpperCase(),
      date: new Date().toISOString(),
      items: cart,
      paymentMethod,
      revenue: totalRevenue,
    }
  };
}
