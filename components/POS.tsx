
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleDetail } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Search, Trash2, Plus, Minus, ImageOff, ShoppingCart, AlertTriangle, Zap } from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSale, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleDetail[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCheckoutOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isCheckoutOpen]);

  const filteredProducts = products.filter(p => 
    p.isActive && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
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
        const newQty = Math.max(1, item.quantity + delta);
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
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)]">
      {/* PANEL DE SELECCIÓN (THEMED EMERALD) */}
      <div className="lg:w-2/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald">
        <div className="p-4 border-b border-brand-border bg-emerald-50 dark:bg-emerald-950/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-emerald h-4 w-4" />
            <input 
              ref={searchInputRef}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 rounded-xl focus:border-brand-emerald outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder:text-brand-muted/40 uppercase tracking-widest shadow-sm"
              placeholder="ESCANEAR SKU O BUSCAR PRODUCTO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim() !== '') {
                  const product = products.find(p => p.sku.toUpperCase() === searchTerm.toUpperCase().trim() && p.isActive);
                  if (product) {
                    addToCart(product);
                    setSearchTerm('');
                    e.preventDefault();
                  }
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start no-scrollbar">
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)} 
              className="p-3 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-brand-emerald hover:bg-emerald-500/5 transition-all group relative shadow-sm"
            >
              <div className="h-28 bg-white dark:bg-slate-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                {p.image ? (
                  <img src={p.image} className="h-full w-full object-cover group-hover:scale-105 transition-transform" alt={p.name} />
                ) : (
                  <ImageOff className="text-brand-muted opacity-10" size={32} />
                )}
              </div>
              <h4 className="text-[9px] font-black text-brand-muted uppercase truncate mb-1">{p.sku}</h4>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mb-2">{p.name}</p>
              <p className="text-lg font-black text-brand-emerald">${p.salePrice.toLocaleString()}</p>
              
              {p.stock <= 0 && (
                <span className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-[8px] font-black rounded uppercase">Sin Stock</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* PANEL DE CARRITO (THEMED EMERALD) */}
      <div className="lg:w-1/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-lg">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-emerald flex items-center gap-2">
            <ShoppingCart size={16} /> Carrito de Venta
          </h3>
          <span className="bg-brand-emerald text-white px-3 py-1 rounded-full text-[10px] font-black">{cart.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate uppercase">{item.productName}</p>
                <p className="text-[10px] font-medium text-brand-muted">${item.unitPrice} unit.</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-brand-muted hover:text-brand-emerald"><Minus size={14}/></button>
                <span className="text-xs font-black w-6 text-center text-slate-800 dark:text-white">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-brand-muted hover:text-brand-emerald"><Plus size={14}/></button>
              </div>
              <div className="w-20 text-right ml-4">
                <p className="text-sm font-black text-brand-emerald">${item.subtotal.toFixed(0)}</p>
                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-red-500/50 hover:text-red-500 text-[9px] font-bold uppercase tracking-widest">Quitar</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-10 space-y-4 py-20">
              <ShoppingCart size={64} className="text-slate-400 dark:text-white" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white">CARRITO VACÍO</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-brand-border bg-emerald-50/50 dark:bg-slate-900/60">
          <div className="flex justify-between items-end mb-6">
            <span className="text-xs font-black text-brand-muted uppercase tracking-widest">Importe Total</span>
            <span className="text-4xl font-black text-brand-emerald">${total.toFixed(2)}</span>
          </div>
          <Button 
            fullWidth 
            variant="sales"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            CONFIRMAR PAGO
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="FINALIZAR OPERACIÓN">
        <div className="space-y-6">
          <div className="text-center p-6 bg-emerald-50 dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">Total a Cobrar</p>
            <p className="text-5xl font-black text-brand-emerald">${total.toFixed(2)}</p>
          </div>
          
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-brand-muted uppercase tracking-widest">Efectivo Recibido</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-brand-muted">$</span>
              <input 
                type="number" 
                autoFocus 
                className="w-full pl-14 pr-6 py-6 text-4xl font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-brand-emerald text-slate-900 dark:text-white transition-all"
                value={amountReceived} 
                onChange={e => setAmountReceived(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className={`p-6 rounded-2xl border-2 flex justify-between items-center ${change >= 0 ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{change >= 0 ? 'Vuelto al Cliente' : 'Importe Faltante'}</span>
            <span className="text-3xl font-black">${Math.abs(change).toFixed(2)}</span>
          </div>

          <div className="flex gap-4">
            <Button variant="secondary" fullWidth onClick={() => setIsCheckoutOpen(false)}>REVISAR</Button>
            <Button variant="sales" fullWidth disabled={change < 0} onClick={finalize}>CERRAR VENTA</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
