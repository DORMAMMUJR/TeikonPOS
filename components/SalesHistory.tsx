
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import Modal from './Modal';
import Button from './Button';
import { Search, FileText, History as HistoryIcon, CornerUpLeft } from 'lucide-react';
import TeikonWordmark from './TeikonWordmark';

const SalesHistory: React.FC = () => {
  const { sales, cancelSale, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales
    .filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCancel = (saleId: string) => {
    if (confirm('¿CONFIRMAR DEVOLUCIÓN? Los productos volverán al stock y el dinero saldrá de caja.')) {
      cancelSale(saleId);
      setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/30 p-8 rounded-3xl border border-brand-border shadow-sm">
        <div className="flex items-center gap-4">
          <HistoryIcon className="h-8 w-8 text-brand-pink" />
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bitácora Global</h3>
            <p className="text-[10px] text-brand-muted uppercase tracking-widest font-black">Registro cronológico de transacciones</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted h-5 w-5" />
          <input 
            type="text" 
            placeholder="Buscar por ID o Fecha..." 
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:border-brand-pink focus:outline-none text-sm font-bold shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-slate-50 dark:bg-slate-900/80">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Transacción</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-brand-muted uppercase tracking-widest">Agente</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-brand-muted uppercase tracking-widest">Total</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-brand-muted uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-center text-[10px] font-black text-brand-muted uppercase tracking-widest">Acción</th>
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
              
              <div className="text-center text-[10px] opacity-40 uppercase pt-4 space-y-1 text-slate-800 dark:text-white">
                <p>Método de Pago: {selectedSale.paymentMethod}</p>
                <p>Atendido por: {selectedSale.sellerId.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex gap-4">
                {currentUserRole === 'admin' && selectedSale.status === 'ACTIVE' && (
                  <Button variant="secondary" fullWidth onClick={() => handleCancel(selectedSale.id)} className="rounded-2xl border-red-500/50 text-red-500 hover:bg-red-500">
                    <CornerUpLeft className="h-4 w-4 mr-2" /> Anular Transacción
                  </Button>
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
