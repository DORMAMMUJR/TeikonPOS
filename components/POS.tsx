
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

  // Mantener el foco en el buscador para el escáner
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
    // Venta flexible: Se permite la venta sin importar el stock actual
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      // Lógica de escáner: buscar coincidencia exacta de SKU
      const product = products.find(p => p.sku.toUpperCase() === searchTerm.toUpperCase().trim() && p.isActive);
      if (product) {
        addToCart(product);
        setSearchTerm(''); // Limpiar para el siguiente escaneo
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
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-250px)]">
      <div className="lg:w-2/3 flex flex-col bg-brand-panel border border-brand-border cut-corner overflow-hidden">
        <div className="p-4 border-b border-brand-border bg-brand-text/5">
          <div className="relative">
            <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/40" size={16} />
            <input 
              ref={searchInputRef}
              className="w-full pl-12 pr-4 py-4 bg-brand-bg border border-brand-border cut-corner-sm focus:border-brand-text outline-none transition-all text-sm font-black uppercase tracking-widest text-brand-text placeholder:text-brand-muted/50"
              placeholder="MODO ESCÁNER ACTIVO // BUSCAR SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="p-4 bg-brand-bg/30 border border-brand-border cut-corner-sm cursor-pointer hover:border-brand-text transition-all group relative">
              <div className="h-24 bg-brand-bg cut-corner-sm mb-4 flex items-center justify-center overflow-hidden">
                {p.image ? <img src={p.image} className="h-full w-full object-cover" /> : <ImageOff className="text-brand-muted" />}
              </div>
              <h4 className="text-[8px] font-black text-brand-muted uppercase tracking-widest truncate mb-1">{p.sku}</h4>
              <p className="text-xs font-bold text-brand-text line-clamp-1 mb-2 uppercase">{p.name}</p>
              <p className="text-lg font-black text-brand-text">${p.salePrice}</p>
              
              {/* Alertas de stock visuales */}
              {p.stock <= 0 ? (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-600 text-white text-[8px] font-black cut-corner-sm flex items-center gap-1">
                  <AlertTriangle size={8} /> OUT
                </span>
              ) : p.stock <= p.minStock ? (
                 <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500 text-black text-[8px] font-black cut-corner-sm">LOW</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:w-1/3 flex flex-col bg-brand-panel border border-brand-border cut-corner">
        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-text/5">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2"><ShoppingCart size={16}/> CARRITO</h3>
          <span className="text-[10px] font-black px-3 py-1 bg-brand-text text-brand-bg cut-corner-sm">{cart.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center gap-4 animate-in slide-in-from-right duration-300">
              <div className="flex-1">
                <p className="text-[10px] font-black text-brand-text uppercase truncate">{item.productName}</p>
                <p className="text-[9px] font-bold text-brand-muted uppercase">${item.unitPrice} UNIT.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-brand-text transition-colors text-brand-muted"><Minus size={14}/></button>
                <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-brand-text transition-colors text-brand-muted"><Plus size={14}/></button>
              </div>
              <p className="text-sm font-black w-16 text-right">${item.subtotal.toFixed(2)}</p>
              <button onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))} className="text-brand-muted hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
              <ShoppingCart size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">CARRITO VACÍO</p>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-brand-border bg-brand-text/5">
          <div className="flex justify-between text-2xl font-black mb-6">
            <span className="text-brand-muted text-sm font-bold self-center">TOTAL</span>
            <span className="text-brand-text">${total.toFixed(2)}</span>
          </div>
          <Button fullWidth variant="primary" className="py-5 text-xs tracking-[0.4em]" disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)}>
            PROCESAR COBRO
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="FINALIZAR OPERACIÓN">
        <div className="space-y-8">
          <div className="text-center p-8 bg-brand-text/5 border border-brand-border cut-corner">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-2">IMPORTE TOTAL</p>
            <p className="text-5xl font-black text-brand-text">${total.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-brand-muted tracking-widest mb-4">EFECTIVO RECIBIDO</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl text-brand-muted font-black">$</span>
              <input 
                type="number" autoFocus className="w-full pl-14 pr-6 py-6 text-4xl font-black bg-brand-bg border border-brand-border cut-corner outline-none text-brand-text focus:border-brand-text transition-all"
                value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
              />
            </div>
          </div>
          <div className={`p-6 cut-corner border text-center transition-all ${change >= 0 ? 'bg-brand-text text-brand-bg border-brand-text' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">{change >= 0 ? 'CAMBIO A ENTREGAR' : 'SALDO PENDIENTE'}</p>
            <p className="text-3xl font-black">${Math.abs(change).toFixed(2)}</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" fullWidth onClick={() => setIsCheckoutOpen(false)}>REVISAR</Button>
            <Button variant="primary" fullWidth disabled={change < 0} onClick={finalize}>CONFIRMAR VENTA</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;
