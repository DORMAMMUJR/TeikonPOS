
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleDetail, Sale } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, ImageOff, ShoppingCart } from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSale, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleDetail[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');

  const filteredProducts = products.filter(p => 
    p.isActive && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("Sin stock");
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice } : item);
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

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const p = products.find(prod => prod.id === id);
        const newQty = Math.max(1, item.quantity + delta);
        if (p && newQty > p.stock) return item;
        return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const change = (parseFloat(amountReceived) || 0) - total;

  const finalize = () => {
    if (change < 0) return;
    processSale({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      sellerId: currentUser?.username || 'user',
      subtotal: total,
      totalDiscount: 0,
      taxTotal: 0,
      total,
      status: 'ACTIVE',
      paymentMethod: 'CASH',
      items: cart
    });
    setCart([]);
    setIsCheckoutOpen(false);
    setAmountReceived('');
    alert("Venta completada");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      <div className="lg:w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Buscar producto o SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-blue-500 group">
              <div className="h-24 bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {p.image ? <img src={p.image} className="h-full w-full object-cover" /> : <ImageOff className="text-gray-400" />}
              </div>
              <h4 className="text-xs font-bold text-gray-500 uppercase truncate">{p.sku}</h4>
              <p className="text-sm font-medium dark:text-gray-200 line-clamp-1">{p.name}</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">${p.salePrice}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
          <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> Carrito</h3>
          <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-600 rounded-full">{cart.length} items</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center gap-2">
              <div className="flex-1">
                <p className="text-sm font-bold truncate">{item.productName}</p>
                <p className="text-xs text-gray-400">${item.unitPrice}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={14}/></button>
                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={14}/></button>
              </div>
              <p className="text-sm font-bold w-16 text-right">${item.subtotal.toFixed(2)}</p>
              <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-red-400"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex justify-between text-2xl font-black mb-4">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <Button fullWidth variant="success" className="py-4 text-lg" disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)}>
            Cobrar ahora
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Finalizar Venta">
        <div className="space-y-6">
          <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <p className="text-sm font-bold text-blue-600 uppercase">Total a pagar</p>
            <p className="text-5xl font-black text-blue-700 dark:text-blue-400">${total.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Efectivo Recibido</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-300 font-bold">$</span>
              <input 
                type="number" autoFocus className="w-full pl-10 pr-4 py-4 text-3xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl outline-none"
                value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
              />
            </div>
          </div>
          <div className={`p-4 rounded-xl border text-center ${change >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <p className="text-xs font-bold uppercase">{change >= 0 ? 'Cambio' : 'Faltante'}</p>
            <p className="text-3xl font-black">${Math.abs(change).toFixed(2)}</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" fullWidth onClick={() => setIsCheckoutOpen(false)}>Cancelar</Button>
            <Button variant="success" fullWidth disabled={change < 0} onClick={finalize}>Completar Venta</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
