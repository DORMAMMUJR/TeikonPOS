import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { salesAPI } from '../utils/api';

// Configuración de estilo encapsulada
const TICKET_WIDTH = '58mm';
const FONT_FAMILY = 'monospace';
const FONT_SIZE = '12px';

// Separador de texto
const Separator = () => (
  <div style={{ padding: '4px 0', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap' }}>
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
  sellerId?: string;
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

  // Limpieza de sellerId
  let rawSeller = propSellerId || fetchedSale?.vendedor || fetchedSale?.sellerId || 'SISTEMA';
  if (typeof rawSeller === 'object') {
    rawSeller = rawSeller.username || rawSeller.name || 'SISTEMA';
  }

  const cleanSellerName = (input: string) => {
    if (input.includes('(')) {
      return input.split('(')[0].trim();
    }
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
    // Si onClose está definido (modo modal/preview), solo imprimimos si shouldAutoPrint es true
    // Si onClose NO está definido (modo background/auto), imprimimos si shouldAutoPrint es false (comportamiento legacy) o true
    const shouldTriggerPrint = shouldAutoPrint && !isLoading && !error && !hasPrintedRef.current && items.length > 0;

    if (shouldTriggerPrint) {
      hasPrintedRef.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [shouldAutoPrint, isLoading, error, items.length]);

  // Componente de contenido del ticket
  const TicketContent = ({ isPrint = false }: { isPrint?: boolean }) => (
    <div className="thermal-ticket-content" style={{
      width: isPrint ? '100%' : TICKET_WIDTH, // En print, el ancho lo define el contenedor .ticket
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: '1.2',
      color: 'black',
      background: 'white',
      padding: isPrint ? 0 : '0',
      margin: isPrint ? 0 : '0', // En print, el margen lo maneja .ticket
      boxSizing: 'border-box',
      textAlign: 'left'
    }}>
      {/* 1. Encabezado */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{storeInfo.name}</div>
        {storeInfo.address && <div>{storeInfo.address}</div>}
        {storeInfo.phone && <div>Tel: {storeInfo.phone}</div>}
      </div>

      <Separator />

      {/* 2. Info Venta */}
      <div style={{ marginBottom: '8px' }}>
        <div>{new Date(date).toLocaleString('es-MX')}</div>
        {folio && <div>Folio: {folio.toUpperCase()}</div>}
        {sellerName && <div>Le atendió: {sellerName}</div>}
      </div>

      <Separator />

      {/* 3. Productos */}
      <div style={{ marginBottom: '8px' }}>
        {items.length === 0 ? (
          <div>-- Sin productos --</div>
        ) : (
          items.map((item: any, i: number) => {
            // Lógica ESTRICTA de cálculo
            const quantity = Number(item.quantity) || Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice) || Number(item.price) || Number(item.salePrice) || Number(item.sellingPrice) || 0;
            const itemSubtotal = quantity * unitPrice;

            return (
              <div key={i} style={{ marginBottom: '6px' }}>
                {/* Nombre del producto */}
                <div style={{ marginBottom: '2px' }}>{item.productName || item.name || item.nombre}</div>

                {/* Cantidad x Precio ... Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ marginRight: '8px' }}>{quantity} x ${formatMoney(unitPrice)}</span>
                  <span style={{ fontWeight: 'bold' }}>
                    ${formatMoney(itemSubtotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Separator />

      {/* 4. Totales */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
          <span>TOTAL:</span>
          <span>${formatMoney(total)}</span>
        </div>

        {amountPaid > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Efectivo:</span>
              <span>${formatMoney(amountPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cambio:</span>
              <span>${formatMoney(change)}</span>
            </div>
          </>
        )}

        {paymentMethod && (
          <div style={{ marginTop: '4px' }}>
            Pago: {paymentMethod === 'CASH' ? 'EFECTIVO' : paymentMethod}
          </div>
        )}
      </div>

      <Separator />

      {/* 5. Pie de página */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <div>{footerMessage}</div>
      </div>
    </div>
  );

  if (isLoading) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px' }}>Cargando ticket...</div>;
  if (error) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px', color: 'red' }}>Error: {error}</div>;

  const printContainer = document.getElementById('print-ticket');

  return (
    <>
      {/* 1. VISTA PREVIA */}
      <div className="ticket-preview-container print:hidden" style={{
        background: '#fff',
        border: '1px solid #eee',
        padding: '10px',
        display: 'inline-block'
      }}>
        <TicketContent isPrint={false} />
      </div>

      {/* 2. IMPRESIÓN (Portal) */}
      {printContainer && ReactDOM.createPortal(
        <>
          <style>{`
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .print-wrapper {
                width: 100%;
                display: block;
              }
              .ticket {
                width: 58mm;
                margin: 0 auto;           /* ← CENTRADO REAL EN PAPEL */
                padding-left: 2mm;        /* ← evita que el texto se “coma” el borde */
                padding-right: 2mm;
                font-family: monospace;
                text-align: left;
              }
            }
          `}</style>
          <div className="print-wrapper">
            <div className="ticket">
              <TicketContent isPrint={true} />
            </div>
          </div>
        </>,
        printContainer
      )}

      {/* Controles UI */}
      {onClose && !hideControls && (
        <div className="no-print" style={{ textAlign: 'center', marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: 'black',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            IMPRIMIR
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
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