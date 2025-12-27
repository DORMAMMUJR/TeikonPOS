
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem } from '../types';
import Button from './Button';
import Modal from './Modal';
import SaleTicket from './SaleTicket';
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
  CheckCircle2,
  TrendingUp,
  Check
} from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSaleAndContributeToGoal, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]); 
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [saleSummary, setSaleSummary] = useState<{revenue: number, profit: number, items: any[], folio: string} | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = () => { if (!isCheckoutOpen && !showTicket && !showSuccessModal) searchInputRef.current?.focus(); };
    focusSearch();
    window.addEventListener('focus', focusSearch);
    return () => window.removeEventListener('focus', focusSearch);
  }, [isCheckoutOpen, showTicket, showSuccessModal]);

  useEffect(() => {
    if (cart.length > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  const filteredProducts = products.filter(p => 
    p.isActive && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toUpperCase().includes(searchTerm.toUpperCase().trim()))
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.sellingPrice } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        sellingPrice: product.salePrice,
        unitCost: product.costPrice,
        subtotal: product.salePrice
      }];
    });
    setLastAddedId(product.id);
    setTimeout(() => setLastAddedId(null), 1000);
    setSearchTerm('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.sellingPrice };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const change = (parseFloat(amountReceived) || 0) - total;

  const finalize = async () => {
    if (change < 0) return;
    
    const itemsToProcess: CartItem[] = cart.map(i => ({
      productId: i.productId,
      name: i.name,
      sellingPrice: i.sellingPrice,
      unitCost: i.unitCost,
      quantity: i.quantity
    }));

    const cartSnapshot = [...cart];
    const result = await processSaleAndContributeToGoal(itemsToProcess, 'CASH');
    
    if (result.success) {
      const folioId = crypto.randomUUID().slice(0, 8);
      setSaleSummary({ 
        revenue: result.totalRevenueAdded, 
        profit: result.totalProfitAdded,
        items: cartSnapshot,
        folio: folioId
      });
      setCart([]);
      setIsCheckoutOpen(false);
      setAmountReceived('');
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setShowTicket(true);
      }, 1500);
      
      setTimeout(() => setSaleSummary(null), 10000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-280px)]">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-brand-emerald/10 rounded-full flex items-center justify-center text-brand-emerald mb-6 animate-bounce">
                <Check size={48} strokeWidth={4} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-emerald">Venta Exitosa</h3>
           </div>
        </div>
      )}

      <div className="lg:w-2/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-xl min-h-[400px] lg:min-h-[500px]">
        <div className="p-4 border-b border-brand-border bg-slate-50 dark:bg-emerald-950/20">
          <div className="relative group">
            <Scan className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-emerald h-5 w-5 animate-pulse" />
            <input 
              ref={searchInputRef}
              className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[1.2rem] focus:border-brand-emerald outline-none transition-all text-base font-black text-slate-900 dark:text-white placeholder:text-slate-300 uppercase tracking-widest"
              placeholder="SCANNER LISTO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 no-scrollbar">
          {filteredProducts.map((p, idx) => (
            <div 
              key={p.id} 
              onClick={() => addToCart(p)} 
              style={{ animationDelay: `${idx * 40}ms` }}
              className={`group relative p-2.5 bg-white dark:bg-slate-800 border-2 rounded-2xl cursor-pointer transition-all duration-150 ease-in-out active:scale-95 hover:shadow-lg animate-fade-in-up ${
                lastAddedId === p.id 
                  ? 'border-brand-emerald ring-4 ring-brand-emerald/10' 
                  : 'border-slate-100 dark:border-slate-700 hover:border-brand-emerald/40'
              }`}
            >
              <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                {p.image ? (
                  <img src={p.image} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                ) : (
                  <ImageOff className="text-slate-200 dark:text-slate-700" size={32} />
                )}
                
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
                  p.stock <= p.minStock 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-black/40 dark:bg-white/10 text-white backdrop-blur-sm'
                }`}>
                  {p.stock} DISP.
                </div>
              </div>

              <div className="px-1 space-y-1">
                <h4 className="text-[11px] font-black text-slate-900 dark:text-white line-clamp-2 min-h-[2.2rem] leading-tight uppercase tracking-tight">
                  {p.name}
                </h4>
                <div className="flex justify-between items-center pt-1">
                  <p className="text-lg font-black text-brand-emerald tracking-tighter">
                    ${(p.salePrice || 0).toLocaleString()}
                  </p>
                  <div className="p-1.5 bg-brand-emerald/10 text-brand-emerald rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-1/3 flex flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-2xl bg-white dark:bg-slate-900 min-h-[300px]">
        <div className="px-4 py-3 border-b border-brand-border flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div className={`flex items-center gap-2 transition-transform duration-300 ${animateCart ? 'scale-125 text-brand-emerald' : 'scale-100'}`}>
            <ShoppingCart size={16} className={animateCart ? 'animate-bounce' : 'text-brand-emerald'} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Detalle</h3>
          </div>
          <span className={`bg-brand-emerald/10 text-brand-emerald px-3 py-1 rounded-full text-[9px] font-black transition-all ${animateCart ? 'scale-110 rotate-3' : 'scale-100'}`}>
            {cart.length} ÍTEMS
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {cart.map(item => (
            <div key={item.productId} className="p-3 rounded-[1.2rem] border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-black/20 animate-fade-in-up">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-slate-300 hover:text-red-500 active:scale-90 transition-transform"><Trash2 size={16}/></button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform"><Minus size={12}/></button>
                    <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform"><Plus size={12}/></button>
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">u. ${(item.sellingPrice || 0).toLocaleString()}</span>
                </div>
                <p className="text-lg font-black text-brand-emerald">${(item.subtotal || 0).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-20">
               <ShoppingCart size={40} className="mb-2" />
               <p className="text-[9px] font-black uppercase tracking-[0.3em]">Carrito Vacío</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-border bg-slate-50 dark:bg-slate-950 mt-auto">
          <div className={`flex justify-between items-center mb-3 transition-all duration-300 ${animateCart ? 'animate-pop' : ''}`}>
            <span className="text-[9px] font-black uppercase tracking-widest">Total Final</span>
            <p className="text-3xl font-black text-brand-emerald tracking-tighter">${(total || 0).toLocaleString()}</p>
          </div>
          <Button fullWidth variant="sales" disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)}>CONFIRMAR VENTA</Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="FINALIZAR OPERACIÓN">
        <div className="space-y-6 p-1">
          <div className="text-center p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-brand-emerald/10">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.5em] mb-2">Total</p>
            <p className="text-4xl md:text-6xl font-black text-brand-emerald tracking-tighter">${(total || 0).toLocaleString()}</p>
          </div>
          
          <div className="space-y-2 px-2">
            <label className="block text-[10px] font-black uppercase tracking-widest">Efectivo Recibido</label>
            <input 
              type="number" 
              className="w-full py-5 text-4xl font-black bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none focus:border-brand-emerald text-center"
              value={amountReceived} 
              onChange={e => setAmountReceived(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </div>

          <div className={`p-4 rounded-[1.5rem] border-2 flex justify-between items-center ${change >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <span className="text-[9px] font-black uppercase tracking-widest">{change >= 0 ? 'Cambio' : 'Faltante'}</span>
            <span className="text-2xl font-black">${Math.abs(change).toLocaleString()}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setIsCheckoutOpen(false)}>MODIFICAR</Button>
            <Button variant="sales" fullWidth disabled={change < 0} onClick={finalize}>FINALIZAR VENTA</Button>
          </div>
        </div>
      </Modal>

      {showTicket && saleSummary && (
        <SaleTicket 
          items={saleSummary.items}
          total={saleSummary.revenue}
          paymentMethod="CASH"
          sellerId={currentUser?.username || "SISTEMA"}
          folio={saleSummary.folio}
          onClose={() => setShowTicket(false)}
        />
      )}
    </div>
  );
};

export default POS;
