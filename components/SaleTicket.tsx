import React, { useEffect, useState, useRef } from 'react';
import { salesAPI } from '../utils/api';

// Configuración de estilo encapsulada para asegurar consistencia
const TICKET_WIDTH = '58mm';
const FONT_FAMILY = 'monospace';
const FONT_SIZE = '11px';

// Separador de texto como solicitado
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
  sellerId?: string;
  onClose?: () => void;
  shouldAutoPrint?: boolean;
  hideControls?: boolean; // Controles internos (cerrar)
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

  // Lógica de carga de datos (mantenida del original)
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
  const sellerId = propSellerId || fetchedSale?.vendedor || fetchedSale?.sellerId;
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
    const isPreviewMode = onClose && !shouldAutoPrint;

    const shouldTriggerPrint =
      (isPOSMode || isPrintMode) &&
      !isLoading &&
      !error &&
      !hasPrintedRef.current &&
      items.length > 0 &&
      total > 0;

    if (shouldTriggerPrint) {
      hasPrintedRef.current = true;
      setTimeout(() => window.print(), 500); // Pequeño delay para asegurar renderizado
    }
  }, [onClose, shouldAutoPrint, isLoading, error, items.length, total]);

  // Reset del ref al desmontar
  useEffect(() => {
    return () => { hasPrintedRef.current = false; };
  }, [saleId]);

  // Renderizado de carga y error simplificado pero visual
  if (isLoading) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px', textAlign: 'center' }}>Cargando ticket...</div>;
  if (error) return <div style={{ fontFamily: FONT_FAMILY, padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;

  return (
    <>
      <style>{`
        /* Estilos base para el ticket */
        .thermal-ticket {
          width: ${TICKET_WIDTH};
          max-width: ${TICKET_WIDTH};
          font-family: ${FONT_FAMILY};
          font-size: ${FONT_SIZE};
          line-height: 1.2;
          color: black;
          background: white;
          padding: 5px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* Utilidades simples */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { fontWeight: bold; }
        .flex-between { display: flex; justify-content: space-between; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }

        /* Estilos de impresión */
        @media print {
          @page {
            margin: 0;
            size: auto; /* Permite longitud variable */
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }
          body * {
            visibility: hidden;
          }
          .thermal-ticket, .thermal-ticket * {
            visibility: visible;
          }
          .thermal-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: ${TICKET_WIDTH};
            margin: 0;
            padding: 0;
            box-shadow: none;
            overflow: visible;
          }
          .no-print {
            display: none !important;
          }
        }
        
        /* Estilos visuales en pantalla */
        @media screen {
          .thermal-ticket {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin-top: 20px;
            margin-bottom: 20px;
          }
        }
      `}</style>

      {/* Botón de cerrar para pantalla */}
      {onClose && !hideControls && (
        <div className="no-print" style={{ textAlign: 'center', marginBottom: '10px' }}>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'sans-serif',
              fontWeight: 'bold'
            }}
          >
            CERRAR
          </button>
        </div>
      )}

      <div className="thermal-ticket">
        {/* 1. Nombre de la tienda */}
        <div className="text-center font-bold mb-1" style={{ fontSize: '13px' }}>
          {storeInfo.name}
        </div>

        {/* 2. Dirección / Teléfono */}
        <div className="text-center mb-1">
          {storeInfo.address && <div>{storeInfo.address}</div>}
          {storeInfo.phone && <div>Tel: {storeInfo.phone}</div>}
        </div>

        {/* 3. Línea separadora */}
        <Separator />

        {/* 4. Fecha y hora */}
        <div className="mb-1">
          <div>Fecha: {new Date(date).toLocaleString('es-MX')}</div>
          {folio && <div>Folio: {folio}</div>}
          {sellerId && <div>Le atendió: {sellerId}</div>}
        </div>

        <Separator />

        {/* 5. Lista de productos */}
        <div className="mb-1">
          {items.length === 0 ? (
            <div className="text-center">-- Sin productos --</div>
          ) : (
            items.map((item: any, i: number) => {
              const quantity = item.quantity || item.qty || 1;
              const unitPrice = item.unitPrice || item.price || item.salePrice || 0;
              const itemTotal = unitPrice * quantity;

              return (
                <div key={i} style={{ marginBottom: '6px' }}>
                  {/* Nombre del producto */}
                  <div className="text-left">{item.productName || item.name || item.nombre}</div>

                  {/* Detalles en segunda línea para asegurar espacio */}
                  <div className="flex-between">
                    <span>{quantity} x ${formatMoney(unitPrice)}</span>
                    <span className="font-bold">${formatMoney(itemTotal)}</span>
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
          <div className="flex-between font-bold" style={{ fontSize: '14px' }}>
            <span>TOTAL:</span>
            <span>${formatMoney(total)}</span>
          </div>

          {amountPaid > 0 && (
            <>
              <div className="flex-between mt-1">
                <span>Efectivo:</span>
                <span>${formatMoney(amountPaid)}</span>
              </div>
              <div className="flex-between">
                <span>Cambio:</span>
                <span>${formatMoney(change)}</span>
              </div>
            </>
          )}

          {/* Método de pago si existe */}
          {paymentMethod && (
            <div className="text-left" style={{ marginTop: '4px' }}>
              Forma de Pago: {paymentMethod}
            </div>
          )}
        </div>

        <Separator />

        {/* 10. Mensaje final */}
        <div className="text-center" style={{ marginTop: '4px' }}>
          <div>{footerMessage}</div>
          <div style={{ fontSize: '9px', marginTop: '4px' }}>** Gracias por su preferencia **</div>
        </div>
      </div>
    </>
  );
};

export default SaleTicket;