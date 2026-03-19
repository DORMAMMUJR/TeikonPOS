import React from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { CartItemState } from '../../domain/cart/types';

interface CartItemProps {
  item: CartItemState;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/**
 * CartItem: Representación individual de un producto en el carrito.
 * 
 * Aplicamos React.memo para asegurar que si cambias la cantidad de una "Coca-Cola",
 * el componente de las "Sabritas" NO se re-renderice, ahorrando ciclos de CPU
 * y manteniendo el scroll/UI fluido.
 */
export const CartItem: React.FC<CartItemProps> = React.memo(({ item, onSetQuantity, onRemove }) => {
  return (
    <div className="p-3 rounded-[1.2rem] border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-black/20 animate-fade-in-up">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-black uppercase truncate max-w-[150px]">{item.name}</p>
        <button
          onClick={() => onRemove(item.productId)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg active:scale-90 transition-all cursor-pointer"
          aria-label="Eliminar item"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          {/* Controles de Cantidad */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetQuantity(item.productId, item.quantity - 1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform cursor-pointer"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-black w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => onSetQuantity(item.productId, item.quantity + 1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg active:scale-90 transition-transform cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
            u. ${(item.sellingPrice || 0).toLocaleString()}
          </span>
        </div>
        
        <p className="text-lg font-black text-brand-emerald">
          ${(item.subtotal || 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si el item cambia (ID, cantidad, precio, etc.)
  // O si las referencias de las funciones cambian (que no deberían si están wrappeadas)
  return (
    prevProps.item.productId === nextProps.item.productId &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.subtotal === nextProps.item.subtotal
  );
});

CartItem.displayName = 'CartItem';
