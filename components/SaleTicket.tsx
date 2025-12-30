
import React, { useEffect } from 'react';
import { SaleDetail } from '../types';
import TeikonLogo from './TeikonLogo';

interface SaleTicketProps {
  items: any[];
  total: number;
  paymentMethod: string;
  sellerId: string;
  folio: string;
  date?: string;
  onClose: () => void;
  storeInfo?: {
    name: string;
    address: string;
    phone: string;
  };
  footerMessage?: string;
}

const SaleTicket: React.FC<SaleTicketProps> = ({
  items,
  total,
  paymentMethod,
  sellerId,
  folio,
  date,
  onClose,
  storeInfo = {
    name: "TEIKON CONCEPT STORE",
    address: "AV. INNOVACIÓN 1024, CDMX",
    phone: "55-1234-5678"
  },
  footerMessage = "¡GRACIAS POR SU PREFERENCIA!"
}) => {

  const ticketDate = date ? new Date(date) : new Date();

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    // Pequeño delay para asegurar que los estilos de impresión se carguen
    const timer = setTimeout(() => {
      // Opcional: imprimir automáticamente si se desea
      // window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md no-print">
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Visual Preview Container */}
      <div className="relative bg-white w-full max-w-[320px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 rounded-sm">

        {/* ÁREA DE IMPRESIÓN (ID: printable-ticket usado en index.html) */}
        <div id="printable-ticket" className="bg-white p-6 font-mono text-black leading-tight">

          {/* ENCABEZADO */}
          <div className="text-center mb-4 space-y-1">
            <div className="flex justify-center mb-2 grayscale">
              <TeikonLogo size={50} />
            </div>
            <h1 className="text-sm font-black uppercase tracking-tighter">{storeInfo.name}</h1>
            <p className="text-[9px] uppercase">{storeInfo.address}</p>
            <p className="text-[9px]">TEL: {storeInfo.phone}</p>
          </div>

          <div className="text-[10px] border-y border-black border-dashed py-2 my-3 space-y-1">
            <div className="flex justify-between">
              <span>FOLIO:</span>
              <span className="font-bold">{folio.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA:</span>
              <span>{ticketDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>HORA:</span>
              <span>{ticketDate.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* CUERPO - TABLA DE PRODUCTOS */}
          <div className="text-[10px] mb-4">
            <div className="flex justify-between font-bold border-b border-black border-dotted pb-1 mb-2">
              <span className="w-8">CANT</span>
              <span className="flex-1 px-2">DESCRIPCIÓN</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <span className="w-8">{item.quantity || item.cantidad}</span>
                  <span className="flex-1 px-2 uppercase truncate">{item.name || item.nombre || item.productName}</span>
                  <span className="w-16 text-right">${(item.subtotal || ((item.sellingPrice || item.unitPrice) * (item.quantity || item.cantidad))).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TOTALES */}
          <div className="border-t border-black border-dashed pt-3 space-y-1">
            <div className="flex justify-between text-[10px]">
              <span>SUBTOTAL:</span>
              <span>${(total * 0.84).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>IVA (16%):</span>
              <span>${(total * 0.16).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black border-dotted mt-1">
              <span>TOTAL:</span>
              <span>${total.toLocaleString()}</span>
            </div>
            <div className="text-[9px] pt-2 italic">
              PAGO: {paymentMethod === 'CASH' ? 'EFECTIVO' : paymentMethod}
            </div>
          </div>

          {/* PIE DE TICKET */}
          <div className="text-center mt-6 pt-4 border-t border-black border-dashed space-y-3">
            <p className="text-[10px] font-bold leading-tight">{footerMessage}</p>

            {/* Simulación de QR Digital */}
            <div className="flex flex-col items-center gap-1 opacity-80">
              <div className="w-16 h-16 border-2 border-black p-1">
                <svg viewBox="0 0 100 100" fill="black">
                  <path d="M0 0h30v30H0zM0 70h30v30H0zM70 0h30v30H70zM10 10h10v10H10zM10 80h10v10H10zM80 10h10v10H80z" />
                  <path d="M40 0h10v10H40zM50 10h10v10H50zM40 20h20v10H40zM0 40h10v20H0zM20 40h10v10H20zM10 50h20v10H10zM40 40h10v10H40zM50 50h10v10H50zM40 60h20v10H40zM70 40h10v10H70zM80 50h20v10H80zM70 60h10v10H70zM0 70h10v10H0zM40 80h10v10H40zM50 70h10v10H50zM40 70h10v10H40zM70 70h30v10H70zM80 80h10v10H80zM70 90h10v10H70z" />
                </svg>
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest">Ticket Digital Verified</span>
            </div>

            <p className="text-[8px] opacity-40 uppercase tracking-tighter">Atendido por: {sellerId}</p>
          </div>
        </div>

        {/* CONTROLES DE PANTALLA (No se imprimen) */}
        <div className="flex gap-1 p-4 bg-slate-50 border-t border-slate-100 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors active:scale-95"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10"
          >
            Imprimir Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleTicket;
