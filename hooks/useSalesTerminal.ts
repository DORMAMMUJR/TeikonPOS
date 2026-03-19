import { useState, useMemo, useCallback } from 'react';
import { Product } from '../Product';
import { CartItem, CartItemState } from '../types';

export interface UseSalesTerminalReturn {
  /**
   * Current items in the POS cart
   */
  cart: CartItemState[];
  /**
   * Adds an item to the cart or increments its quantity if it already exists.
   * Validates against available stock before adding.
   * @param product The product object from the catalog to add
   * @returns boolean true if added successfully, false if stock limit reached
   */
  addItem: (product: Product) => boolean;
  /**
   * Updates the quantity of a specific item in the cart.
   * Validates against available stock before increasing.
   * Removes the item if quantity reaches 0.
   * @param productId ID of the product to update
   * @param delta Amount to change (+1 or -1 typically)
   * @param catalog Array of products to check stock against
   */
  updateItemQuantity: (productId: string, delta: number, catalog: Product[]) => boolean;
  /**
   * Removes an item entirely from the cart
   */
  removeItem: (productId: string) => void;
  /**
   * Empties the entire cart
   */
  clearCart: () => void;
  /**
   * Derived calculations
   */
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
}

/**
 * Custom hook to manage the state and business logic of a POS shopping cart.
 * Provides safe, pure methods to manipulate the cart and automatically calculates totals.
 */
export function useSalesTerminal(): UseSalesTerminalReturn {
  const [cart, setCart] = useState<CartItemState[]>([]);

  const addItem = useCallback((product: Product): boolean => {
    let success = false;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.productId === product.id);

      // Check stock limit
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          success = false;
          return prevCart; // Unchanged
        }

        success = true;
        return prevCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.sellingPrice,
              }
            : item
        );
      }

      // New item
      if (product.stock <= 0) {
        success = false;
        return prevCart;
      }

      success = true;
      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          sellingPrice: Number(product.salePrice),
          unitCost: Number(product.costPrice),
          image: product.image,
          subtotal: Number(product.salePrice),
        },
      ];
    });

    return success;
  }, []);

  const updateItemQuantity = useCallback((
    productId: string,
    delta: number,
    catalog: Product[]
  ): boolean => {
    let success = false;

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.productId === productId);
      if (!existingItem) return prevCart;

      const productInCatalog = catalog.find((p) => p.id === productId);
      const availableStock = productInCatalog ? productInCatalog.stock : 0;

      const newQuantity = existingItem.quantity + delta;

      // Cannot decrease below 0
      if (newQuantity <= 0) {
        success = true;
        return prevCart.filter((item) => item.productId !== productId);
      }

      // Cannot exceed available stock
      if (newQuantity > availableStock) {
        success = false;
        return prevCart;
      }

      success = true;
      return prevCart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.sellingPrice,
            }
          : item
      );
    });

    return success;
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Derived properties using useMemo to avoid unnecessary recalculations
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
    const tax = subtotal * 0.16; // 16% IVA
    
    // As in the previous code, total = subtotal (assuming prices include tax or tax is informational)
    // If you need tax explicitly added to total: const total = subtotal + tax;
    const total = subtotal; 

    return {
      subtotal,
      tax,
      total,
    };
  }, [cart]);

  return {
    cart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    totals,
  };
}
