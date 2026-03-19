import { create } from 'zustand';
import { Product, CartItemState, PosTotals } from '../domain/cart/types';

interface CartState {
  /** 
   * Diccionario O(1) de ítems en el carrito indexado por ID de producto.
   * Mejora masivamente el performance comparado con buscar en un array.
   */
  cart: Record<string, CartItemState>;
  
  /** Métodos Mutables */
  addProduct: (product: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeProduct: (productId: string) => void;
  clearCart: () => void;
  
  /** Métodos Derivados Estáticos (Sin re-renders a toda la vista) */
  getTotals: () => PosTotals;
}

/**
 * Cerebro Global del POS:
 * Este store de Zustand aísla el estado del carrito por completo del React Lifecycle.
 * Significa que "ProductGrid" puede llamar .getState().addProduct() SIN re-renderizarse,
 * y únicamente "CartPanel" se enterará de que el carrito cambió para re-dibujarse.
 */
export const useCartStore = create<CartState>((set, get) => ({
  cart: {},

  addProduct: (product: Product) => {
    set((state) => {
      const existing = state.cart[product.id];
      const nextCart = { ...state.cart };

      // Regla Fundamental: No pasar el stock límite
      if (existing) {
        if (existing.quantity >= product.stock) {
          // Toast / Alerta silenciada aquí, o manejada pre-llamada por el UI
          return state; 
        }

        const newQty = existing.quantity + 1;
        nextCart[product.id] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.sellingPrice,
        };
      } else {
        if (product.stock <= 0) return state;

        nextCart[product.id] = {
          productId: product.id,
          name: product.name,
          quantity: 1,
          sellingPrice: Number(product.salePrice),
          unitCost: Number(product.costPrice),
          image: product.image,
          subtotal: Number(product.salePrice),
        };
      }

      return { cart: nextCart };
    });
  },

  setQuantity: (productId: string, qty: number) => {
    set((state) => {
      const existing = state.cart[productId];
      if (!existing) return state;

      const nextCart = { ...state.cart };

      // Si baja a 0, se saca del dictionary
      if (qty <= 0) {
        delete nextCart[productId];
        return { cart: nextCart };
      }

      nextCart[productId] = {
        ...existing,
        quantity: qty,
        subtotal: qty * existing.sellingPrice,
      };

      return { cart: nextCart };
    });
  },

  removeProduct: (productId: string) => {
    set((state) => {
      const nextCart = { ...state.cart };
      delete nextCart[productId];
      return { cart: nextCart };
    });
  },

  clearCart: () => set({ cart: {} }),

  getTotals: () => {
    // Calculado al vuelo bajo demanda
    const { cart } = get();
    let subtotal = 0;

    for (const key in cart) {
      subtotal += cart[key].subtotal;
    }

    const tax = subtotal * 0.16; // 16% asumiendo IVA MX
    const total = subtotal; // Asumiendo total net con/sin iva según tu rule local

    return { subtotal, tax, total };
  },
}));
