import React, { useState, useCallback } from 'react';
import { Product } from '@/Product';
import { useStore } from '../context/StoreContext';
import BarcodeScanner from './BarcodeScanner';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';

interface CartItem {
    productId: string;
    name: string;
    sellingPrice: number;
    unitCost: number;
    quantity: number;
    flashAnimation?: boolean;
}

/**
 * QuickSale Component - Example Integration
 * 
 * Demonstrates how to integrate BarcodeScanner with cart management
 * Includes:
 * - handleAddItem logic (add or increment)
 * - Flash animation for newly added items
 * - Stock validation
 * - Cart display with quantity controls
 */
const QuickSale: React.FC = () => {
    const { products, processSaleAndContributeToGoal } = useStore();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [flashItemId, setFlashItemId] = useState<string | null>(null);

    /**
     * Handle adding product from barcode scanner
     * Logic: If product exists in cart, increment quantity. Otherwise, add new item.
     */
    const handleAddItem = useCallback((product: Product) => {
        // Validate stock availability
        const currentCartItem = cart.find(item => item.productId === product.id);
        const currentQuantityInCart = currentCartItem?.quantity || 0;
        const availableStock = product.stock - currentQuantityInCart;

        if (availableStock <= 0) {
            alert(`⚠️ Stock insuficiente para ${product.name}. Stock disponible: ${product.stock}`);
            return;
        }

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.productId === product.id);

            if (existingIndex >= 0) {
                // Product exists: increment quantity
                const updated = [...prevCart];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1,
                    flashAnimation: true
                };
                return updated;
            } else {
                // Product new: add with quantity 1
                return [...prevCart, {
                    productId: product.id,
                    name: product.name,
                    sellingPrice: product.salePrice,
                    unitCost: product.costPrice,
                    quantity: 1,
                    flashAnimation: true
                }];
            }
        });

        // Trigger flash animation
        setFlashItemId(product.id);
        setTimeout(() => {
            setFlashItemId(null);
            // Remove flash animation flag
            setCart(prev => prev.map(item => ({ ...item, flashAnimation: false })));
        }, 500);
    }, [cart]);

    /**
     * Handle product not found with granular error feedback
     */
    const handleProductNotFound = useCallback((sku: string, errorType?: 'NOT_FOUND' | 'OUT_OF_STOCK') => {
        console.log(`Product error: ${errorType} for SKU ${sku}`);

        // Optional: Show toast notification or alert based on error type
        if (errorType === 'OUT_OF_STOCK') {
            console.warn(`⚠️ Product ${sku} found but has no stock available`);
            // You can show a toast notification here
        } else {
            console.warn(`❌ Product ${sku} not found in database`);
            // You can show a different toast notification here
        }
    }, []);

    /**
     * Update item quantity
     */
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prevCart => {
            const updated = prevCart.map(item => {
                if (item.productId === productId) {
                    const newQuantity = Math.max(1, item.quantity + delta);

                    // Check stock availability
                    const product = products.find(p => p.id === productId);
                    if (product && newQuantity > product.stock) {
                        alert(`⚠️ Stock máximo disponible: ${product.stock}`);
                        return item;
                    }

                    return { ...item, quantity: newQuantity };
                }
                return item;
            });
            return updated;
        });
    };

    /**
     * Remove item from cart
     */
    const removeItem = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    };

    /**
     * Calculate totals
     */
    const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    /**
     * Process sale
     */
    const handleCheckout = async (paymentMethod: 'CASH' | 'CARD' | 'TRANSFER') => {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        try {
            const result = await processSaleAndContributeToGoal(cart, paymentMethod);

            if (result.success) {
                alert(`✅ Venta procesada exitosamente!\nTotal: $${subtotal.toFixed(2)}`);
                setCart([]); // Clear cart
            } else {
                alert('❌ Error al procesar la venta');
            }
        } catch (error) {
            console.error('Error processing sale:', error);
            alert('❌ Error al procesar la venta');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                    Venta Rápida
                </h1>
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-950/20 rounded-xl">
                    <ShoppingCart className="text-orange-500" size={20} />
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                        {totalItems} items
                    </span>
                </div>
            </div>

            {/* Barcode Scanner */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                    Escáner de Códigos de Barras
                </h2>
                <BarcodeScanner
                    onProductFound={handleAddItem}
                    onProductNotFound={handleProductNotFound}
                />
            </div>

            {/* Cart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                    Carrito de Compras
                </h2>

                {cart.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-sm font-bold">El carrito está vacío</p>
                        <p className="text-xs mt-2">Escanea un producto para comenzar</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cart.map((item) => (
                            <div
                                key={item.productId}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${flashItemId === item.productId
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20 animate-pulse'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                                    }`}
                            >
                                {/* Product Info */}
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        ${item.sellingPrice.toFixed(2)} × {item.quantity}
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateQuantity(item.productId, -1)}
                                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                        aria-label="Disminuir cantidad"
                                    >
                                        <Minus size={16} />
                                    </button>

                                    <span className="font-black text-lg w-8 text-center">
                                        {item.quantity}
                                    </span>

                                    <button
                                        onClick={() => updateQuantity(item.productId, 1)}
                                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                        aria-label="Aumentar cantidad"
                                    >
                                        <Plus size={16} />
                                    </button>

                                    {/* Subtotal */}
                                    <div className="w-24 text-right">
                                        <p className="font-black text-lg text-orange-500">
                                            ${(item.sellingPrice * item.quantity).toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeItem(item.productId)}
                                        className="p-2 bg-red-100 dark:bg-red-950/20 hover:bg-red-200 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                        aria-label="Eliminar del carrito"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Total */}
                {cart.length > 0 && (
                    <div className="mt-6 pt-6 border-t-2 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                TOTAL
                            </span>
                            <span className="text-3xl font-black text-orange-500">
                                ${subtotal.toFixed(2)}
                            </span>
                        </div>

                        {/* Payment Buttons */}
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => handleCheckout('CASH')}
                                className="py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg"
                            >
                                💵 EFECTIVO
                            </button>
                            <button
                                onClick={() => handleCheckout('CARD')}
                                className="py-4 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg"
                            >
                                💳 TARJETA
                            </button>
                            <button
                                onClick={() => handleCheckout('TRANSFER')}
                                className="py-4 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg"
                            >
                                🏦 TRANSFERENCIA
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickSale;
