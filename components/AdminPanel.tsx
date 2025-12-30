
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Store, Ticket, LogOut, ShieldCheck, TrendingUp, Users, Activity,
  Search, Plus, User, ChevronLeft, Package, Zap, X, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TeikonLogo from './TeikonLogo';
import ProductList from './ProductList';
import Button from './Button';
import Dashboard from './Dashboard';
import SalesHistory from './SalesHistory';
import StoreOperations from './StoreOperations';
// import SettingsMenu from './SettingsMenu'; // Ensure this exists or comment out if not. Assuming it exists based on previous code.
import { storesAPI, ticketsAPI, clearAuthToken } from '../utils/api';
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
  // const { products: allProducts, sales: allSales } = useStore(); // Unused for now

  // States
  const [activeView, setActiveView] = useState<'stores' | 'tickets'>('stores');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [detailTab, setDetailTab] = useState<'dashboard' | 'products' | 'sales' | 'operations'>('dashboard');

  // Stores Data
  const [stores, setStores] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Tickets Data
  const [tickets, setTickets] = useState<any[]>([]);

  // Modals
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreData, setNewStoreData] = useState({ name: '', email: '', password: '', phone: '' });

  // Theme (Placeholder)
  const isDarkMode = false;

  // --- EFFECTS ---
  useEffect(() => {
    fetchStores();
    fetchTickets();
  }, [activeView]);

  // --- API CALLS ---
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
    try {
      const data = await ticketsAPI.getAll();
      setTickets(data);
    } catch (err) {
      console.error("Error loading tickets", err);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storesAPI.create({
        nombre: newStoreData.name,
        usuario: newStoreData.email,
        password: newStoreData.password,
        telefono: newStoreData.phone,
        direccion: 'N/A'
      });

      alert('Tienda creada exitosamente');
      setIsStoreModalOpen(false);
      setNewStoreData({ name: '', email: '', password: '', phone: '' });
      fetchStores();
    } catch (error: any) {
      alert('Error al crear tienda: ' + error.message);
    }
  };

  // --- HELPERS ---
  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER HELPERS ---
  const renderDetailView = () => {
    if (!selectedStore) return null;

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedStore(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{selectedStore.name}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                <User size={14} /> <span>{selectedStore.owner}</span>
                <span className="mx-1">•</span>
                <ShieldCheck size={14} /> <span>Modo Super Admin</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 md:mt-0 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'DASHBOARD' },
              { id: 'products', icon: Package, label: 'PRODUCTOS' },
              { id: 'sales', icon: TrendingUp, label: 'VENTAS' },
              { id: 'operations', icon: Zap, label: 'OPERACIONES' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 ${detailTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Detail Content */}
        <div className="min-h-0">
          {detailTab === 'dashboard' && (
            <div className="animate-fade-in-up">
              <Dashboard storeId={selectedStore.id} />
              {/* Note: Dashboard component needs to be able to handle storeId prop if implemented */}
            </div>
          )}

          {detailTab === 'products' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <ProductList
                targetStoreId={selectedStore.id}
              // We don't pass 'products' prop here to let ProductList fetch/manage them or use context
              // If ProductList relies on context 'products', context needs to filter by storeId or ProductList needs to refactor.
              // For now assuming existing Drill-Down pattern.
              />
            </div>
          )}

          {detailTab === 'sales' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <SalesHistory />
            </div>
          )}

          {detailTab === 'operations' && (
            <StoreOperations storeId={selectedStore.id} />
          )}
        </div>
      </div>
    );
  };

  const renderStoresView = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Store size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">Total Activo</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stores.length}</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">Tiendas Registradas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-brand-blue rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue bg-blue-50 px-2 py-1 rounded-lg">MRR Actual</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">$12,450</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">Ingresos Recurrentes</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-xl">
              <ShieldCheck size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">Seguridad</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">100%</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">Sin Incidentes</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar tienda, dueño o ID..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-blue outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          onClick={() => setIsStoreModalOpen(true)}
          className="py-3 px-6 shadow-lg shadow-brand-blue/20"
        >
          <Plus size={18} className="mr-2" /> NUEVA TIENDA
        </Button>
      </div>

      {/* Stores Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Tienda</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Propietario</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Plan</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold">Cargando datos del ecosistema...</td></tr>
            ) : filteredStores.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-bold">No se encontraron tiendas registradas.</td></tr>
            ) : (
              filteredStores.map(store => (
                <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => setSelectedStore(store)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-blue/20">
                        {store.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">{store.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">ID: {store.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-full text-slate-500">
                        <User size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{store.owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                      {store.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${store.status === 'active' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                      {store.status === 'active' ? 'OPERATIVO' : 'SUSPENDIDO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm" className="group-hover:bg-white group-hover:shadow-sm">
                      GESTIONAR <ChevronLeft className="rotate-180 ml-1" size={12} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTicketsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Tickets de Soporte</h3>
          <p className="text-xs text-slate-500 font-bold">Solicitudes de ayuda de todas las sucursales</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">ID / Tienda</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Asunto</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Prioridad</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {tickets.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold text-xs">No hay tickets pendientes. ¡Buen trabajo! 🎉</td></tr>
            ) : (
              tickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-900 dark:text-white">#{t.id.substring(0, 6)}</p>
                    <p className="text-[10px] text-slate-500">{t.store?.nombre || 'Tienda Desconocida'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.titulo}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.descripcion}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${t.prioridad === 'URGENT' ? 'bg-red-100 text-red-600' :
                      t.prioridad === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                      {t.prioridad}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${t.status === 'OPEN' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeView === 'stores' && !selectedStore ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Store size={18} />
            TIENDAS ACTIVAS
          </button>

          <button
            onClick={() => { setActiveView('tickets'); setSelectedStore(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeView === 'tickets' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
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
              Bienvenido, <span className="text-brand-blue">Dragn</span>. Sistema operando al 100%.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle or User Menu Placeholder */}
          </div>
        </header>

        {/* Dynamic View Rendering */}
        {selectedStore ? renderDetailView() : (
          <>
            {activeView === 'stores' && renderStoresView()}
            {activeView === 'tickets' && renderTicketsView()}
          </>
        )}

      </main>

      {/* NEW STORE MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Nueva Tienda</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Registrar licenciamiento para nodo</p>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre Comercial</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="Ej. Sucursal Norte"
                  value={newStoreData.name}
                  onChange={e => setNewStoreData({ ...newStoreData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Usuario / Email</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="admin_norte"
                  value={newStoreData.email}
                  onChange={e => setNewStoreData({ ...newStoreData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contraseña Inicial</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="••••••••"
                  value={newStoreData.password}
                  onChange={e => setNewStoreData({ ...newStoreData, password: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Teléfono (Opcional)</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="55..."
                  value={newStoreData.phone}
                  onChange={e => setNewStoreData({ ...newStoreData, phone: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsStoreModalOpen(false)}
                >
                  CANCELAR
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="shadow-lg shadow-brand-blue/20"
                >
                  CREAR NODO
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
