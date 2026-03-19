import React, { useEffect, useState } from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '../../src/components/ui';
import { useStore } from '../../context/StoreContext'; // Asumiendo que el contexto provee currentSession

// Importamos el Zustand store reactivamente (sin .getState())
import { useCartStore } from '../../store/cartStore';

// Importamos el componente memoizado para evitar re-renders innecesarios
import { CartItem } from './CartItem';

interface CartPanelProps {
  /** 
   * Función para activar el Modal de Checkout desde este componente, 
   * manteniendo la vista desconectada pero controlada.
   */
  onOpenCheckout: () => void;
}

/**
 * CartPanel: Componente del extremo derecho.
 * Se suscribe a los cambios del `useCartStore` y re-renderiza ÚNICAMENTE esta porción
 * del DOM cuando los items cambian.
 */
export const CartPanel: React.FC<CartPanelProps> = ({ onOpenCheckout }) => {
  // Lógica de sesión heredada (si la caja está abierta o no)
  const { currentSession } = useStore();

  // Suscripción reactiva a Zustand
  // Seleccionamos solo lo necesario para minimizar re-renders colaterales
  const cartDict = useCartStore((state) => state.cart);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeProduct = useCartStore((state) => state.removeProduct);
  
  // FIX: Obtenemos la referencia a la función constructora en lugar de ejecutarla en el selector,
  // porque Zustand usa useSyncExternalStore y devolver un objeto nuevo en cada pasada crashea React (Error 185)
  const getTotals = useCartStore((state) => state.getTotals);
  const totals = getTotals();

  // Convertimos el diccionario a un arreglo para iterarlo
  const cartItems = Object.values(cartDict);
  const totalItemsCount = cartItems.length;

  // Animación del ícono de carrito cuando se agrega algo (trigger local)
  const [animateCart, setAnimateCart] = useState(false);
  useEffect(() => {
    if (totalItemsCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItemsCount]);

  return (
    <>
      {/* DESKTOP CART - Layout lateral derecho */}
      <div className="hidden lg:flex lg:w-1/3 flex-col card-premium overflow-hidden border-t-4 border-t-brand-emerald shadow-2xl bg-white dark:bg-slate-900">
        
        {/* Cabecera del panel */}
        <div className="px-4 py-3 border-b border-brand-border flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className={`flex items-center gap-2 transition-transform duration-300 ${animateCart ? 'scale-125 text-brand-emerald' : 'scale-100'}`}>
            <ShoppingCart size={16} className={animateCart ? 'animate-bounce text-brand-emerald' : 'text-brand-emerald'} />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Detalle</h3>
          </div>
          <span className={`bg-brand-emerald/10 text-brand-emerald px-3 py-1 rounded-full text-[9px] font-black transition-all ${animateCart ? 'scale-110 rotate-3' : 'scale-100'}`}>
            {totalItemsCount} ÍTEMS
          </span>
        </div>

        {/* Lista Scrollable de Ítems */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {cartItems.map((item) => (
            <CartItem 
              key={item.productId} 
              item={item} 
              onSetQuantity={setQuantity} 
              onRemove={removeProduct} 
            />
          ))}

          {totalItemsCount === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-20">
              <ShoppingCart size={40} className="mb-2" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em]">Carrito Vacío</p>
            </div>
          )}
        </div>

        {/* Footer: Totales y Botón de Checkout */}
        <div className="p-4 border-t border-brand-border bg-slate-50 dark:bg-slate-950 mt-auto shrink-0">
          <div className={`flex flex-col md:flex-row justify-between items-center mb-3 gap-2 transition-all duration-300 ${animateCart ? 'animate-pop' : ''}`}>
            <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Total Final</span>
            <p className="text-xl md:text-3xl font-black text-brand-emerald tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totals.total || 0)}
            </p>
          </div>
          
          <Button
            fullWidth
            variant="sales"
            disabled={totalItemsCount === 0 || !currentSession}
            onClick={onOpenCheckout}
            className="h-[48px] text-sm font-black shadow-lg"
          >
            {currentSession ? 'CONFIRMAR VENTA' : '⛔ CAJA CERRADA'}
          </Button>
        </div>
      </div>

      {/* MOBILE STICKY CHECKOUT BAR - Visible solo en celulares */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-4 border-t-brand-emerald shadow-2xl">
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className={`text-brand-emerald ${animateCart ? 'animate-bounce' : ''}`} />
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-black text-brand-emerald tracking-tighter">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totals.total || 0)}
            </p>
          </div>

          <Button
            fullWidth
            variant="sales"
            disabled={totalItemsCount === 0 || !currentSession}
            onClick={onOpenCheckout}
            className="h-[52px] text-sm font-black shadow-lg"
          >
            {currentSession ? 'CONFIRMAR VENTA' : '⛔ CAJA CERRADA'}
          </Button>
        </div>
      </div>
    </>
  );
};
