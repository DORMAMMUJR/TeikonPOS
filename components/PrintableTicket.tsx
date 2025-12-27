
import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';

interface PrintableTicketProps {
  items: any[];
  total: number;
  paymentMethod: string;
  sellerId: string;
  folio?: string;
  date?: string;
  autoPrint?: boolean;
  onClose: () => void;
}

const PrintableTicket: React.FC<PrintableTicketProps> = ({ 
  items, 
  total, 
  paymentMethod, 
  sellerId, 
  folio = "N/A", 
  date,
  autoPrint = true,
  onClose 
}) => {

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const displayDate = date || new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md no-print">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Visual Preview on Screen */}
      <div className="relative bg-white w-full max-w-xs p-8 shadow-2xl rounded-sm font-mono text-black overflow-hidden animate-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-6 border-b border-dashed border-black pb-6 text-center">
          <TeikonLogo size={48} className="mb-3" />
          <TeikonWordmark height={16} className="text-black" />
          <p className="text-[10px] mt-3 font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5">Comprobante de Pago</p>
          <p className="text-[9px] mt-2 font-black">FOLIO: {folio.toUpperCase()}</p>
          <p className="text-[9px] opacity-70">{displayDate}</p>
        </div>

        <div className="space-y-2 mb-6 text-[10px]">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <span className="flex-1">{item.quantity}x {item.name || item.productName}</span>
              <span className="font-bold">${(item.subtotal || (item.sellingPrice * item.quantity)).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black border-dashed pt-4 flex justify-between font-black text-base mb-6">
          <span>TOTAL</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <div className="text-center text-[8px] space-y-1 opacity-70 border-t border-black border-dotted pt-4 mb-8">
          <p>MÉTODO DE PAGO: {paymentMethod}</p>
          <p>ATENDIDO POR: {sellerId.toUpperCase()}</p>
          <p className="mt-4 font-bold tracking-widest">¡GRACIAS POR SU PREFERENCIA!</p>
          <p>WWW.TEIKON.COM</p>
        </div>

        <div className="flex flex-col gap-3 no-print">
          <button 
            onClick={handlePrint}
            className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <Printer size={16} /> Imprimir Ticket
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
          >
            <X size={16} /> Cerrar
          </button>
        </div>
      </div>

      {/* ACTUAL PRINTABLE TARGET (Oculto en pantalla, visible en papel) */}
      <div id="printable-ticket" className="hidden print:block bg-white text-black font-mono">
         <div className="flex flex-col items-center mb-4 border-b border-black border-dashed pb-4 text-center">
            <div className="mb-2 grayscale contrast-200 brightness-75">
                <TeikonLogo size={60} />
            </div>
            <TeikonWordmark height={20} className="text-black" />
            <p className="text-[12px] mt-2 font-bold uppercase">Ticket de Venta</p>
            <p className="text-[10px] mt-1 font-black">FOLIO: {folio.toUpperCase()}</p>
            <p className="text-[10px]">{displayDate}</p>
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
            <p className="mt-2 uppercase">¡Vuelva Pronto!</p>
          </div>
      </div>
    </div>
  );
};

export default PrintableTicket;
