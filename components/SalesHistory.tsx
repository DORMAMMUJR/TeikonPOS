
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import Modal from './Modal';
import Button from './Button';
import { Search, FileText, XCircle, History as HistoryIcon, CornerUpLeft } from 'lucide-react';

const SalesHistory: React.FC = () => {
  const { sales, cancelSale, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales
    .filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCancel = (saleId: string) => {
    if (confirm('¿CONFIRMAR DEVOLUCIÓN? El dinero se restará de caja y los productos volverán al stock.')) {
      cancelSale(saleId);
      setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-brand-panel p-6 border border-brand-border cut-corner">
        <h2 className="text-xl font-black text-brand-text flex items-center gap-4 uppercase tracking-widest">
          <HistoryIcon className="h-6 w-6" />
          REGISTRO DE OPERACIONES
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted h-4 w-4" />
          <input 
            type="text" 
            placeholder="ID TRANSACCIÓN / FECHA" 
            className="w-full pl-12 pr-4 py-3 bg-brand-bg border border-brand-border cut-corner-sm text-brand-text focus:border-brand-text focus:outline-none text-[10px] font-black uppercase tracking-widest"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-brand-panel border border-brand-border cut-corner overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-brand-text/5">
              <tr>
                <th className="px-6 py-4 text-left text-[8px] font-black text-brand-muted uppercase tracking-widest">CRONOLOGÍA</th>
                <th className="px-6 py-4 text-left text-[8px] font-black text-brand-muted uppercase tracking-widest">ID UNICO</th>
                <th className="px-6 py-4 text-left text-[8px] font-black text-brand-muted uppercase tracking-widest">ITEMS</th>
                <th className="px-6 py-4 text-right text-[8px] font-black text-brand-muted uppercase tracking-widest">TOTAL</th>
                <th className="px-6 py-4 text-center text-[8px] font-black text-brand-muted uppercase tracking-widest">ESTADO</th>
                <th className="px-6 py-4 text-center text-[8px] font-black text-brand-muted uppercase tracking-widest">TICKET</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredSales.map(sale => (
                <tr key={sale.id} className={`transition-all ${sale.status === 'CANCELLED' ? 'opacity-40 grayscale' : 'hover:bg-brand-text/5'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-brand-muted">
                    {new Date(sale.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[10px] font-black text-brand-text font-mono">
                    {sale.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-brand-text uppercase">
                    {sale.items.reduce((acc, item) => acc + item.quantity, 0)} UNIDADES
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-black ${sale.status === 'CANCELLED' ? 'line-through' : 'text-brand-text'}`}>
                    ${sale.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 text-[8px] font-black uppercase cut-corner-sm ${
                      sale.status === 'ACTIVE' 
                        ? 'bg-green-500 text-black' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {sale.status === 'ACTIVE' ? 'OPERATIVO' : 'REEMBOLSADO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button onClick={() => setSelectedSale(sale)} className="text-brand-muted hover:text-brand-text transition-colors">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="DETALLES DE TRANSACCIÓN">
        {selectedSale && (
          <div className="space-y-6">
            <div className="bg-brand-bg p-8 border border-brand-border cut-corner font-mono text-xs space-y-4">
              <div className="text-center border-b border-brand-border pb-4 border-dashed">
                <h3 className="font-black text-lg">TEIKON OS</h3>
                <p className="opacity-50">TICKET: {selectedSale.id.toUpperCase()}</p>
                <p className="opacity-50">{new Date(selectedSale.date).toLocaleString()}</p>
              </div>
              
              <div className="space-y-2">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity} x {item.productName.toUpperCase()}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-border border-dashed pt-4 flex justify-between font-black text-lg">
                <span>TOTAL</span>
                <span className={selectedSale.status === 'CANCELLED' ? 'line-through text-red-500' : ''}>
                  ${selectedSale.total.toFixed(2)}
                </span>
              </div>
              
              <div className="text-center text-[10px] opacity-40 uppercase pt-4">
                MÉTODO: {selectedSale.paymentMethod} | AGENTE: {selectedSale.sellerId.toUpperCase()}
              </div>
            </div>

            <div className="flex gap-4">
                {currentUserRole === 'admin' && selectedSale.status === 'ACTIVE' && (
                  <Button variant="secondary" fullWidth onClick={() => handleCancel(selectedSale.id)} className="border-red-500 text-red-500">
                    <CornerUpLeft className="h-4 w-4 mr-2" /> EJECUTAR DEVOLUCIÓN
                  </Button>
                )}
                <Button variant="primary" fullWidth onClick={() => setSelectedSale(null)}>CERRAR</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesHistory;
