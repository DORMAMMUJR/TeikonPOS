import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { salesAPI } from '../utils/api';

// Configuración de estilo encapsulada
const TICKET_WIDTH = '58mm';
const FONT_FAMILY = '"Courier New", Courier, monospace'; // Explicit monospace
const FONT_SIZE = '12px';
const LINE_WIDTH = 32; // 32 caracteres por línea para 58mm

// Separador de texto (32 guiones)
const SEPARATOR_LINE = '-'.repeat(LINE_WIDTH);

// Helpers para formato de texto
const centerText = (text: string): string => {
  const trimmed = text.substring(0, LINE_WIDTH);
  const padding = Math.max(0, Math.floor((LINE_WIDTH - trimmed.length) / 2));
  return ' '.repeat(padding) + trimmed;
};

const justifyText = (left: string, right: string): string => {
  // Aseguramos que la derecha quepa
  const rightStr = right.substring(0, LINE_WIDTH / 2); // Seguridad
  const targetLen = LINE_WIDTH - rightStr.length;
  // Recortamos izquierda si es necesario para que no empuje
  const leftStr = left.substring(0, targetLen - 1); // -1 para asegurar al menos un espacio

  return leftStr.padEnd(targetLen, ' ') + rightStr;
};

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
  const TicketContent = ({ isPrint = false }: { isPrint?: boolean }) => {
    // Generación de líneas de texto plano
    const renderLine = (text: string, key?: number | string) => (
      <div key={key} style={{ whiteSpace: 'pre', overflow: 'hidden', width: '100%' }}>
        {text}
      </div>
    );

    return (
      <div className="thermal-ticket-content" style={{
        width: isPrint ? '100%' : TICKET_WIDTH,
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        lineHeight: '1.2',
        color: 'black',
        background: 'white',
        padding: isPrint ? 0 : '0 2mm', // Padding visual en preview
        margin: 0,
        boxSizing: 'border-box',
        textAlign: 'left'
      }}>
        {/* Encabezado */}
        {renderLine(centerText(storeInfo.name))}
        {storeInfo.address && renderLine(centerText(storeInfo.address))}
        {storeInfo.phone && renderLine(centerText(`Tel: ${storeInfo.phone}`))}

        {renderLine(SEPARATOR_LINE)}

        {/* Info Venta */}
        {renderLine(`Fecha: ${new Date(date).toLocaleString('es-MX')}`)}
        {folio && renderLine(`Folio: ${folio.toUpperCase()}`)}
        {sellerName && renderLine(`Le atendió: ${sellerName}`)}

        {renderLine(SEPARATOR_LINE)}

        {/* Productos */}
        {items.length === 0 ? (
          renderLine(centerText("-- Sin productos --"))
        ) : (
          items.map((item: any, i: number) => {
            const quantity = Number(item.quantity) || Number(item.qty) || 1;
            const unitPrice = Number(item.unitPrice) || Number(item.price) || Number(item.salePrice) || Number(item.sellingPrice) || 0;
            const itemSubtotal = quantity * unitPrice;

            // Línea 1: Nombre del producto
            // Línea 2: Qty x Price ... Subtotal
            const name = item.productName || item.name || item.nombre || '';
            const detailsLeft = `${quantity} x $${formatMoney(unitPrice)}`;
            const detailsRight = `$${formatMoney(itemSubtotal)}`;
            const detailsLine = justifyText(detailsLeft, detailsRight);

            return (
              <div key={i}>
                {renderLine(name.substring(0, LINE_WIDTH))}
                {renderLine(detailsLine)}
              </div>
            );
          })
        )}

        {renderLine(SEPARATOR_LINE)}

        {/* Totales */}
        {renderLine(justifyText("TOTAL:", `$${formatMoney(total)}`))}

        {amountPaid > 0 && (
          <>
            {renderLine(justifyText("Efectivo:", `$${formatMoney(amountPaid)}`))}
            {renderLine(justifyText("Cambio:", `$${formatMoney(change)}`))}
          </>
        )}

        {paymentMethod && (
          renderLine(`Pago: ${paymentMethod === 'CASH' ? 'EFECTIVO' : paymentMethod}`)
        )}

        {renderLine(SEPARATOR_LINE)}

        {/* Pie de página */}
        <div style={{ paddingTop: '8px' }}>
          {renderLine(centerText(footerMessage))}
          {renderLine(centerText("** Gracias por su preferencia **"))}
        </div>
      </div>
    );
  };

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
                margin: 0 auto;
                padding: 0; /* Padding controlado por espacios */
                font-family: monospace;
                font-size: 12px;
              }
              .thermal-ticket-content {
                 width: 100% !important;
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
              fontWeight: 'bold',
              fontFamily: 'sans-serif'
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
              fontWeight: 'bold',
              fontFamily: 'sans-serif'
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