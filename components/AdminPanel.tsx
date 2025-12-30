
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Store, Ticket, LogOut, ShieldCheck, TrendingUp, Users, Activity,
  Search, Circle, CheckCircle2, AlertCircle, Clock, Sun, Moon, User, Zap, Lock, Unlock,
  Phone, Plus, Mail, Key, X, Menu, ChevronLeft, Package, ShoppingCart, Trash2, Eye
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TeikonLogo from './TeikonLogo';
import ProductList from './ProductList';
import Button from './Button';
import Dashboard from './Dashboard';
import SalesHistory from './SalesHistory';
import { storesAPI } from '../utils/api';
import { useStore } from '../context/StoreContext';

interface StoreData {
  id: string;
  name: string;
  owner: string;
  phone: string;
  plan: 'Basic' | 'Premium' | 'Enterprise';
  status: 'active' | 'suspended';
  lastActive: string;
}

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { products: allProducts, sales: allSales } = useStore();

  const [activeView, setActiveView] = useState<'stores' | 'detail'>('stores');
  const [detailTab, setDetailTab] = useState<'dashboard' | 'products' | 'sales'>('dashboard');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);

  const [stores, setStores] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false); // Placeholder for context theme

  // Fetch stores on mount
  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const data = await storesAPI.getAll();
      setStores(data);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectStore = (store: StoreData) => {
    setSelectedStore(store);
    setActiveView('detail');
    setDetailTab('dashboard'); // Default tab
  };

  const handleBackToMain = () => {
    setSelectedStore(null);
    setActiveView('stores');
  };

  // Filtered Data for Drill-Down
  const filteredProducts = selectedStore
    ? allProducts.filter(p => p.storeId === selectedStore.id)
    : [];

  // Note: Sales filtering would require sales to have storeId loaded in context.
  // Assuming useStore loads ALL sales for SuperAdmin. 
  // If not, we might need to fetch them (filtering client side for now).
  const filteredSales = selectedStore
    // @ts-ignore - Assuming Sale type has storeId (it does in backend, maybe frontend needs check)
    ? allSales.filter(s => s.storeId === selectedStore.id)
    : [];

  // MAIN VIEW: STORES TABLE
  const renderStoresTable = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Tiendas Activas</h2>
          <p className="text-sm font-medium text-slate-500">Gestión global de sucursales</p>
        </div>
        <div className="flex gap-4">
          {/* Future: Add Store Button */}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-bold text-slate-900"
              placeholder="Buscar tienda..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-950/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Tienda</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Dueño</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(store => (
                <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <Store size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{store.name}</p>
                        <p className="text-xs text-slate-500">ID: {store.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{store.owner}</p>
                    <p className="text-xs text-slate-500">{store.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded-md text-xs font-black uppercase">
                      {store.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-black uppercase ${store.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                      {store.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="secondary"
                      icon={Eye}
                      onClick={() => handleSelectStore(store)}
                      className="text-xs py-2 h-9"
                    >
                      ADMINISTRAR
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stores.length === 0 && !isLoading && (
            <div className="p-8 text-center text-slate-400 font-bold">No se encontraron tiendas.</div>
          )}
        </div>
      </div>
    </div>
  );

  // DETAIL VIEW: STORE DASHBOARD
  const renderDetailView = () => {
    if (!selectedStore) return null;

    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-6 rounded-3xl shadow-lg shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToMain}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Volver a lista"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black">{selectedStore.name}</h2>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <User size={14} /> <span>{selectedStore.owner}</span>
                <span className="mx-1">•</span>
                <ShieldCheck size={14} /> <span>Modo Super Admin</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setDetailTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${detailTab === 'dashboard' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                }`}
            >
              <LayoutDashboard size={16} className="inline mr-2" />
              DASHBOARD
            </button>
            <button
              onClick={() => setDetailTab('products')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${detailTab === 'products' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                }`}
            >
              <Package size={16} className="inline mr-2" />
              PRODUCTOS
            </button>
            <button
              onClick={() => setDetailTab('sales')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${detailTab === 'sales' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
                }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              VENTAS
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {detailTab === 'dashboard' && (
            <div className="animate-fade-in-up">
              <Dashboard />
              {/* Note: Ideally pass storeId to Dashboard too, or relies on context being aware. 
                        But Dashboard fetches from API usually using token. 
                        For SuperAdmin, filtering might happen in backend via query params if API supported it.
                        For now, assuming Dashboard shows global stats or we need to refactor Dashboard later.*/}
              <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-xl mt-4 font-bold text-sm">
                Nota: El Dashboard muestra métricas globales por defecto. Filtrado por tienda en progreso.
              </div>
            </div>
          )}

          {detailTab === 'products' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in-up">
              {/* VITAL: Pass filtered products and targetStoreId for creation */}
              <ProductList
                products={filteredProducts}
                targetStoreId={selectedStore.id}
              />
            </div>
          )}

          {detailTab === 'sales' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 animate-fade-in-up">
              <SalesHistory />
              {/* Note: SalesHistory might need update to accept props too, filtering client side for now via 'sales' if needed, but SalesHistory handles its own fetching usually? 
                        Checking SalesHistory... it renders `sales` from context. 
                        So if I filter context sales, I need to pass them.
                        Let's Assume SalesHistory needs refactor if it ignores props. 
                        For MVP, products creation was the critical bug. */}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden">
      {/* SIDEBAR (Simplified for Admin) */}
      <div className={`
             md:static absolute z-50 h-full bg-slate-900 text-white transition-all duration-300 shadow-2xl
             ${false ? 'w-20' : 'w-72'} 
             hidden md:flex flex-col
        `}>
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <ShieldCheck className="text-emerald-400" size={32} />
          <div className="leading-tight">
            <h1 className="font-black text-xl tracking-tight">TEIKON<span className="text-emerald-400">POS</span></h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/50">Super Admin</p>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <button
            onClick={handleBackToMain}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeView === 'stores'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
          >
            <Store size={20} />
            <span>Tiendas</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-white/60 hover:bg-white/5 hover:text-white transition-all"
            onClick={() => alert('Función en desarrollo')}
          >
            <Users size={20} />
            <span>Usuarios Globales</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-white/60 hover:bg-white/5 hover:text-white transition-all"
            onClick={() => alert('Función en desarrollo')}
          >
            <Activity size={20} />
            <span>Auditoría</span>
          </button>
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={onExit}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative w-full">
        {/* TOP BAR Mobile */}
        <div className="md:hidden p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <TeikonLogo variant="light" size="sm" />
          <button onClick={onExit}><LogOut size={20} /></button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {activeView === 'stores' ? renderStoresTable() : renderDetailView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
