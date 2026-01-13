import React, { useEffect, useState, useRef } from 'react';
import { salesAPI } from '../utils/api';

// Si tienes el logo, descomenta la siguiente línea. Si no, déjala comentada.
// import { TeikonLogo } from './ui';

interface SaleTicketProps {
  // Optional saleId for fetching data when props are missing
  saleId?: string;

  // Existing props - now optional when saleId is provided
  items?: any[]; // Puedes cambiar 'any' por tu tipo 'Product' si lo prefieres
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
  onClose
}) => {
  // State for fetched data
  const [fetchedSale, setFetchedSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sale data if saleId is provided but required props are missing
  useEffect(() => {
    const needsToFetch = saleId && (!propItems || !propTotal || !propDate);

    if (needsToFetch) {
      const fetchSaleData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log(`🔍 Fetching sale data for ID: ${saleId}`);
          const sale = await salesAPI.getById(saleId);
          setFetchedSale(sale);
          console.log(`✅ Sale data loaded successfully`);
        } catch (err: any) {
          console.error('❌ Error fetching sale:', err);
          setError(err.message || 'Error al cargar la venta');
        } finally {
          setIsLoading(false);
        }
      };

      fetchSaleData();
    }
  }, [saleId, propItems, propTotal, propDate]);

  // Determine data source: props take precedence, fallback to fetched data
  const items = propItems || fetchedSale?.items || [];
  const total = propTotal ?? fetchedSale?.total ?? 0;
  const date = propDate || fetchedSale?.date || new Date().toISOString();
  const folio = propFolio || fetchedSale?.id?.slice(0, 8) || 'N/A';
  const paymentMethod = propPaymentMethod || fetchedSale?.paymentMethod;
  const sellerId = propSellerId || fetchedSale?.vendedor || fetchedSale?.sellerId;
  const storeInfo = propStoreInfo || {
    name: fetchedSale?.store?.nombre || 'TEIKON POS',
    address: 'Sistema de Punto de Venta',
    phone: 'N/A'
  };

  // Track if we've already printed to prevent duplicate prints
  const hasPrintedRef = useRef(false);

  // Auto-print when data is ready (no timeout needed)
  useEffect(() => {
    // Conditions for auto-print:
    // 1. No onClose callback (POS mode, not preview mode)
    // 2. Not loading
    // 3. No error
    // 4. Haven't printed yet
    // 5. Have valid data (items and total exist)
    const shouldAutoPrint =
      !onClose &&
      !isLoading &&
      !error &&
      !hasPrintedRef.current &&
      items.length > 0 &&
      total > 0;

    if (shouldAutoPrint) {
      // Mark as printed before triggering to prevent race conditions
      hasPrintedRef.current = true;

      // Trigger print immediately - data is ready
      window.print();
    }
  }, [onClose, isLoading, error, items.length, total]);

  // Reset print flag when component unmounts or when switching sales
  useEffect(() => {
    return () => {
      hasPrintedRef.current = false;
    };
  }, [saleId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 bg-white text-black text-center max-w-[300px] mx-auto">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors print:hidden flex items-center justify-center text-lg font-bold shadow-lg"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-sm font-bold">Cargando ticket...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 bg-white text-black text-center max-w-[300px] mx-auto">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors print:hidden flex items-center justify-center text-lg font-bold shadow-lg"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-bold mb-2">Error al cargar el ticket</p>
        <p className="text-xs text-gray-600">{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold"
          >
            CERRAR
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="printable-ticket" style={{
      maxWidth: '80mm',
      width: '80mm',
      margin: '0 auto',
      padding: '4mm',
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: '12pt',
      lineHeight: '1.3',
      color: '#000',
      backgroundColor: '#fff',
      position: 'relative'
    }}>
      {/* Close button - hidden on print */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors print:hidden flex items-center justify-center text-lg font-bold shadow-lg"
          aria-label="Cerrar"
        >
          ×
        </button>
      )}

      {/* Encabezado */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2mm' }}>
          {storeInfo.name}
        </div>
        {storeInfo.address && (
          <div style={{ fontSize: '10pt', marginBottom: '1mm' }}>{storeInfo.address}</div>
        )}
        {storeInfo.phone && (
          <div style={{ fontSize: '10pt', marginBottom: '2mm' }}>Tel: {storeInfo.phone}</div>
        )}
        <div style={{ borderBottom: '1px dashed #000', margin: '2mm 0' }}></div>
        <div style={{ fontSize: '10pt', textAlign: 'left', marginTop: '2mm' }}>
          Fecha: {new Date(date).toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        {folio && (
          <div style={{ fontSize: '10pt', textAlign: 'left' }}>Ticket #: {folio.toUpperCase()}</div>
        )}
        {sellerId && (
          <div style={{ fontSize: '10pt', textAlign: 'left' }}>Vendedor: {sellerId}</div>
        )}
        {paymentMethod && (
          <div style={{ fontSize: '10pt', textAlign: 'left' }}>Método: {paymentMethod}</div>
        )}
      </div>

      {/* Lista de Items */}
      <div style={{ marginBottom: '3mm' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '1mm 0', width: '15%' }}>Cant</th>
              <th style={{ textAlign: 'left', padding: '1mm 0', width: '55%' }}>Producto</th>
              <th style={{ textAlign: 'right', padding: '1mm 0', width: '30%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const quantity = item.quantity || item.qty || 1;
              const unitPrice = item.unitPrice || item.price || item.salePrice || 0;
              const lineTotal = unitPrice * quantity;

              return (
                <tr key={index}>
                  <td style={{ padding: '1mm 0', verticalAlign: 'top' }}>
                    {quantity}
                  </td>
                  <td style={{ padding: '1mm 0', verticalAlign: 'top' }}>
                    <div>{item.productName || item.name || item.nombre}</div>
                    {quantity > 1 && (
                      <div style={{ fontSize: '9pt', color: '#000' }}>
                        @ ${unitPrice.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1mm 0', textAlign: 'right', verticalAlign: 'top' }}>
                    ${lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: '2mm', marginBottom: '3mm' }}>
        <table style={{ width: '100%', fontSize: '12pt' }}>
          <tbody>
            <tr style={{ fontWeight: 'bold' }}>
              <td style={{ textAlign: 'left', padding: '1mm 0' }}>TOTAL:</td>
              <td style={{ textAlign: 'right', padding: '1mm 0' }}>${total.toFixed(2)}</td>
            </tr>
            {amountPaid > 0 && (
              <>
                <tr style={{ fontSize: '10pt' }}>
                  <td style={{ textAlign: 'left', padding: '1mm 0' }}>Efectivo/Pago:</td>
                  <td style={{ textAlign: 'right', padding: '1mm 0' }}>${amountPaid.toFixed(2)}</td>
                </tr>
                <tr style={{ fontSize: '10pt' }}>
                  <td style={{ textAlign: 'left', padding: '1mm 0' }}>Cambio:</td>
                  <td style={{ textAlign: 'right', padding: '1mm 0' }}>${change.toFixed(2)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de página */}
      <div style={{ textAlign: 'center', marginTop: '4mm', fontSize: '10pt', borderTop: '1px dashed #000', paddingTop: '2mm' }}>
        <div style={{ marginBottom: '2mm' }}>{footerMessage}</div>
        <div style={{ fontSize: '9pt' }}>Sistema TeikonPOS</div>
      </div>

      {/* Botón de cerrar (solo visible en pantalla, no en impresión) */}
      {onClose && (
        <div className="text-center mt-4 print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold"
          >
            CERRAR
          </button>
        </div>
      )}

      {/* Estilos específicos para impresión térmica */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #printable-ticket,
          #printable-ticket * {
            visibility: visible;
          }
          
          #printable-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
            margin: 0;
            padding: 2mm;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12pt;
            line-height: 1.3;
            color: #000 !important;
            background: #fff !important;
          }
          
          /* Force black text on white background */
          #printable-ticket * {
            color: #000 !important;
            background: transparent !important;
            border-color: #000 !important;
          }
          
          /* Hide screen-only elements */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure tables print correctly */
          table {
            page-break-inside: avoid;
          }
          
          /* Paper cut hint - add page break after ticket */
          #printable-ticket::after {
            content: "";
            display: block;
            page-break-after: always;
          }
        }
        
        /* Screen preview styles */
        @media screen {
          #printable-ticket {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
          }
        }
      `}</style>
    </div>
  );
};
export default SaleTicket;