
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import Modal from './平衡Modal';
import Button from './Button';
import PrintableTicket from './PrintableTicket';
// Added X to the lucide-react import list to fix the compilation error on line 94
import { Search, FileText, History as HistoryIcon, X } from 'lucide-react';

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
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setSelectedSale(sale)} className="p-3 text-brand-muted hover:text-brand-pink transition-colors">
                        <FileText size={20} />
                      </button>
                      {currentUserRole === 'admin' && sale.status === 'ACTIVE' && (
                        <button onClick={() => handleCancel(sale.id)} className="p-3 text-red-400 hover:text-red-600 transition-colors">
                          {/* Fixed: X component is now correctly imported from lucide-react */}
                          <X size={20} className="hidden" /> {/* Para accesibilidad, pero el botón de cancelar está en el flujo de ver ticket usualmente, aquí lo dejamos simple */}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPONENTE DE TICKET UNIFICADO */}
      {selectedSale && (
        <PrintableTicket 
          items={selectedSale.items}
          total={selectedSale.total}
          paymentMethod={selectedSale.paymentMethod}
          sellerId={selectedSale.sellerId}
          folio={selectedSale.id.slice(0, 8)}
          date={new Date(selectedSale.date).toLocaleString()}
          autoPrint={false} // En el historial no se imprime automáticamente
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

export default SalesHistory;
