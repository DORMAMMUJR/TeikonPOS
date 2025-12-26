
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, SaleDetail } from '../types';
import Button from './Button';
import Modal from './Modal';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  ImageOff, 
  ShoppingCart, 
  AlertTriangle, 
  PackageSearch,
  Scan,
  CheckCircle2
} from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSale, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleDetail[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // MODO SCANNER: Mantiene el foco en el input siempre que sea posible
  useEffect(() => {
    const focusSearch = () => {
      if (!isCheckoutOpen) {
        searchInputRef.current?.focus();
      }
    };
    
    // Foco inicial y al re-enfocar la ventana
    focusSearch();
    window.addEventListener('focus', focusSearch);
    return () => window.removeEventListener('focus', focusSearch);
  }, [isCheckoutOpen]);

  const filteredProducts = products.filter(p => 
    p.isActive && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toUpperCase().includes(searchTerm.toUpperCase().trim())
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
    
    // Feedback visual y reset para el siguiente escaneo
    setLastAddedId(product.id);
    setTimeout(() => setLastAddedId(null), 1000);
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
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-280px)]">
      {/* PANEL DE SELECCIÓN DE PRODUCTOS */}
      <div className="lg:w-2/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-xl min-h-[500px]">
        <div className="p-5 border-b border-brand-border bg-slate-50 dark:bg-emerald-950/20">
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              <Scan className="text-brand-emerald h-5 w-5 animate-pulse" />
              <div className="h-4 w-[1px] bg-brand-emerald/30 hidden md:block"></div>
            </div>
            <input 
              ref={searchInputRef}
              className="w-full pl-14 md:pl-20 pr-6 py-5 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[1.5rem] focus:border-brand-emerald outline-none transition-all text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 uppercase tracking-widest"
              placeholder="SCANNER LISTO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 content-start no-scrollbar bg-white dark:bg-slate-900">
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)} 
              className={`group relative p-4 bg-slate-50 dark:bg-slate-950/50 border-2 rounded-[2rem] cursor-pointer transition-all duration-300 active:scale-95 shadow-sm hover:shadow-emerald-500/10 ${
                lastAddedId === p.id 
                ? 'border-brand-emerald bg-emerald-500/5' 
                : 'border-transparent hover:border-brand-emerald/40'
              }`}
            >
              <div className="aspect-square bg-white dark:bg-slate-900 rounded-[1.5rem] mb-4 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 relative group-hover:shadow-md transition-all">
                {p.image ? (
                  <img src={p.image} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                ) : (
                  <ImageOff className="text-slate-200 dark:text-slate-800" size={40} />
                )}
                
                <div className="absolute inset-0 bg-brand-emerald/0 group-hover:bg-brand-emerald/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <Plus className="text-brand-emerald bg-white rounded-full p-2 shadow-xl" size={40} />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9px] font-black text-brand-emerald uppercase tracking-[0.2em] bg-brand-emerald/10 px-2 py-1 rounded-lg">
                    {p.sku}
                  </span>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                    p.stock <= 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {p.stock} DISP.
                  </span>
                </div>
                
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2.5rem] uppercase tracking-tighter">
                  {p.name}
                </h4>
                
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/50">
                   <p className="text-2xl font-black text-brand-emerald tracking-tighter">
                     ${p.salePrice.toLocaleString()}
                   </p>
                </div>
              </div>

              {p.stock <= 0 && (
                <div className="absolute top-6 left-6 px-3 py-1 bg-red-600 text-white text-[8px] font-black rounded-full uppercase shadow-lg flex items-center gap-1 z-10 border border-white/20">
                   <AlertTriangle size={10} /> Stock en Cero
                </div>
              )}
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-30">
              <PackageSearch size={80} className="mb-6 text-brand-emerald" />
              <p className="text-base font-black uppercase tracking-[0.5em]">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DEL CARRITO DE COMPRAS */}
      <div className="lg:w-1/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[400px]">
        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-emerald text-white rounded-xl shadow-lg shadow-emerald-500/20">
              <ShoppingCart size={20} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">Detalle de Venta</h3>
          </div>
          <span className="bg-brand-emerald/10 text-brand-emerald px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border border-brand-emerald/20">
            {cart.length} LÍNEAS
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {cart.map(item => {
            const productRef = products.find(p => p.id === item.productId);
            const isOverselling = productRef ? (productRef.stock - item.quantity < 0) : false;

            return (
              <div 
                key={item.productId} 
                className={`flex flex-col p-5 rounded-[1.8rem] border-2 transition-all duration-300 shadow-sm ${
                  isOverselling 
                  ? 'border-red-500 bg-red-500/5 dark:bg-red-500/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-black/20'
                }`}
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {item.productName}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-brand-muted opacity-60">P.U: ${item.unitPrice.toLocaleString()}</span>
                      {isOverselling && (
                        <span className="text-[8px] font-black text-red-600 bg-red-600/10 px-3 py-1 rounded-full uppercase animate-pulse flex items-center gap-1 border border-red-500/20">
                          <AlertTriangle size={12} /> Descuadre
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} 
                    className="p-3 text-slate-300 hover:text-red-500 transition-all hover:bg-red-500/5 rounded-2xl min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 size={20}/>
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 rounded-[1.2rem] p-3 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)} 
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-muted hover:text-brand-emerald transition-all shadow-sm active:scale-90 min-h-[44px] min-w-[44px]"
                    >
                      <Minus size={16}/>
                    </button>
                    <span className="text-lg font-black w-8 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)} 
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-muted hover:text-brand-emerald transition-all shadow-sm active:scale-90 min-h-[44px] min-w-[44px]"
                    >
                      <Plus size={16}/>
                    </button>
                  </div>
                  <p className="text-2xl font-black text-brand-emerald tracking-tighter">
                    ${item.subtotal.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER DEL CARRITO: TOTALIZADOR */}
        <div className="p-8 border-t border-brand-border bg-slate-50 dark:bg-slate-950/80 backdrop-blur-2xl mt-auto">
          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-8 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.3em]">Total Neto</span>
              <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest opacity-40">Impuestos Incluidos</p>
            </div>
            <div className="text-right">
              <p className="text-4xl sm:text-6xl font-black text-brand-emerald tracking-tighter transition-all">
                ${total.toLocaleString()}
              </p>
            </div>
          </div>
          <Button 
            fullWidth 
            variant="sales"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="py-6 text-sm tracking-[0.2em] shadow-2xl shadow-emerald-500/30 rounded-3xl"
          >
            CONFIRMAR VENTA
          </Button>
        </div>
      </div>

      {/* MODAL DE LIQUIDACIÓN / PAGO */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="FINALIZAR OPERACIÓN">
        <div className="space-y-8 p-2">
          <div className="text-center p-8 sm:p-12 bg-emerald-500/5 dark:bg-slate-950 rounded-[3rem] border-2 border-brand-emerald/10 shadow-inner relative overflow-hidden">
            <p className="text-[11px] font-black text-brand-muted uppercase tracking-[0.5em] mb-4">Monto a Liquidar</p>
            <p className="text-5xl sm:text-8xl font-black text-brand-emerald tracking-tighter animate-in zoom-in duration-500">
              ${total.toLocaleString()}
            </p>
          </div>
          
          <div className="space-y-3 px-4">
            <label className="block text-[11px] font-black text-brand-muted uppercase tracking-[0.3em] ml-1">Efectivo Recibido</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl sm:text-5xl font-black text-slate-200 dark:text-slate-800 transition-colors group-focus-within:text-brand-emerald">$</span>
              <input 
                type="number" 
                autoFocus 
                className="w-full pl-16 sm:pl-24 pr-10 py-6 sm:py-10 text-4xl sm:text-7xl font-black bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-[3rem] outline-none focus:border-brand-emerald text-slate-900 dark:text-white transition-all shadow-xl text-center"
                value={amountReceived} 
                onChange={e => setAmountReceived(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className={`mx-4 p-6 sm:p-8 rounded-[2.5rem] border-2 flex justify-between items-center transition-all duration-500 ${change >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-brand-emerald' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
            <div className="flex items-center gap-3">
               <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em]">{change >= 0 ? 'Cambio' : 'Faltante'}</span>
            </div>
            <span className="text-3xl sm:text-5xl font-black tracking-tighter">${Math.abs(change).toLocaleString()}</span>
          </div>

          {/* Botones Refactorizados para Móvil */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 px-4 pb-4">
            <Button 
              variant="secondary" 
              className="flex-1 py-6 rounded-3xl text-xs order-2 sm:order-1" 
              onClick={() => setIsCheckoutOpen(false)}
            >
              MODIFICAR
            </Button>
            <Button 
              variant="sales" 
              className="flex-1 py-6 rounded-3xl text-xs order-1 sm:order-2" 
              disabled={change < 0} 
              onClick={finalize}
            >
              FINALIZAR VENTA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
