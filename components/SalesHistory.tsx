
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import Modal from './Modal';
import Button from './Button';
import { Search, FileText, History as HistoryIcon, CornerUpLeft, Printer, Share2, Check } from 'lucide-react';
import TeikonWordmark from './TeikonWordmark';

const SalesHistory: React.FC = () => {
  const { sales, cancelSale, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredSales = sales
    .filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCancel = (saleId: string) => {
    if (confirm('¿CONFIRMAR DEVOLUCIÓN? Los productos volverán al stock y el dinero saldrá de caja.')) {
      cancelSale(saleId);
      setSelectedSale(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!selectedSale) return;
    
    const shareText = `Ticket TEIKON #${selectedSale.id.slice(0, 8).toUpperCase()} - Total: $${selectedSale.total.toFixed(2)}\nFecha: ${new Date(selectedSale.date).toLocaleString()}\nAtendido por: ${selectedSale.sellerId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Recibo de Venta TEIKON',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error al compartir:', err);
      }
    } else {
      // Fallback: Copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error al copiar:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-pink-50 dark:bg-pink-950/10 p-8 rounded-3xl border border-pink-100 dark:border-pink-900/30 shadow-sm border-t-4 border-t-brand-pink">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-pink text-white rounded-2xl shadow-lg shadow-brand-pink/20">
            <HistoryIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bitácora Global</h3>
            <p className="text-[10px] text-brand-muted uppercase tracking-widest font-black">Registro cronológico de transacciones</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por ID o Fecha..." 
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:border-brand-pink focus:outline-none text-sm font-bold shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card-premium overflow-hidden border-t-2 border-t-brand-pink/20 shadow-lg">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-pink-50/50 dark:bg-pink-950/20">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Transacción</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Agente</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Total</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-brand-pink dark:text-pink-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredSales.map(sale => (
                <tr key={sale.id} className={`transition-all ${sale.status === 'CANCELLED' ? 'opacity-40' : 'hover:bg-brand-pink/5'}`}>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-brand-muted">
                    {new Date(sale.date).toLocaleString()}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-xs font-black text-slate-800 dark:text-brand-text font-mono">
                    #{sale.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-brand-muted uppercase">
                    {sale.sellerId}
                  </td>
                  <td className={`px-8 py-5 whitespace-nowrap text-lg text-right font-black ${sale.status === 'CANCELLED' ? 'line-through' : 'text-brand-pink'}`}>
                    ${sale.total.toFixed(2)}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${
                      sale.status === 'ACTIVE' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {sale.status === 'ACTIVE' ? 'Aprobada' : 'Devolución'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    <button onClick={() => setSelectedSale(sale)} className="p-2 text-brand-muted hover:text-brand-pink transition-colors">
                      <FileText size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center opacity-30 text-sm font-bold uppercase tracking-widest">Búsqueda sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contenedor invisible para impresión (vía CSS @media print se muestra) */}
      {selectedSale && (
        <div id="printable-ticket-container" className="hidden">
           <div id="printable-ticket" className="p-8 font-mono text-sm space-y-4">
              <div className="text-center border-b border-gray-300 border-dashed pb-4">
                <h1 className="text-xl font-black uppercase">TEIKON</h1>
                <p className="text-[10px] mt-1 uppercase">RECIBO DE VENTA</p>
                <p className="text-[10px] uppercase">ID: {selectedSale.id.toUpperCase()}</p>
                <p className="text-[10px]">{new Date(selectedSale.date).toLocaleString()}</p>
              </div>
              <div className="space-y-2 py-4">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity}x {item.productName.toUpperCase()}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-300 border-dashed pt-4 flex justify-between font-black text-lg">
                <span>TOTAL</span>
                <span>${selectedSale.total.toFixed(2)}</span>
              </div>
              <div className="text-center text-[9px] opacity-60 uppercase pt-4">
                <p>MÉTODO: {selectedSale.paymentMethod}</p>
                <p>ATENDIDO POR: {selectedSale.sellerId.toUpperCase()}</p>
                <p className="mt-2">¡GRACIAS POR SU PREFERENCIA!</p>
              </div>
           </div>
        </div>
      )}

      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="RECIBO DE TRANSACCIÓN">
        {selectedSale && (
          <div className="space-y-8 p-2">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-brand-border font-mono text-sm space-y-6 shadow-inner">
              <div className="text-center border-b border-brand-border border-dashed pb-6">
                <TeikonWordmark height={20} className="mx-auto mb-4 text-slate-900 dark:text-white" />
                <p className="text-xs opacity-50 uppercase tracking-widest text-slate-800 dark:text-white">ID: {selectedSale.id.toUpperCase()}</p>
                <p className="text-xs opacity-50 text-slate-800 dark:text-white">{new Date(selectedSale.date).toLocaleString()}</p>
              </div>
              
              <div className="space-y-3 text-slate-800 dark:text-slate-200">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <span className="flex-1 mr-4">{item.quantity}x {item.productName.toUpperCase()}</span>
                    <span className="font-bold">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-border border-dashed pt-6 flex justify-between font-black text-xl">
                <span className="text-slate-900 dark:text-white">TOTAL</span>
                <span className={selectedSale.status === 'CANCELLED' ? 'line-through text-red-500' : 'text-brand-pink'}>
                  ${selectedSale.total.toFixed(2)}
                </span>
              </div>

              {/* ACTIONS BAR (PRINT & SHARE) */}
              <div className="no-print grid grid-cols-2 gap-4 pt-4 border-t border-brand-border border-dashed">
                <Button 
                  variant="secondary" 
                  fullWidth 
                  className="py-3 text-[10px] flex items-center gap-2 border-slate-200 dark:border-slate-700"
                  onClick={handlePrint}
                >
                  <Printer size={16} /> Imprimir
                </Button>
                <Button 
                  variant="sales" 
                  fullWidth 
                  className="py-3 text-[10px] flex items-center gap-2"
                  onClick={handleShare}
                >
                  {copied ? <Check size={16} /> : <Share2 size={16} />}
                  {copied ? 'Copiado' : 'Compartir'}
                </Button>
              </div>
              
              <div className="text-center text-[10px] opacity-40 uppercase pt-4 space-y-1 text-slate-800 dark:text-white">
                <p>Método de Pago: {selectedSale.paymentMethod}</p>
                <p>Atendido por: {selectedSale.sellerId.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex gap-4 no-print">
                {currentUserRole === 'admin' && selectedSale.status === 'ACTIVE' && (
                  <button onClick={() => handleCancel(selectedSale.id)} className="flex-1 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white">
                    Anular Transacción
                  </button>
                )}
                <Button fullWidth className="rounded-2xl bg-brand-pink text-white border-none py-4" onClick={() => setSelectedSale(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesHistory;
