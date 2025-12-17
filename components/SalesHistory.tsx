import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import Modal from './Modal';
import Button from './Button';
import { Search, FileText, XCircle, Calendar, DollarSign } from 'lucide-react';

const SalesHistory: React.FC = () => {
  const { sales, cancelSale, currentUserRole } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Filter sales reverse chronological
  const filteredSales = sales
    .filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCancel = (saleId: string) => {
    if (confirm('¿Estás seguro de cancelar esta venta? El stock será devuelto.')) {
      cancelSale(saleId);
      setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HistoryIcon className="h-6 w-6 text-purple-500" />
          Historial de Ventas
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por ID o Fecha..." 
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID Venta</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(sale.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                    {sale.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {sale.items.reduce((acc, item) => acc + item.quantity, 0)} productos
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                    ${sale.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      sale.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {sale.status === 'ACTIVE' ? 'Completado' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button variant="ghost" onClick={() => setSelectedSale(sale)}>
                      <FileText className="h-5 w-5 text-blue-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron ventas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Modal */}
      <Modal 
        isOpen={!!selectedSale} 
        onClose={() => setSelectedSale(null)} 
        title="Detalle del Ticket"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 font-mono text-sm">
              <div className="text-center mb-4 border-b border-gray-300 pb-2 border-dashed">
                <h3 className="font-bold text-lg dark:text-white">TeikonPOS</h3>
                <p className="text-gray-500 dark:text-gray-400">Ticket #{selectedSale.id.slice(0, 8)}</p>
                <p className="text-gray-500 dark:text-gray-400">{new Date(selectedSale.date).toLocaleString()}</p>
              </div>
              
              <div className="space-y-2 mb-4">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between dark:text-gray-200">
                    <span>{item.quantity} x {item.productName}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 border-dashed pt-2 space-y-1">
                 <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>${selectedSale.subtotal.toFixed(2)}</span>
                 </div>
                 {selectedSale.totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Descuento</span>
                        <span>-${selectedSale.totalDiscount.toFixed(2)}</span>
                    </div>
                 )}
                 <div className="flex justify-between font-bold text-lg dark:text-white pt-1">
                    <span>TOTAL</span>
                    <span>${selectedSale.total.toFixed(2)}</span>
                 </div>
              </div>
              
              <div className="mt-4 text-center text-xs text-gray-400">
                 Atendido por: {selectedSale.sellerId === 'admin' ? 'Administrador' : 'Vendedor'}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
                {currentUserRole === 'admin' && selectedSale.status === 'ACTIVE' && (
                  <Button variant="danger" onClick={() => handleCancel(selectedSale.id)}>
                    <XCircle className="h-4 w-4 mr-2" /> Cancelar Venta
                  </Button>
                )}
                <Button variant="secondary" onClick={() => window.print()}>
                  Imprimir
                </Button>
                <Button variant="primary" onClick={() => setSelectedSale(null)}>
                  Cerrar
                </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const HistoryIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );

export default SalesHistory;