import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { salesAPI } from '../utils/api';

// Configuración de estilo encapsulada
const TICKET_WIDTH = '48mm';
const FONT_FAMILY = 'monospace';
const FONT_SIZE = '11px';

// Separador de texto
const Separator = () => (
  <div style={{ padding: '4px 0', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
    --------------------------------
  </div>
);

// Función auxiliar para dinero
const formatMoney = (value: any): string => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

interface SaleTicketProps {
  saleId?: string;
  items?: any[];
  total?: number;
  amountPaid?: number;
  change?: number;
  date?: string;
  storeInfo?: {
    name: string;
    address?: string;
    phone?: string;
  };
  footerMessage?: string;
  folio?: string;
  paymentMethod?: string;
  sellerId?: string; // Esperamos "Nombre" o "Nombre (email)"
  onClose?: () => void;
  shouldAutoPrint?: boolean;
  hideControls?: boolean;
}

export const SaleTicket: React.FC<SaleTicketProps> = ({
  saleId,
  items: propItems,
  total: propTotal,
  amountPaid = 0,
  change = 0,
  date: propDate,
  storeInfo: propStoreInfo,
  footerMessage = "¡Gracias por su compra!",
  folio: propFolio,
  paymentMethod: propPaymentMethod,
  sellerId: propSellerId,
  onClose,
  shouldAutoPrint = false,
  hideControls = false
}) => {
  const [fetchedSale, setFetchedSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica de carga de datos
  useEffect(() => {
    const needsToFetch = saleId && (!propItems || !propTotal || !propDate);
    if (needsToFetch) {
      const fetchSaleData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const sale = await salesAPI.getById(saleId);
          setFetchedSale(sale);
        } catch (err: any) {
          setError(err.message || 'Error al cargar venta');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSaleData();
    }
  }, [saleId, propItems, propTotal, propDate]);

  // Consolidación de datos
  const items = propItems || fetchedSale?.items || [];
  const total = propTotal ?? fetchedSale?.total ?? 0;
  const date = propDate || fetchedSale?.date || new Date().toISOString();
  const folio = propFolio || fetchedSale?.id?.slice(0, 8) || 'N/A';
  const paymentMethod = propPaymentMethod || fetchedSale?.paymentMethod;

  // Limpieza de sellerId: Eliminar email si viene en formato "Nombre (email@domain.com)"
  // O usar el string directo si es solo nombre.
  let rawSeller = propSellerId || fetchedSale?.vendedor || fetchedSale?.sellerId || 'SISTEMA';

  // Si es un objeto (caso borde), intenta sacar nombre
  if (typeof rawSeller === 'object') {
    rawSeller = rawSeller.username || rawSeller.name || 'SISTEMA';
  }

  // Lógica para quitar email entre paréntesis o si es un email directo
  const cleanSellerName = (input: string) => {
    // Caso 1: "Juan Perez (juan@gmail.com)" -> "Juan Perez"
    if (input.includes('(')) {
      return input.split('(')[0].trim();
    }
    // Caso 2: "juan@gmail.com" -> "Juan" (Capitalizado)
    if (input.includes('@')) {
      const namePart = input.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return input;
  };

  const sellerName = cleanSellerName(rawSeller);

  const storeInfo = propStoreInfo || {
    name: fetchedSale?.store?.nombre || 'TEIKON POS',
    address: 'Sistema de Punto de Venta',
    phone: 'N/A'
  };

  // Lógica de autoprint
  const hasPrintedRef = useRef(false);
  useEffect(() => {
    const isPOSMode = !onClose && !shouldAutoPrint;
    const isPrintMode = onClose && shouldAutoPrint;

    // Auto-print solo si NO estamos en modo Preview (donde el usuario elige manualmente)
    const shouldTriggerPrint =
      (isPOSMode || isPrintMode) &&
      !isLoading &&
      !error &&
      !hasPrintedRef.current &&
      items.length > 0 &&
      total > 0;

    if (shouldTriggerPrint) {
      hasPrintedRef.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [onClose, shouldAutoPrint, isLoading, error, items.length, total]);

  // Componente de contenido del ticket (reutilizable)
  const TicketContent = () => (
    <div className="thermal-ticket-content" style={{
      width: TICKET_WIDTH,
      maxWidth: TICKET_WIDTH,
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: '1.2',
      color: 'black',
      background: 'white',
      padding: '5px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* 1. Nombre de la tienda */}
      <div className="text-center font-bold mb-1" style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>
        {storeInfo.name}
      </div>

      {/* 2. Dirección / Teléfono */}
      <div className="text-center mb-1" style={{ textAlign: 'center', marginBottom: '4px' }}>
        {storeInfo.address && <div>{storeInfo.address}</div>}
        {storeInfo.phone && <div>Tel: {storeInfo.phone}</div>}
      </div>

      {/* 3. Línea separadora */}
      <Separator />

      {/* 4. Fecha y hora */}
      <div className="mb-1" style={{ marginBottom: '4px' }}>
        <div>Fecha: {new Date(date).toLocaleString('es-MX')}</div>
        {folio && <div>Folio: {folio.toUpperCase()}</div>}
        {sellerName && <div>Le atendió: {sellerName}</div>}
      </div>

      <Separator />

      {/* 5. Lista de productos */}
      <div className="mb-1" style={{ marginBottom: '4px' }}>
        {items.length === 0 ? (
          <div className="text-center">-- Sin productos --</div>
        ) : (
          items.map((item: any, i: number) => {
            const quantity = Number(item.quantity) || Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice) || Number(item.price) || Number(item.salePrice) || Number(item.sellingPrice) || 0;
            const itemTotal = unitPrice * quantity;

            return (
              <div key={i} style={{ marginBottom: '6px' }}>
                {/* Nombre del producto */}
                <div className="text-left" style={{ textAlign: 'left' }}>{item.productName || item.name || item.nombre}</div>

                {/* Detalles: Cantidad x Precio = Total */}
                <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{quantity} x ${formatMoney(unitPrice)}</span>
                  <span className="font-bold" style={{ fontWeight: 'bold' }}>
                    ${formatMoney(itemTotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Línea separadora */}
      <Separator />

      {/* 7. Total, 8. Pago, 9. Cambio */}
      <div style={{ marginBottom: '8px' }}>
        <div className="flex-between font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
          <span>TOTAL:</span>
          <span>${formatMoney(total)}</span>
        </div>

        {amountPaid > 0 && (
          <>
            <div className="flex-between mt-1" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Efectivo:</span>
              <span>${formatMoney(amountPaid)}</span>
            </div>
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cambio:</span>
              <span>${formatMoney(change)}</span>
            </div>
          </>
        )}

        {/* Método de pago */}
        {paymentMethod && (
          <div className="text-left" style={{ textAlign: 'left', marginTop: '4px' }}>
            Forma de Pago: {paymentMethod === 'CASH' ? 'EFECTIVO' : paymentMethod}
          </div>
        )}
      </div>

      <Separator />

      {/* 10. Mensaje final */}
      <div className="text-center" style={{ textAlign: 'center', marginTop: '4px' }}>
        <div>{footerMessage}</div>
        <div style={{ fontSize: '9px', marginTop: '4px' }}>** Gracias por su preferencia **</div>
      </div>
    </div>
  );

  if (isLoading) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px', textAlign: 'center' }}>Cargando ticket...</div>;
  if (error) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;

  const printContainer = document.getElementById('print-ticket');

  return (
    <>
      {/* 1. VISTA PREVIA (Visible en pantalla / modal) */}
      <div className="ticket-preview-container print:hidden" style={{
        background: '#fff',
        border: '1px solid #eee',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'inline-block',
        margin: '0 auto'
      }}>
        <TicketContent />
      </div>

      {/* 2. VERSIÓN DE IMPRESIÓN (Portal oculto en pantalla, visible al imprimir) */}
      {printContainer && ReactDOM.createPortal(
        <TicketContent />, // Renderiza exáctamente el mismo contenido
        printContainer
      )}

      {/* Controles UI (solo visibles en pantalla) */}
      {onClose && !hideControls && (
        <div className="no-print" style={{ textAlign: 'center', marginTop: '10px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'sans-serif',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            CERRAR
          </button>
        </div>
      )}
    </>
  );
};

export default SaleTicket;