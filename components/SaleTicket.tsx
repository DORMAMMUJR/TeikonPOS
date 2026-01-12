import React, { useEffect } from 'react';

// Si tienes el logo, descomenta la siguiente línea. Si no, déjala comentada.
// import { TeikonLogo } from './ui';

interface SaleTicketProps {
  items: any[]; // Puedes cambiar 'any' por tu tipo 'Product' si lo prefieres
  total: number;
  amountPaid?: number;
  change?: number;
  date: string;
  storeInfo: {
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
  items,
  total,
  amountPaid = 0,
  change = 0,
  date,
  storeInfo,
  footerMessage = "¡Gracias por su compra!",
  folio,
  paymentMethod,
  sellerId,
  onClose
}) => {

  // Auto-imprimir solo cuando se solicita desde POS, no desde Historial
  useEffect(() => {
    // Solo auto-imprimir si no hay función onClose (modo POS)
    // Si hay onClose, es modo vista previa (Historial)
    if (!onClose) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  return (
    <div id="printable-ticket" className="p-4 bg-white text-black font-mono text-sm max-w-[300px] mx-auto relative">
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
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold uppercase">{storeInfo.name}</h2>
        {storeInfo.address && <p className="text-xs mt-1">{storeInfo.address}</p>}
        {storeInfo.phone && <p className="text-xs">Tel: {storeInfo.phone}</p>}
        <div className="border-b-2 border-dashed border-black my-2"></div>
        <p className="text-xs text-left">Fecha: {date}</p>
        {folio && <p className="text-xs text-left">Ticket #: {folio}</p>}
        {sellerId && <p className="text-xs text-left">Vendedor: {sellerId}</p>}
        {paymentMethod && <p className="text-xs text-left">Método: {paymentMethod}</p>}
      </div>

      {/* Lista de Items */}
      <div className="mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Cant.</th>
              <th className="text-left py-1">Prod.</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="py-1 w-8 align-top">
                  {/* Manejo seguro de cantidad */}
                  {item.quantity || item.qty || 1}
                </td>
                <td className="py-1 align-top">
                  {/* Handle both productName (SaleDetail) and name (CartItem) */}
                  {item.productName || item.name}
                  {/* Si hay precio unitario diferente al total */}
                  {(item.quantity > 1) && (
                    <div className="text-[10px] text-gray-500">
                      {/* Handle both unitPrice (SaleDetail) and price/salePrice (CartItem) */}
                      @ ${item.unitPrice || item.price || item.salePrice || 0}
                    </div>
                  )}
                </td>
                <td className="py-1 text-right align-top">
                  {/* Safe calculation with fallback to 0 */}
                  ${((item.unitPrice || item.price || item.salePrice || 0) * (item.quantity || item.qty || 1)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="border-t-2 border-dashed border-black pt-2 space-y-1">
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)}</span>
        </div>
        {amountPaid > 0 && (
          <>
            <div className="flex justify-between text-xs">
              <span>Efectivo/Pago:</span>
              <span>${amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Cambio:</span>
              <span>${change.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Pie de página */}
      <div className="text-center mt-6 text-xs">
        <p>{footerMessage}</p>
        <p className="mt-2 text-[10px] text-gray-400">Sistema TeikonPOS</p>
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

      {/* Estilos específicos para impresión */}
      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body * { visibility: hidden; }
          #printable-ticket, #printable-ticket * { visibility: visible; }
          #printable-ticket { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 10px; }
        }
      `}</style>
    </div>
  );
};
export default SaleTicket;