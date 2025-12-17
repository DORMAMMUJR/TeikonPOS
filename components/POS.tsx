import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleDetail, Sale } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, ImageOff } from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSale, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleDetail[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0); // percent
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Search Logic
  const filteredProducts = products.filter(p => 
    p.isActive && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Sin stock disponible");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Prevent overselling
        return prev.map(item => item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.salePrice,
        unitCost: product.costPrice,
        discount: 0,
        subtotal: product.salePrice
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Check stock limit
        const product = products.find(p => p.id === productId);
        if (product && newQty > product.stock) return item;

        return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
      }
      return item;
    }));
  };

  // Totals Calculation
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const discountAmount = (subtotal * globalDiscount) / 100;
  const total = subtotal - discountAmount;

  // Change Calculation
  const receivedValue = parseFloat(amountReceived) || 0;
  const changeValue = receivedValue - total;
  const canFinalize = cart.length > 0 && receivedValue >= total;

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
    setAmountReceived('');
  };

  const handleFinalizeSale = () => {
    if (!canFinalize) return;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      sellerId: currentUserRole,
      subtotal,
      totalDiscount: discountAmount,
      taxTotal: 0, // Simplified for this demo
      total,
      status: 'ACTIVE',
      paymentMethod: 'CASH', 
      items: cart
    };

    processSale(newSale);
    
    // Reset Everything
    setCart([]);
    setGlobalDiscount(0);
    setSearchTerm('');
    setIsCheckoutOpen(false);
    
    // Optional: Visual confirmation could go here
    alert(`Venta exitosa. Cambio a entregar: $${changeValue.toFixed(2)}`);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-160px)] gap-4">
      {/* Product Selector (Left) */}
      <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white dark:placeholder-gray-400 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 content-start">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className={`group flex flex-col border-l-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden ${
                product.stock <= 0 
                ? 'border-gray-300 opacity-50 bg-gray-50 dark:bg-gray-700 dark:border-gray-600' 
                : 'bg-white dark:bg-gray-700 border-blue-500 border-t border-r border-b border-gray-100 dark:border-gray-600 dark:border-l-blue-500 hover:border-blue-600'
              }`}
            >
              {/* Product Image Area */}
              <div className="h-32 w-full bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                {product.image ? (
                   <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                   <div className="h-full w-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <ImageOff size={32} />
                   </div>
                )}
                <div className="absolute top-1 right-1">
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${product.stock > product.minStock ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                    Stock: {product.stock}
                   </span>
                </div>
              </div>
              
              <div className="p-3 flex flex-col flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">{product.sku}</span>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1 flex-1" title={product.name}>{product.name}</h4>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-auto">${product.salePrice}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart (Right) */}
      <div className="lg:w-1/3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard size={20} /> Ticket de Venta
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
              <p>Carrito vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.productName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">${item.unitPrice} x unit</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border dark:border-gray-600 rounded bg-white dark:bg-gray-700">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300"><Minus size={14}/></button>
                    <span className="px-2 text-sm font-medium dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-300"><Plus size={14}/></button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right dark:text-white">${item.subtotal}</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 space-y-2 rounded-b-xl">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Descuento Global (%):</span>
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={globalDiscount}
              onChange={(e) => setGlobalDiscount(Number(e.target.value))}
              className="w-16 p-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={currentUserRole !== 'admin' && globalDiscount > 10} 
            />
          </div>
          {globalDiscount > 0 && (
             <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Descuento Aplicado:</span>
                <span>-${discountAmount.toFixed(2)}</span>
             </div>
          )}
          
          <div className="flex justify-between text-2xl font-extrabold text-gray-900 dark:text-white pt-2 border-t dark:border-gray-700">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          <Button 
            fullWidth 
            variant="success" 
            className="mt-4 py-4 text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
          >
            Cobrar
          </Button>
        </div>
      </div>

      {/* Checkout / Payment Modal */}
      <Modal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        title="Confirmar Pago"
      >
        <div className="space-y-6">
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
             <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total a Pagar</p>
             <p className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">${total.toFixed(2)}</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Banknote size={18} /> Efectivo Recibido
             </label>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
                <input 
                    type="number"
                    autoFocus
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-3xl pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none text-right dark:bg-gray-700 dark:text-white transition-all"
                />
             </div>
          </div>

          <div className={`p-4 rounded-lg border text-center transition-colors ${
              changeValue >= 0 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
             <p className={`text-sm font-bold uppercase mb-1 ${changeValue >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {changeValue >= 0 ? "Cambio a Entregar" : "Falta Dinero"}
             </p>
             <p className={`text-3xl font-bold ${changeValue >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${Math.abs(changeValue).toFixed(2)}
             </p>
          </div>

          <div className="flex gap-3 mt-4 pt-2">
             <Button 
               variant="secondary" 
               fullWidth 
               onClick={() => setIsCheckoutOpen(false)}
             >
               Cancelar
             </Button>
             <Button 
               variant="success" 
               fullWidth 
               disabled={!canFinalize}
               onClick={handleFinalizeSale}
               className="shadow-md"
             >
               Finalizar Venta
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;