
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleDetail } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Search, Trash2, Plus, Minus, ImageOff, ShoppingCart, AlertTriangle, PackageSearch } from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSale, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleDetail[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // MODO SCANNER: Foco automático al inicio y después de cada acción
  useEffect(() => {
    const focusSearch = () => {
      if (!isCheckoutOpen) {
        searchInputRef.current?.focus();
      }
    };
    
    focusSearch();
    window.addEventListener('focus', focusSearch);
    return () => window.removeEventListener('focus', focusSearch);
  }, [isCheckoutOpen]);

  const filteredProducts = products.filter(p => 
    p.isActive && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toUpperCase().includes(searchTerm.toUpperCase())
    )
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
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
    // Reset para el siguiente escaneo
    setSearchTerm('');
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      // Detección de escaneo rápido por SKU exacto
      const product = products.find(p => 
        p.sku.toUpperCase() === searchTerm.toUpperCase().trim() && p.isActive
      );
      if (product) {
        addToCart(product);
        e.preventDefault();
      }
    }
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
    // El foco vuelve automáticamente por el useEffect
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-280px)]">
      {/* PANEL DE SELECCIÓN */}
      <div className="lg:w-2/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-sm">
        <div className="p-4 border-b border-brand-border bg-slate-50 dark:bg-emerald-950/20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-emerald h-5 w-5" />
            <input 
              ref={searchInputRef}
              className="w-full pl-12 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-800/40 rounded-2xl focus:border-brand-emerald outline-none transition-all text-base font-black text-slate-900 dark:text-white placeholder:text-brand-muted/40 uppercase tracking-widest"
              placeholder="ESCANEAR SKU O BUSCAR PRODUCTO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start no-scrollbar">
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)} 
              className="group p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] cursor-pointer hover:border-brand-emerald hover:bg-emerald-500/5 transition-all relative shadow-sm hover:shadow-emerald-500/10 active:scale-[0.98]"
            >
              {/* Imagen Prominente */}
              <div className="h-44 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                {p.image ? (
                  <img src={p.image} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                ) : (
                  <ImageOff className="text-brand-muted opacity-10" size={48} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-[9px] font-black text-brand-emerald uppercase truncate tracking-[0.2em] bg-emerald-500/10 px-2 py-0.5 rounded-md">{p.sku}</h4>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${p.stock <= 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-white/5 text-brand-muted'}`}>
                    STOCK: {p.stock}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2.5rem] uppercase tracking-tighter">{p.name}</p>
                <div className="flex justify-between items-baseline pt-1">
                   <p className="text-2xl font-black text-brand-emerald tracking-tighter">${p.salePrice.toLocaleString()}</p>
                </div>
              </div>
              
              {p.stock <= 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg uppercase shadow-lg flex items-center gap-1">
                   <AlertTriangle size={10} /> Stock en Cero
                </div>
              )}
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-20">
              <PackageSearch size={80} className="mb-4 text-brand-emerald" />
              <p className="text-sm font-black uppercase tracking-[0.4em]">Sin coincidencias</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE CARRITO */}
      <div className="lg:w-1/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-2xl bg-white dark:bg-slate-900">
        <div className="p-5 border-b border-brand-border flex justify-between items-center bg-slate-50 dark:bg-emerald-950/30">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-brand-emerald flex items-center gap-2">
            <ShoppingCart size={18} /> Carrito de Venta
          </h3>
          <span className="bg-brand-emerald text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-emerald-500/20">{cart.length} ÍTEMS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {cart.map(item => {
            const productRef = products.find(p => p.id === item.productId);
            // Venta Flexible: Permitir stock negativo pero alertar visualmente
            const isOverselling = productRef ? (productRef.stock - item.quantity < 0) : false;

            return (
              <div 
                key={item.productId} 
                className={`flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 ${
                  isOverselling 
                  ? 'border-red-500 bg-red-500/5 dark:bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-black/20'
                }`}
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{item.productName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold text-brand-muted">${item.unitPrice} unit.</span>
                      {isOverselling && (
                        <span className="text-[8px] font-black text-red-600 bg-red-600/10 px-2 py-1 rounded-md uppercase animate-pulse flex items-center gap-1 border border-red-500/20">
                          <AlertTriangle size={10} /> Descuadre de Stock
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} 
                    className="p-2 text-red-500/30 hover:text-red-500 transition-colors hover:bg-red-500/5 rounded-xl"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>

                <div className="flex justify-between items-center bg-white dark:bg-slate-950 rounded-[1.2rem] p-3 shadow-sm border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-muted hover:text-brand-emerald transition-colors"><Minus size={14}/></button>
                    <span className="text-base font-black w-8 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-muted hover:text-brand-emerald transition-colors"><Plus size={14}/></button>
                  </div>
                  <p className="text-xl font-black text-brand-emerald tracking-tighter">${item.subtotal.toFixed(0)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-brand-border bg-slate-50 dark:bg-slate-950/80 backdrop-blur-xl">
          <div className="flex justify-between items-end mb-6">
            <span className="text-xs font-black text-brand-muted uppercase tracking-[0.2em]">Total</span>
            <div className="text-right">
              <p className="text-5xl font-black text-brand-emerald tracking-tighter">${total.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-brand-muted uppercase mt-1 tracking-widest">IVA Incluido</p>
            </div>
          </div>
          <Button 
            fullWidth 
            variant="sales"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="py-5 text-xs tracking-[0.3em] shadow-xl shadow-emerald-500/20"
          >
            CONFIRMAR VENTA
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="PAGO Y LIQUIDACIÓN">
        <div className="space-y-6">
          <div className="text-center p-10 bg-emerald-50 dark:bg-slate-950 rounded-[2.5rem] border-2 border-emerald-500/10 dark:border-emerald-500/5 shadow-inner">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em] mb-3">Total a Pagar</p>
            <p className="text-7xl font-black text-brand-emerald tracking-tighter">${total.toLocaleString()}</p>
          </div>
          
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] ml-1">Efectivo Recibido</label>
            <div className="relative">
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-black text-brand-muted/20">$</span>
              <input 
                type="number" 
                autoFocus 
                className="w-full pl-16 pr-8 py-8 text-6xl font-black bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] outline-none focus:border-brand-emerald text-slate-900 dark:text-white transition-all shadow-xl text-center"
                value={amountReceived} 
                onChange={e => setAmountReceived(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className={`p-8 rounded-[2rem] border-2 flex justify-between items-center transition-all duration-500 ${change >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
            <span className="text-xs font-black uppercase tracking-[0.2em]">{change >= 0 ? 'Cambio' : 'Pendiente'}</span>
            <span className="text-4xl font-black tracking-tighter">${Math.abs(change).toLocaleString()}</span>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="secondary" className="flex-1 py-5 rounded-2xl" onClick={() => setIsCheckoutOpen(false)}>REVISAR</Button>
            <Button variant="sales" className="flex-1 py-5 rounded-2xl" disabled={change < 0} onClick={finalize}>FINALIZAR</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
