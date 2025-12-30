
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
import SettingsMenu from './SettingsMenu';
import StoreOperations from './StoreOperations';
import { storesAPI, clearAuthToken } from '../utils/api';
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

  const [activeView, setActiveView] = useState<'stores' | 'detail' | 'tickets'>('stores');
  const [detailTab, setDetailTab] = useState<'dashboard' | 'products' | 'sales' | 'operations'>('dashboard');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);

  // Placeholder for ticket data (replace with API call later)
  const [tickets, setTickets] = useState<any[]>([]);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreData, setNewStoreData] = useState({ name: '', email: '', password: '', phone: '' });

  const [stores, setStores] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false); // Placeholder for context theme

  // Fetch stores on mount
  useEffect(() => {
    fetchStores();
    fetchTickets();
  }, [activeView]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const data = await storesAPI.getAll();
      setStores(data);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    // Mock API call or real one if util exists. For now using direct fetch to existing endpoint
    try {
      const token = localStorage.getItem('token');
      // In React dev environment simple fetch
      const res = await fetch('http://localhost:5000/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Error loading tickets", err);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/stores/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: newStoreData.name,
          usuario: newStoreData.email, // Using email as username for now
          password: newStoreData.password,
          telefono: newStoreData.phone,
          direccion: 'N/A'
        })
      });

      if (!res.ok) throw new Error(await res.text());

      alert('Tienda creada exitosamente');
      setIsStoreModalOpen(false);
      setNewStoreData({ name: '', email: '', password: '', phone: '' });
      fetchStores();
    } catch (error: any) {
      alert('Error al crear tienda: ' + error.message);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    onExit();
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

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'}`}>

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <TeikonLogo size={32} className="text-white" />
          <div>
            <h1 className="font-black tracking-tighter text-lg">TEIKON OS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Plataforma</div>

          <button
            onClick={() => { setActiveView('stores'); setSelectedStore(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeView === 'stores' && !selectedStore ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Store size={18} />
            TIENDAS ACTIVAS
          </button>

          <button
            onClick={() => { setActiveView('tickets'); setSelectedStore(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeView === 'tickets' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Ticket size={18} />
            TICKETS SOPORTE
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={18} />
            MONITOREO DE SERVIDOR
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <Users size={18} />
            GESTIÓN DE USUARIOS
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onExit} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} />
            CERRAR SESIÓN MAESTRA
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8 relative overflow-y-auto h-screen">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {selectedStore ? `Gestionando: ${selectedStore.name}` : (activeView === 'stores' ? 'Panel de Control Principal' : 'Centro de Soporte')}
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1">
              Bienvenido, <span className="text-emerald-500">Dragn</span>. Sistema operando al 100%.
            </p>
          </div>
          <div className="flex items-center gap-4">
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
          <button
            onClick={() => setDetailTab('operations')}
            className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${detailTab === 'operations' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
              }`}
          >
            <Zap size={16} className="inline mr-2" />
            OPERACIONES
          </button>
        </div>
    </div>

        {/* CONTENT */ }
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

    {detailTab === 'operations' && (
      <StoreOperations storeId={selectedStore.id} />
    )}
  </div>
      </div >
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

      {/* GLOBAL HEADER (DESKTOP) - Floating Top Right */}
      <div className="hidden md:flex absolute top-6 right-8 z-50">
        <SettingsMenu
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          username="Super Admin"
        />
      </div>

      {/* TOP BAR Mobile */}
      <div className="md:hidden p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <TeikonLogo variant="light" size="sm" />
        <SettingsMenu
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          username="Super Admin"
        />
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
