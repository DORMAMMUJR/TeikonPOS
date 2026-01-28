
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { CartItem, CartItemState } from '../types';
import { Product } from "@/Product";
import { Button, Modal } from '../src/components/ui';
import SaleTicket from './SaleTicket';
import POSHeader from './POSHeader';
import SalesGoalModal from './SalesGoalModal';
import CashRegisterModal from './CashRegisterModal';
import CloseShiftModal from './CloseShiftModal';
import SupportTicketModal from './SupportTicketModal';
import {
  Trash2,
  Plus,
  Minus,
  ImageOff,
  ShoppingCart,
  CreditCard,
  Banknote,
  ArrowRightLeft,
} from 'lucide-react';

const POS: React.FC = () => {
  const { products, processSaleAndContributeToGoal, currentUser, syncData, currentSession } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [saleSummary, setSaleSummary] = useState<{ revenue: number, profit: number, items: any[], folio: string, id?: string, total?: number, paymentMethod?: string, sellerId?: string, date?: string } | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCashCloseOpen, setIsCashCloseOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-Refresh Logic: Removed redundant syncData call to prevent loops.
  // StoreContext already handles initial and background sync.

  // Auto-focus Logic
  useEffect(() => {
    const focusSearch = () => {
      if (!isCheckoutOpen && !showTicket && window.innerWidth > 768) {
        searchInputRef.current?.focus();
      }
    };
    focusSearch();
    window.addEventListener('focus', focusSearch);
    return () => window.removeEventListener('focus', focusSearch);
  }, [isCheckoutOpen, showTicket]);

  useEffect(() => {
    if (cart.length > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  // GLOBAL HOTKEY: Checkout (Ctrl + Enter)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // Trigger checkout if cart has items and not already checking out
        if (cart.length > 0) {
          setIsCheckoutOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart]);

  // INPUT HANDLER: Scan & Go
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (cart.length > 0) setIsCheckoutOpen(true);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchTerm.trim();

      if (!code) return;

      const product = products.find(p => p.sku === code || p.sku.toLowerCase() === code.toLowerCase());

      if (product) {
        addToCart(product);
        setSearchTerm('');
      } else {
        alert("Producto no encontrado");
        setSearchTerm('');
      }
    }
  };

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
      setLastAddedId(product.id);
      setTimeout(() => setLastAddedId(null), 1000);
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        sellingPrice: Number(product.salePrice),
        unitCost: Number(product.costPrice),
        image: product.image,
        subtotal: Number(product.salePrice)
      }];
    });
    // En móvil, devolver foco al input es molesto porque re-abre teclado
    if (window.innerWidth > 768) {
      searchInputRef.current?.focus();
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.sellingPrice };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setIsCheckoutOpen(false);
    setAmountReceived('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const tax = subtotal * 0.16; // Example tax
  const total = subtotal; // Assuming inclusive or exclusive? Keeping simple based on previous code.
  const change = (parseFloat(amountReceived) || 0) - total;

  // Auto-complete amount for non-cash payments
  useEffect(() => {
    if (isCheckoutOpen) {
      if (paymentMethod !== 'CASH') {
        setAmountReceived(total.toString());
      } else {
        setAmountReceived('');
      }
    }
  }, [paymentMethod, isCheckoutOpen, total]);

  // Checkout Handler
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
  };

  const finalize = async () => {
    // 1. Sanitización Defensiva: Conversiones Seguras
    const pay = parseFloat(amountReceived) || 0;
    const safeTotal = Number(total) || 0;
    const safeChange = pay - safeTotal;

    // 2. Protección de Envío: Bloquear NaNs
    if (isNaN(safeTotal) || isNaN(safeChange) || safeTotal < 0) {
      alert('⚠️ Error Crítico: Hay un cálculo inválido en la venta (NaN). Por favor revisa los precios de los productos.');
      console.error('Calculo inválido:', { total, pay, safeChange });
      return;
    }

    // Si es efectivo, validar que no falte dinero. Si es tarjeta/transf, permitimos continuar.
    if (paymentMethod === 'CASH' && safeChange < 0) return;

    // 3. Preparación de Payload Limpio
    const itemsToProcess: CartItem[] = cart.map(i => ({
      productId: i.productId,
      name: i.name,
      sellingPrice: Number(i.sellingPrice) || 0, // Fuerza número
      unitCost: Number(i.unitCost) || 0,        // Fuerza número
      quantity: Number(i.quantity) || 1
    }));

    const cartSnapshot = [...cart];
    // --- EL CAMBIO CLAVE ESTÁ AQUÍ ---
    // En lugar de 'CASH' fijo, enviamos la variable paymentMethod
    const result = await processSaleAndContributeToGoal(itemsToProcess, paymentMethod);

    if (result.success) {
      // Use the persisted sale from backend/store context
      const savedSale = result.sale;

      if (savedSale) {
        setSaleSummary({
          // Add full sale object first to avoid overwriting specific keys later if we wanted defaults, 
          // but here we want specific keys to override or exist alongside.
          // Spreading savedSale gives us: id, date, items, total, etc.
          ...savedSale,
          revenue: result.totalRevenueAdded,
          profit: result.totalProfitAdded,
          // Explicitly map keys that might differ or need transformation
          folio: savedSale.id?.slice(0, 8) || 'N/A',
        });
      } else {
        // Fallback should rarely happen if StoreContext is correct
        console.warn('⚠️ No sale object returned, using local snapshot fallback');
        const folioId = crypto.randomUUID().slice(0, 8);
        setSaleSummary({
          revenue: result.totalRevenueAdded,
          profit: result.totalProfitAdded,
          items: cartSnapshot,
          folio: folioId
        });
      }

      setCart([]);
      setIsCheckoutOpen(false);
      setAmountReceived('');
      setPaymentMethod('CASH'); // Resetear a efectivo para la siguiente venta
      setShowTicket(true); // Open modal with ticket

      // Keep sale summary for modal, don't auto-clear
    }
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] overflow-hidden">
      {/* POS HEADER */}
      <POSHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchInputRef={searchInputRef}
        onKeyDown={handleKeyDown}
        onCloseShift={() => setIsCloseModalOpen(true)}
      />

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* SECCIÓN IZQUIERDA: PRODUCT GRID */}
        {/* Mobile: Full height with bottom padding for sticky bar */}
        {/* Desktop: 2/3 width with normal height */}
        <div className="flex-1 flex flex-col lg:w-2/3 card-premium overflow-hidden border-t-4 border-t-brand-emerald bg-white dark:bg-slate-900 shadow-xl min-h-0 pb-0 relative">
          <div className="absolute inset-0 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 content-start pb-[100px] lg:pb-4 custom-scrollbar">
            {filteredProducts.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className={`group relative p-1.5 sm:p-2 md:p-2.5 bg-white dark:bg-slate-800 border-2 rounded-2xl cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-xl min-h-[140px] sm:min-h-[160px] ${lastAddedId === p.id
                  ? 'border-brand-emerald ring-4 ring-brand-emerald/10'
                  : 'border-slate-100 dark:border-slate-700 hover:border-brand-emerald/40'
                  }`}
              >
                <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-900 rounded-xl mb-1.5 sm:mb-2 md:mb-3 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                  {p.image ? (
                    <img src={p.image} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                  ) : (
                    <ImageOff className="text-slate-200 dark:text-slate-700" size={32} />
                  )}

                  <div className={`absolute top-2 right-2 px-2 py-1.5 sm:px-2.5 rounded-lg font-bold uppercase tracking-tight shadow-md ${p.stock === 0
                    ? 'text-red-500 bg-red-50 ring-2 ring-red-500 text-xl sm:text-2xl animate-pulse'
                    : p.stock <= p.minStock
                      ? 'bg-red-500 text-white text-sm sm:text-base md:text-xl animate-pulse'
                      : 'bg-black/50 dark:bg-white/20 text-white text-sm sm:text-base md:text-xl backdrop-blur-sm'
                    }`}>
                    {p.stock} U.
                  </div>
                </div>

                <div className="px-1 space-y-1">
                  <h4 className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-slate-900 dark:text-white line-clamp-2 min-h-[1.75rem] sm:min-h-[2rem] leading-tight uppercase tracking-tight">
                    {p.name}
                  </h4>
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-sm sm:text-base md:text-lg font-black text-brand-emerald tracking-tighter">
                      ${(p.salePrice || 0).toLocaleString()}
                    </p>
                    <div className="hidden md:block p-1.5 bg-brand-emerald/10 text-brand-emerald rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DESKTOP CART - Hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/3 flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-2xl bg-white dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-brand-border flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
            <div className={`flex items-center gap-2 transition-transform duration-300 ${animateCart ? 'scale-125 text-brand-emerald' : 'scale-100'}`}>
              <ShoppingCart size={16} className={animateCart ? 'animate-bounce' : 'text-brand-emerald'} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Detalle</h3>
            </div>
            <span className={`bg-brand-emerald/10 text-brand-emerald px-3 py-1 rounded-full text-[9px] font-black transition-all ${animateCart ? 'scale-110 rotate-3' : 'scale-100'}`}>
              {cart.length} ÍTEMS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {cart.map(item => (
              <div key={item.productId} className="p-3 rounded-[1.2rem] border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-black/20 animate-fade-in-up">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black uppercase truncate max-w-[150px]">{item.name}</p>
                  {/* Touch-optimized delete button: 44x44px */}
                  <button
                    onClick={() => setCart(c => c.filter(i => i.productId !== item.productId))}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg active:scale-90 transition-all"
                    aria-label="Eliminar item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {/* Touch-optimized quantity buttons: 44x44px */}
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={16} />
                      </button>
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

          <div className="p-4 border-t border-brand-border bg-slate-50 dark:bg-slate-950 mt-auto shrink-0">
            <div className={`flex flex-col md:flex-row justify-between items-center mb-3 gap-2 transition-all duration-300 ${animateCart ? 'animate-pop' : ''}`}>
              <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Total Final</span>
              <p className="text-xl md:text-3xl font-black text-brand-emerald tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total || 0)}
              </p>
            </div>
            {/* Touch-optimized checkout button: 48px height */}
            <Button
              fullWidth
              variant="sales"
              disabled={cart.length === 0 || !currentSession}
              onClick={() => setIsCheckoutOpen(true)}
              className="h-[48px] text-sm font-black"
            >
              {currentSession ? 'CONFIRMAR VENTA' : '⛔ CAJA CERRADA'}
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY CHECKOUT BAR - Hidden on desktop */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-4 border-t-brand-emerald shadow-2xl">
        <div className="p-4 space-y-3">
          {/* Cart Summary */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className={`text-brand-emerald ${animateCart ? 'animate-bounce' : ''}`} />
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-brand-emerald tracking-tighter">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total || 0)}
            </p>
          </div>

          {/* Touch-optimized checkout button: 52px height for mobile */}
          <Button
            fullWidth
            variant="sales"
            disabled={cart.length === 0 || !currentSession}
            onClick={() => setIsCheckoutOpen(true)}
            className="h-[52px] text-sm font-black shadow-lg"
          >
            {currentSession ? 'CONFIRMAR VENTA' : '⛔ CAJA CERRADA'}
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="FINALIZAR OPERACIÓN">
        <div className="space-y-6 p-1">
          <div className="text-center p-6 bg-emerald-500/5 rounded-[2rem] border-2 border-brand-emerald/10">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.5em] mb-2">Total</p>
            <p className="text-4xl md:text-6xl font-black text-brand-emerald tracking-tighter">${(total || 0).toLocaleString()}</p>
          </div>

          {/* --- INSERTAR ESTO DESPUÉS DEL TOTAL Y ANTES DEL INPUT --- */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[44px] ${paymentMethod === 'CASH'
                ? 'border-brand-emerald bg-emerald-50 text-brand-emerald'
                : 'border-slate-100 bg-white text-slate-400'
                }`}
            >
              <Banknote size={24} className="mb-1" />
              <span className="text-[10px] font-black uppercase">Efectivo</span>
            </button>

            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[44px] ${paymentMethod === 'CARD'
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-100 bg-white text-slate-400'
                }`}
            >
              <CreditCard size={24} className="mb-1" />
              <span className="text-[10px] font-black uppercase">Tarjeta</span>
            </button>

            <button
              onClick={() => setPaymentMethod('TRANSFER')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[44px] ${paymentMethod === 'TRANSFER'
                ? 'border-purple-500 bg-purple-50 text-purple-600'
                : 'border-slate-100 bg-white text-slate-400'
                }`}
            >
              <ArrowRightLeft size={24} className="mb-1" />
              <span className="text-[10px] font-black uppercase">Transfer</span>
            </button>
          </div>
          {/* --- FIN DE LA INSERCIÓN --- */}

          <div className="space-y-2 px-2">
            <label className="block text-[10px] font-black uppercase tracking-widest">
              {paymentMethod === 'CASH' ? 'Efectivo Recibido' : 'Monto Referencia'}
            </label>
            <input
              type="number"
              className="w-full py-5 text-4xl font-black bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-[2rem] outline-none focus:border-brand-emerald text-center"
              value={amountReceived}
              onChange={e => setAmountReceived(e.target.value)}
              placeholder="0"
              autoFocus
              readOnly={paymentMethod !== 'CASH'}
            />
          </div>

          {/* Ocultar el cambio si no es efectivo, para no confundir */}
          {paymentMethod === 'CASH' && (
            <div className={`p-4 rounded-[1.5rem] border-2 flex justify-between items-center ${change >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <span className="text-[9px] font-black uppercase tracking-widest">{change >= 0 ? 'Cambio' : 'Faltante'}</span>
              <span className="text-2xl font-black">${Math.abs(change).toLocaleString()}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            {/* Touch-optimized modal buttons: 48px height */}
            <Button variant="secondary" fullWidth onClick={() => setIsCheckoutOpen(false)} className="h-[48px]">MODIFICAR</Button>
            <Button variant="sales" fullWidth disabled={paymentMethod === 'CASH' && change < 0} onClick={finalize} className="h-[48px]">FINALIZAR VENTA</Button>
          </div>
        </div>
      </Modal>

      {/* Sale Complete Modal with Ticket */}
      <Modal
        isOpen={showTicket && saleSummary !== null}
        onClose={() => {
          setShowTicket(false);
          setSaleSummary(null);
        }}
        title="✅ VENTA COMPLETADA"
      >
        {saleSummary && (
          <div className="space-y-4">
            <SaleTicket
              saleId={saleSummary.id} // Pass generated/persisted ID
              items={saleSummary.items}
              total={saleSummary.total || saleSummary.revenue}
              paymentMethod={saleSummary.paymentMethod || "CASH"}
              sellerId={saleSummary.sellerId || currentUser?.username || "SISTEMA"}
              folio={saleSummary.folio}
              date={saleSummary.date || new Date().toISOString()} // Use persisted date
              storeInfo={{
                name: currentUser?.storeName || "TEIKON OS TERMINAL",
                address: "NODO OPERATIVO ACTIVO",
                phone: currentUser?.phone || "N/A"
              }}
              onClose={() => { }} // Prevent auto-print
              hideControls={true} // Hide internal buttons, use modal buttons
            />

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowTicket(false);
                  setSaleSummary(null);
                }}
                className="h-[48px]"
              >
                CERRAR
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => window.print()}
                className="h-[48px]"
              >
                IMPRIMIR
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modals */}
      <SalesGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
      <CashRegisterModal isOpen={isCashCloseOpen} onClose={() => setIsCashCloseOpen(false)} />
      <SupportTicketModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <CloseShiftModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onShiftClosed={() => window.location.reload()}
      />
    </div >
  );
};

export default POS;
