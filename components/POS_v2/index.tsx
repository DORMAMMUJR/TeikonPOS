import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import POSHeader from '../POSHeader';

// ─── STRCIT TYPING IMPORTADO DESDE DOMINION ───
import { Product } from '../../domain/cart/types';

// Subcomponentes refactorizados
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { CheckoutModal } from './CheckoutModal';
import SalesGoalModal from '../SalesGoalModal';
import CashRegisterModal from '../CashRegisterModal';
import CloseShiftModal from '../CloseShiftModal';
import SupportTicketModal from '../SupportTicketModal';
import { useSearchStore } from '../../store/searchStore';

import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

/**
 * POS_v2/index.tsx (Esqueleto de la V2)
 * 
 * Este componente actúa como el ensamblador principal (Orquestador).
 * El reto superado aquí es el AISLAMIENTO del estado de búsqueda:
 * 1. El layout ya NO maneja 'searchTerm' en un useState local.
 * 2. POSHeader escribe en 'useSearchStore'.
 * 3. ProductGrid lee de 'useSearchStore'.
 * 
 * Resultado: Cada tecla presionada en el buscador NO re-evalúa este componente
 * ni dispara re-renders en CartPanel o los Modales.
 */
export const POS_v2: React.FC = () => {
  const { products } = useStore();
  
  // Modals Controller (Estados que sí disparan re-render del layout al abrirse)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCashCloseOpen, setIsCashCloseOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  /**
   * Transformación Estructural para acceso rápido O(1).
   * Se mantiene memoizado para evitar re-procesar si los productos no cambian.
   */
  const productsMap = useMemo(() => {
    const map: Record<string, Product> = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.id) map[p.id] = p as unknown as Product;
    }
    return map;
  }, [products]);

  // Función compartida para procesar un código de barras (ya sea manual o global)
  const processBarcode = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return;

    const productToScan = products.find(p => p.sku.toLowerCase() === cleanCode);

    if (productToScan) {
      import('../../store/cartStore').then(({ useCartStore }) => {
        useCartStore.getState().addProduct(productToScan as unknown as Product);
        // Limpiamos el buscador global
        useSearchStore.getState().clearSearch();
      });
    } else {
      alert("Producto no encontrado en inventario");
      useSearchStore.getState().clearSearch();
    }
  };

  /**
   * ─── LISTENER GLOBAL DE ESCANER DE HARDWARE ───
   * Intercepta pistolas láser sin importar dónde esté el foco.
   */
  useBarcodeScanner((code) => {
    processBarcode(code);
    // Como el escáner escribe muy rápido, es posible que haya ensuciado el input
    // antes de darnos cuenta que era un escáner. Limpiamos el input visualmente.
    useSearchStore.getState().clearSearch();
  });

  /**
   * Manejador Manual del Input de Búsqueda
   * Fallback por si el usuario escribe el código a mano y presiona Enter.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      setIsCheckoutOpen(true);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcode(e.currentTarget.value);
    }
  };


  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] overflow-hidden">
      
      {/* ─── HEADER DEL TPV (Diferenciado por no recibir searchTerm vía props) ─── */}
      <POSHeader
        searchInputRef={searchInputRef}
        onKeyDown={handleKeyDown}
        onCloseShift={() => setIsCloseModalOpen(true)}
      />

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* ─── ZONA IZQUIERDA: PRODUCTOS (Suscrito internamente al SearchStore) ─── */}
        <ProductGrid 
          productsMap={productsMap} 
        />

        {/* ─── ZONA DERECHA: CARRITO (Totalmente aislado con CartItem Memoizado) ─── */}
        <CartPanel 
          onOpenCheckout={() => setIsCheckoutOpen(true)} 
        />
        
      </div>

      {/* ─── CAPA DE MODALES ─── */}
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
      
      <SalesGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
      <CashRegisterModal isOpen={isCashCloseOpen} onClose={() => setIsCashCloseOpen(false)} />
      <SupportTicketModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <CloseShiftModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onShiftClosed={() => window.location.reload()}
      />

    </div>
  );
};

export default POS_v2;
