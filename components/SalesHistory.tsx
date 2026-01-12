import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, Printer, X, Calendar, FileText, History as HistoryIcon } from 'lucide-react';
import { Modal, Button, TeikonWordmark } from '../src/components/ui';
import { SaleTicket } from './SaleTicket';
import { Sale } from '../types';
import { isTokenValid, salesAPI } from '../utils/api';
import { Share2, Check } from 'lucide-react'; // Adding missing icons

interface SalesHistoryProps {
  targetStoreId?: string; // IMPROVED: Add prop for AdminPanel filtering
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ targetStoreId }) => {
  const { sales: contextSales, cancelSale, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [copied, setCopied] = useState(false);

  // IMPROVED: Local state for store-specific sales
  const [storeSales, setStoreSales] = useState<Sale[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  // IMPROVED: Fetch sales for specific store when targetStoreId is provided
  useEffect(() => {
    if (targetStoreId) {
      const fetchStoreSales = async () => {
        setIsLoadingStore(true);
        try {
          console.log(`📊 Fetching sales for store: ${targetStoreId}`);
          const fetchedSales = await salesAPI.getAll({ storeId: targetStoreId });
          setStoreSales(fetchedSales);
          console.log(`✅ Loaded ${fetchedSales.length} sales for store`);
        } catch (error) {
          console.error('Error fetching store sales:', error);
          setStoreSales([]);
        } finally {
          setIsLoadingStore(false);
        }
      };

      fetchStoreSales();
    }
  }, [targetStoreId]);

  // Use store-specific sales if targetStoreId is provided, otherwise use context sales
  const sales = targetStoreId ? storeSales : contextSales;

  const filteredSales = sales
    .filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm);
      if (!matchesSearch) return false;

      if (showTodayOnly) {
        const saleDate = new Date(s.date).toLocaleDateString();
        const today = new Date().toLocaleDateString();
        return saleDate === today;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCancel = (saleId: string) => {
    if (confirm('¿CONFIRMAR DEVOLUCIÓN? Los productos volverán al stock y el dinero saldrá de caja.')) {
      cancelSale(saleId);
      setSelectedSale(null);
    }
  };

  const handleShare = async () => {
    if (!selectedSale) return;

    const shareText = `Ticket TEIKON #${selectedSale.id.slice(0, 8).toUpperCase()} - Total: $${selectedSale.total.toFixed(2)}\nFecha: ${new Date(selectedSale.date).toLocaleString()}\nAtendido por: ${selectedSale.sellerId}`;

    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: 'Recibo de Venta TEIKON',
          text: shareText,
        };

        const currentUrl = window.location.href;
        if (currentUrl.startsWith('http')) {
          shareData.url = currentUrl;
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error('Error al compartir:', err);
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const handlePrint = (sale: Sale) => {
    // Validate session before printing to prevent blank tickets
    if (!isTokenValid()) {
      alert('⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente para imprimir tickets.');
      window.location.href = '/login';
      return;
    }

    // Session is valid, proceed with printing
    setSelectedSale(sale);
    setTimeout(() => window.print(), 500);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
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
            <p className="text-[10px] text-brand-muted uppercase tracking-widest font-black">
              {showTodayOnly ? 'Transacciones de HOY' : 'Historial Completo'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <Button
            variant={showTodayOnly ? "primary" : "secondary"}
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            className="text-xs h-12 whitespace-nowrap px-6"
          >
            {showTodayOnly ? 'VER TODO EL HISTORIAL' : 'VER SOLO HOY'}
          </Button>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-pink h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por ID o Fecha..."
              className="w-full pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:border-brand-pink focus:outline-none text-sm font-bold shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-premium overflow-x-auto md:overflow-visible border-t-2 border-t-brand-pink/20 shadow-lg">
        <div className="table-scroll-container">
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
                    ${sale.total.toLocaleString()}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${sale.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-red-500/10 text-red-500'
                      }`}>
                      {sale.status === 'ACTIVE' ? 'Aprobada' : 'Devolución'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="secondary"

                        onClick={() => setSelectedSale(sale)}
                        className="h-8 text-[10px]"
                      >
                        <FileText size={14} className="mr-1" />
                        DETALLES
                      </Button>
                      <Button
                        variant="primary"

                        onClick={() => handlePrint(sale)}
                        className="h-8 text-[10px] bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <Printer size={14} className="mr-1" />
                        IMPRIMIR
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="p-8 text-center text-brand-muted font-bold text-sm">
              No hay transacciones {showTodayOnly ? 'para el día de hoy' : 'que coincidan con la búsqueda'}.
            </div>
          )}
        </div>
      </div>

      {selectedSale && (
        <SaleTicket
          items={selectedSale.items}
          total={selectedSale.total}
          paymentMethod={selectedSale.paymentMethod}
          sellerId={selectedSale.sellerId}
          folio={selectedSale.id.slice(0, 8)}
          date={selectedSale.date}
          onClose={() => setSelectedSale(null)}
          storeInfo={{
            name: currentUser?.storeName || "TEIKON OS TERMINAL",
            address: "NODO OPERATIVO ACTIVO",
            phone: currentUser?.phone || "N/A"
          }}
        />
      )}
    </div>
  );
};

export default SalesHistory;
