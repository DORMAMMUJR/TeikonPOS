
import React, { useEffect } from 'react';
import { SaleDetail } from '../types';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';

interface PrintableTicketProps {
  items: any[];
  total: number;
  paymentMethod: string;
  sellerId: string;
  folio?: string;
  onClose: () => void;
}

const PrintableTicket: React.FC<PrintableTicketProps> = ({ 
  items, 
  total, 
  paymentMethod, 
  sellerId, 
  folio = "N/A", 
  onClose 
}) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md no-print">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Visual Preview on Screen */}
      <div className="relative bg-white w-full max-w-xs p-6 shadow-2xl rounded-sm font-mono text-black overflow-hidden animate-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-4 border-b border-dashed border-black pb-4 text-center">
          <TeikonLogo size={40} className="mb-2" />
          <TeikonWordmark height={14} className="text-black" />
          <p className="text-[10px] mt-2 font-bold uppercase tracking-widest">Comprobante de Pago</p>
          <p className="text-[9px] mt-1 opacity-70">FOLIO: {folio.toUpperCase()}</p>
          <p className="text-[9px] opacity-70">{new Date().toLocaleString()}</p>
        </div>

        <div className="space-y-2 mb-4 text-[10px]">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <span className="flex-1">{item.quantity}x {item.name || item.productName}</span>
              <span className="font-bold">${(item.subtotal || (item.sellingPrice * item.quantity)).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black border-dashed pt-3 flex justify-between font-black text-sm mb-4">
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <div className="text-center text-[8px] space-y-1 opacity-70 border-t border-black border-dotted pt-4">
          <p>MÉTODO: {paymentMethod}</p>
          <p>CAJERO: {sellerId.toUpperCase()}</p>
          <p className="mt-4 font-bold tracking-widest">¡GRACIAS POR SU COMPRA!</p>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest no-print hover:bg-slate-800 transition-colors"
        >
          Cerrar Recibo
        </button>
      </div>

      {/* ACTUAL PRINTABLE TARGET (ID: printable-ticket) */}
      <div id="printable-ticket" className="hidden print:block bg-white text-black font-mono">
         <div className="flex flex-col items-center mb-4 border-b border-dashed border-black pb-4 text-center">
            <div className="mb-2 grayscale contrast-200">
                {/* SVG Logo for thermal printers (high contrast) */}
                <TeikonLogo size={60} />
            </div>
            <TeikonWordmark height={20} className="text-black" />
            <p className="text-[12px] mt-2 font-bold uppercase">Ticket de Venta</p>
            <p className="text-[10px] mt-1">FOLIO: {folio.toUpperCase()}</p>
            <p className="text-[10px]">{new Date().toLocaleString()}</p>
          </div>

          <div className="space-y-1 mb-4 text-[11px]">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span className="flex-1">{item.quantity}x {(item.name || item.productName).toUpperCase()}</span>
                <span>${(item.subtotal || (item.sellingPrice * item.quantity)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-y border-black border-dashed py-2 flex justify-between font-black text-[14px] my-4">
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="text-center text-[10px] space-y-1 mt-6">
            <p>PAGO: {paymentMethod}</p>
            <p>LO ATENDIÓ: {sellerId.toUpperCase()}</p>
            <p className="mt-8 font-bold">WWW.TEIKON.COM</p>
            <p className="mt-2">¡VUELVA PRONTO!</p>
          </div>
      </div>
    </div>
  );
};

export default PrintableTicket;
