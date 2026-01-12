import React, { useState, useEffect } from 'react';
import {
  Store, TrendingUp, ShieldCheck, Search, Plus, User,
  ChevronLeft, AlertCircle, CheckCircle, Zap, X, Lock, Eye, EyeOff, Building,
  LayoutDashboard, Package, LogOut, Ticket, DollarSign, Trash2, RefreshCw, Edit2, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { storesAPI, ticketsAPI, clearAuthToken, authAPI, API_URL, getHeaders } from '../utils/api';
import { Button, TeikonLogo } from '../src/components/ui';
import ProductList from './ProductList';
import Dashboard from './Dashboard';
import SalesHistory from './SalesHistory';
import StoreOperations from './StoreOperations';

interface StoreData {
  id: string;
  name: string;
  ownerName: string;   // Owner's full name
  ownerEmail: string;  // Email/username for login
  phone: string;
  lastActive: string;
}

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const navigate = useNavigate();
  const { currentUser } = useStore();

  // States
  const [activeView, setActiveView] = useState<'stores' | 'tickets'>('stores');
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [detailTab, setDetailTab] = useState<'dashboard' | 'products' | 'sales' | 'finanzas' | 'configuracion'>('dashboard');

  // Stores Data
  const [stores, setStores] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Tickets Data
  const [tickets, setTickets] = useState<any[]>([]);



  // Modals
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreData, setNewStoreData] = useState({ name: '', email: '', password: '', phone: '', ownerName: '' });

  // Edit Store State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreData | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'security'>('info');
  const [editFormData, setEditFormData] = useState({
    name: '',
    ownerName: '',
    email: '',
    newPassword: ''
  });

  // Delete Store State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<StoreData | null>(null);
  const [deletePasswordValue, setDeletePasswordValue] = useState('');

  // Theme (Placeholder)
  const isDarkMode = false;

  // --- EFFECTS ---
  useEffect(() => {
    fetchStores();
    fetchTickets();
  }, [activeView, selectedStore]);

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
      if (!newStoreData.name || !newStoreData.email || !newStoreData.password) {
        alert('Por favor complete todos los campos obligatorios');
        return;
      }

      await storesAPI.create({
        nombre: newStoreData.name,
        usuario: newStoreData.email,
        password: newStoreData.password,
        telefono: newStoreData.phone,
        ownerName: newStoreData.ownerName, // Send owner name to backend
        direccion: 'N/A'
      });

      alert('✅ Tienda y Usuario Admin creados exitosamente');
      setIsStoreModalOpen(false);
      setNewStoreData({ name: '', email: '', password: '', phone: '', ownerName: '' });
      fetchStores();
    } catch (error: any) {
      alert('❌ Error al crear tienda: ' + error.message);
    }
  };

  // --- HELPERS ---
  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
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
              aria-label="Volver a la lista"
            >
              <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{selectedStore.name}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                <User size={14} /> <span>{selectedStore.ownerName}</span>
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
              { id: 'finanzas', icon: DollarSign, label: 'FINANZAS' },
              { id: 'configuracion', icon: Settings, label: 'CONFIGURACIÓN' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id as any)}
                className={`px - 4 py - 2 rounded - lg text - xs font - black transition - all flex items - center gap - 2 ${detailTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  } `}
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

          {detailTab === 'finanzas' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Operaciones de Caja</h3>
              <StoreOperations storeId={selectedStore.id} mode="cash" />
            </div>
          )}

          {detailTab === 'configuracion' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Configuración de Tienda</h3>
              <StoreOperations storeId={selectedStore.id} mode="settings" />
            </div>
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

      {/* MOBILE: Stores Card View (visible on mobile, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">Cargando datos del ecosistema...</div>
        ) : filteredStores.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">No se encontraron tiendas registradas.</div>
        ) : (
          filteredStores.map(store => (
            <div
              key={store.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 active:scale-[0.98] transition-all"
              onClick={() => setSelectedStore(store)}
            >
              {/* Store Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-blue/20 shrink-0">
                  {store.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {store.name}
                  </h3>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">{store.ownerName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{store.ownerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Store Actions */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStoreToEdit(store);
                    setEditFormData({
                      name: store.name,
                      ownerName: store.ownerName,
                      email: '',
                      newPassword: ''
                    });
                    setEditTab('info');
                    setIsEditModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-brand-blue hover:bg-blue-100 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 min-h-[44px]"
                  aria-label={`Editar ${store.name}`}
                >
                  <Edit2 size={16} /> EDITAR
                </button>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoreToDelete(store);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex items-center justify-center px-3 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all active:scale-95 min-h-[44px] min-w-[44px]"
                    aria-label={`Eliminar ${store.name}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MOBILE: Cards View (visible on mobile, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">Cargando tiendas...</div>
        ) : filteredStores.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">No se encontraron tiendas.</div>
        ) : (
          filteredStores.map(store => (
            <div
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 active:scale-[0.98] transition-all"
            >
              {/* Horizontal Layout */}
              <div className="flex items-center gap-4">
                {/* Left: Store Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-blue/20">
                    {store.name.substring(0, 2).toUpperCase()}
                  </div>
                  {/* Status Indicator - Always Active (green) */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </div>

                {/* Center: Store Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {store.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <User size={12} />
                    <span className="truncate">{store.ownerName}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ID: {store.id.substring(0, 8)}...
                  </p>
                </div>

                {/* Right: Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStore(store);
                  }}
                  className="flex items-center justify-center w-12 h-12 bg-brand-blue hover:bg-blue-600 text-white rounded-xl transition-all active:scale-95 shadow-sm shrink-0"
                  aria-label={`Gestionar ${store.name}`}
                >
                  <ChevronLeft className="rotate-180" size={18} />
                </button>
              </div>

              {/* Action Buttons Row (Mobile) */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">

                {currentUser?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoreToDelete(store);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex items-center justify-center w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-95"
                    aria-label="Eliminar tienda"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP: Stores Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Tienda</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Propietario</th>
              <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Estado</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-bold">Cargando datos del ecosistema...</td></tr>
            ) : filteredStores.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-xs font-bold">No se encontraron tiendas registradas.</td></tr>
            ) : (
              filteredStores.map(store => (
                <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer" onClick={() => setSelectedStore(store)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-blue/20 shrink-0">
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
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                        <User size={12} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {store.ownerName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {store.ownerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-full">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Activa</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStoreToEdit(store);
                          setEditFormData({
                            name: store.name,
                            ownerName: store.ownerName,
                            email: '',
                            newPassword: ''
                          });
                          setEditTab('info');
                          setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 text-brand-blue hover:bg-blue-100 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold uppercase transition-all active:scale-95 shadow-sm hover:shadow-md"
                      >
                        <Edit2 size={14} /> EDITAR
                      </button>

                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoreToDelete(store);
                            setIsDeleteModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs font-bold uppercase transition-all active:scale-95 shadow-sm hover:shadow-md"
                        >
                          <Trash2 size={14} /> ELIMINAR
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedStore(store)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase transition-all active:scale-95 shadow-sm hover:shadow-md group-hover:border-brand-blue"
                      >
                        GESTIONAR <ChevronLeft className="rotate-180" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div >
  );

  const renderTicketsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Tickets de Soporte</h3>
          <p className="text-xs text-slate-500 font-bold">Solicitudes de ayuda de todas las sucursales</p>
        </div>
      </div>

      {/* MOBILE: Tickets Card View (visible on mobile, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {tickets.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold text-xs">No hay tickets pendientes. ¡Buen trabajo! 🎉</div>
        ) : (
          tickets.map((t: any) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 active:scale-[0.98] transition-all"
            >
              {/* Ticket Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white">#{t.id.substring(0, 6)}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${t.prioridad === 'URGENT' ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                      t.prioridad === 'HIGH' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' :
                        'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      }`}>
                      {t.prioridad}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{t.titulo}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{t.descripcion}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ml-2 ${t.status === 'OPEN' ? 'bg-green-100 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' :
                  'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}>
                  {t.status}
                </span>
              </div>

              {/* Ticket Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="font-bold">{t.store?.nombre || 'Tienda Desconocida'}</span>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP: Tickets Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
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
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${t.status === 'OPEN' ? 'bg-green-100 text-green-600 border-green-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
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
    <div className={`min - h - screen flex ${isDarkMode ? 'dark bg-slate-900' : 'bg-slate-50'} `}>

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
            className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - xs font - bold transition - all ${activeView === 'stores' && !selectedStore ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'} `}
          >
            <Store size={18} />
            TIENDAS ACTIVAS
          </button>

          <button
            onClick={() => { setActiveView('tickets'); setSelectedStore(null); }}
            className={`w - full flex items - center gap - 3 px - 4 py - 3 rounded - xl text - xs font - bold transition - all ${activeView === 'tickets' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'} `}
          >
            <Ticket size={18} />
            TICKETS SOPORTE
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
              {selectedStore ? `Gestionando: ${selectedStore.name} ` : (activeView === 'stores' ? 'Panel de Control Principal' : 'Centro de Soporte')}
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
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">

              {/* Store Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre de la Tienda</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:font-normal"
                  placeholder="Ej. Sucursal Centro"
                  value={newStoreData.name}
                  onChange={e => setNewStoreData({ ...newStoreData, name: e.target.value })}
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Dueño/Contacto</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:font-normal"
                  placeholder="Ej. Juan Pérez"
                  value={newStoreData.ownerName}
                  onChange={e => setNewStoreData({ ...newStoreData, ownerName: e.target.value })}
                />
              </div>

              {/* Admin Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Administrador (Usuario)</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:font-normal"
                  placeholder="admin@tienda.com"
                  value={newStoreData.email}
                  onChange={e => setNewStoreData({ ...newStoreData, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contraseña Inicial</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:font-normal"
                  placeholder="••••••••"
                  value={newStoreData.password}
                  onChange={e => setNewStoreData({ ...newStoreData, password: e.target.value })}
                />
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Teléfono <span className="text-slate-300 font-normal normal-case">(Opcional)</span></label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:font-normal"
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
                  className="h-12"
                >
                  CANCELAR
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="h-12 shadow-lg shadow-brand-blue/20 bg-brand-blue hover:bg-blue-600 text-white"
                >
                  CREAR NODO
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STORE MODAL */}
      {isEditModalOpen && storeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Editar Tienda</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{storeToEdit.name}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setStoreToEdit(null);
                  setEditFormData({ name: '', ownerName: '', email: '', newPassword: '' });
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                type="button"
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setEditTab('info')}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all ${editTab === 'info'
                  ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                INFORMACIÓN GENERAL
              </button>
              <button
                onClick={() => setEditTab('security')}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all ${editTab === 'security'
                  ? 'bg-white dark:bg-slate-700 text-brand-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                SEGURIDAD
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {editTab === 'info' ? (
                <>
                  {/* Store Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Nombre de la Tienda
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                      placeholder="Ej. Sucursal Centro"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    />
                  </div>

                  {/* Owner Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Nombre del Encargado
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                      placeholder="Ej. Juan Pérez"
                      value={editFormData.ownerName}
                      onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Correo Electrónico (Usuario)
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                      placeholder="admin@tienda.com"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 ml-1 mt-1">Dejar vacío para mantener el actual</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                      placeholder="Dejar vacío para no cambiar"
                      value={editFormData.newPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 ml-1 mt-1">Solo completar si deseas cambiar la contraseña</p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Cambio de Contraseña</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                          Al cambiar la contraseña, el administrador de la tienda deberá usar la nueva contraseña en su próximo inicio de sesión.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setStoreToEdit(null);
                    setEditFormData({ name: '', ownerName: '', email: '', newPassword: '' });
                  }}
                  className="h-12"
                >
                  CANCELAR
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="bg-brand-blue hover:bg-blue-600 text-white h-12 shadow-lg shadow-brand-blue/20"
                  onClick={async () => {
                    try {
                      // Prepare updates object (only send non-empty fields)
                      const updates: any = {};
                      if (editFormData.name && editFormData.name !== storeToEdit.name) {
                        updates.name = editFormData.name;
                      }
                      if (editFormData.ownerName && editFormData.ownerName !== storeToEdit.ownerName) {
                        updates.ownerName = editFormData.ownerName;
                      }
                      if (editFormData.email) {
                        updates.email = editFormData.email;
                      }
                      if (editFormData.newPassword) {
                        updates.newPassword = editFormData.newPassword;
                      }

                      // Check if there are any updates
                      if (Object.keys(updates).length === 0) {
                        alert('⚠️ No hay cambios para guardar');
                        return;
                      }

                      await authAPI.adminUpdateStore(storeToEdit.id, updates);
                      alert('✅ Tienda actualizada exitosamente');
                      setIsEditModalOpen(false);
                      setStoreToEdit(null);
                      setEditFormData({ name: '', ownerName: '', email: '', newPassword: '' });
                      fetchStores(); // Refresh stores list
                    } catch (e: any) {
                      alert('❌ Error: ' + e.message);
                    }
                  }}
                >
                  GUARDAR CAMBIOS
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE STORE MODAL */}
      {isDeleteModalOpen && storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-2 border-red-500">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertCircle size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Eliminar Tienda</h3>
              <p className="text-sm font-bold text-slate-500 mt-1 px-4">
                Estás a punto de eliminar <span className="text-red-600">{storeToDelete.name}</span>
              </p>
              <p className="text-xs font-bold text-red-500 mt-2">
                ⚠️ Esta acción NO se puede deshacer
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tu Contraseña</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="Ingrese contraseña"
                  value={deletePasswordValue}
                  onChange={(e) => setDeletePasswordValue(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => { setIsDeleteModalOpen(false); setDeletePasswordValue(''); setStoreToDelete(null); }} className="h-12">
                  CANCELAR
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="bg-red-500 hover:bg-red-600 text-white h-12 shadow-lg shadow-red-500/20"
                  onClick={async () => {
                    if (!deletePasswordValue) return alert('Ingrese una contraseña');
                    try {
                      await storesAPI.delete(storeToDelete.id, deletePasswordValue);
                      alert('✅ Tienda eliminada con éxito');
                      setIsDeleteModalOpen(false);
                      setDeletePasswordValue('');
                      setStoreToDelete(null);
                      fetchStores();
                    } catch (e: any) {
                      alert('❌ Error: ' + e.message);
                    }
                  }}
                >
                  CONFIRMAR ELIMINACIÓN
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
