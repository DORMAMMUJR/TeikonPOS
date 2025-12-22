
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  Ticket, 
  LogOut, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Activity, 
  Search,
  MoreVertical,
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Shield,
  User,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import TeikonLogo from './TeikonLogo';

interface SupportTicket {
  id: number;
  date: string;
  status: 'pending' | 'resolved';
  requesterName: string;
  storeName: string;
  description: string;
}

interface StoreData {
  id: string;
  name: string;
  owner: string;
  plan: 'Basic' | 'Premium' | 'Enterprise';
  status: 'active' | 'suspended';
  lastActive: string;
}

interface AdminPanelProps {
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'stores' | 'support'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false); // Inicializamos en claro
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  const [stores, setStores] = useState<StoreData[]>([
    { id: 'ST-001', name: 'Óptica Visionary', owner: 'Carlos Mendez', plan: 'Premium', status: 'active', lastActive: 'Justo ahora' },
    { id: 'ST-002', name: 'Teikon Concept Store', owner: 'Laura Sanz', plan: 'Enterprise', status: 'active', lastActive: 'hace 2 horas' },
    { id: 'ST-003', name: 'Mini Market Express', owner: 'Miguel Polo', plan: 'Basic', status: 'suspended', lastActive: 'hace 3 días' },
    { id: 'ST-004', name: 'Tech Gadgets Center', owner: 'Ana Rius', plan: 'Premium', status: 'active', lastActive: 'hace 10 minutos' },
    { id: 'ST-005', name: 'Zapatos El Paso', owner: 'Roberto Diaz', plan: 'Basic', status: 'active', lastActive: 'hace 1 día' },
    { id: 'ST-006', name: 'Farmacia Salud+', owner: 'Elena Gil', plan: 'Enterprise', status: 'active', lastActive: 'hace 5 minutos' },
  ]);

  useEffect(() => {
    const loadTickets = () => {
      const raw = localStorage.getItem('teikon_tickets');
      if (raw) setTickets(JSON.parse(raw));
    };
    loadTickets();
    window.addEventListener('storage', loadTickets);
    return () => window.removeEventListener('storage', loadTickets);
  }, []);

  const markAsResolved = (ticketId: number) => {
    const updated = tickets.map(t => 
      t.id === ticketId ? { ...t, status: 'resolved' as const } : t
    );
    setTickets(updated);
    localStorage.setItem('teikon_tickets', JSON.stringify(updated));
  };

  const toggleStoreStatus = (id: string) => {
    setStores(prev => prev.map(s => 
      s.id === id ? { ...s, status: s.status === 'active' ? 'suspended' : 'active' } : s
    ));
  };

  const themeClasses = {
    bg: isDarkMode ? 'bg-[#1E3A4A]' : 'bg-slate-50',
    text: isDarkMode ? 'text-slate-100' : 'text-slate-800',
    card: isDarkMode ? 'bg-[#264a5e] border-white/10' : 'bg-white border-slate-200 shadow-sm',
    sidebar: isDarkMode ? 'bg-[#1E3A4A] border-white/10' : 'bg-white border-slate-200',
    subtext: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    navItem: isDarkMode ? 'text-slate-500' : 'text-gray-400',
    navActive: isDarkMode ? 'bg-[#325e75] text-white shadow-xl' : 'bg-slate-100 text-slate-900 shadow-md',
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
    { id: 'stores', icon: Store, label: 'Tiendas' },
    { id: 'support', icon: Ticket, label: 'Soporte' },
  ];

  const renderDashboard = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${themeClasses.card} border p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 transition-all`}>
        <div className="p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <ShieldCheck size={64} className="text-emerald-500" />
        </div>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-widest ${themeClasses.text}`}>Sistemas Operativos</h2>
          <p className="text-sm font-bold uppercase tracking-[0.2em] mt-2 text-emerald-500/80">Protocolo de seguridad activo</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Revenue Global', value: '$248.5K', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Usuarios Activos', value: '1,284', icon: Users, color: 'text-sky-400' },
          { label: 'Actividad 24h', value: '98.2%', icon: Activity, color: 'text-indigo-400' },
        ].map((kpi, i) => (
          <div key={i} className={`${themeClasses.card} border p-8 rounded-3xl hover:scale-105 transition-all`}>
            <kpi.icon size={20} className={`${kpi.color} mb-6`} />
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>{kpi.label}</p>
            <h3 className={`text-3xl font-black ${themeClasses.text}`}>{kpi.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStores = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text"
          placeholder="BUSCAR TIENDA POR NOMBRE O ID..."
          className={`w-full ${isDarkMode ? 'bg-[#1e323d]' : 'bg-slate-50'} border ${themeClasses.card} rounded-2xl py-5 pl-16 pr-8 text-xs font-bold ${themeClasses.text} outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-400 uppercase tracking-widest`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((store) => (
          <div 
            key={store.id} 
            className={`${themeClasses.card} border rounded-[2rem] p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg`}
          >
            {/* Status Pill Condicional */}
            <div className="absolute top-6 right-6">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                store.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {store.status === 'active' ? 'ACTIVA' : 'SUSPENDIDA'}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-black/20' : 'bg-slate-100'} ${store.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                <Store size={24} />
              </div>
              <div>
                <h4 className={`text-lg font-black uppercase tracking-tight ${themeClasses.text}`}>{store.name}</h4>
                <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>{store.id}</span>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <User size={14} className={themeClasses.subtext} />
                <span className={`text-xs font-bold ${themeClasses.text}`}>Dueño: {store.owner}</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap size={14} className={themeClasses.subtext} />
                <span className={`text-xs font-bold ${themeClasses.text}`}>Plan: {store.plan}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={14} className={themeClasses.subtext} />
                <span className={`text-xs font-bold ${themeClasses.text}`}>Visto: {store.lastActive}</span>
              </div>
            </div>
            <div className={`pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-100'} flex items-center justify-between`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>
                ESTADO DE ACCESO
              </span>
              <button 
                onClick={() => toggleStoreStatus(store.id)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${
                  store.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
                  store.status === 'active' ? 'translate-x-6' : 'translate-x-0'
                } flex items-center justify-center`}>
                  {store.status === 'active' ? <Unlock size={10} className="text-emerald-500" /> : <Lock size={10} className="text-red-500" />}
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4 px-2">
        <div>
          <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${themeClasses.subtext}`}>Tickets de Soporte</h3>
          <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${themeClasses.subtext}`}>Gestión Centralizada</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[9px] font-black text-red-500 bg-red-500/5 px-3 py-1 rounded-full uppercase">
            <Circle size={8} className="fill-current" /> {tickets.filter(t => t.status === 'pending').length} Pendientes
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tickets.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
            <Ticket size={64} className={themeClasses.text} />
            <p className={`text-xs font-black uppercase tracking-[0.4em] ${themeClasses.text}`}>Sin reportes</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className={`${themeClasses.card} border p-8 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between hover:scale-[1.01] transition-all group gap-6`}>
              <div className="flex items-start gap-6 flex-1 min-w-0">
                <div className={`p-4 rounded-2xl shrink-0 ${ticket.status === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {ticket.status === 'pending' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>{ticket.storeName}</span>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${themeClasses.subtext}`}>REF: {ticket.id}</span>
                  </div>
                  <h4 className={`text-sm font-black uppercase tracking-tight line-clamp-1 mb-2 ${themeClasses.text}`}>Solicitante: {ticket.requesterName}</h4>
                  <p className={`text-xs font-bold leading-relaxed max-w-2xl line-clamp-2 uppercase ${themeClasses.subtext}`}>
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${themeClasses.subtext}`}>
                      <Clock size={12} /> {ticket.date}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
                {ticket.status === 'pending' && (
                  <button 
                    onClick={() => markAsResolved(ticket.id)}
                    className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Resolver
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen font-sans selection:bg-emerald-500/30 transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text}`}>
      <aside className={`w-24 flex flex-col items-center py-10 gap-10 border-r transition-colors duration-300 ${themeClasses.sidebar}`}>
        <div className="flex flex-col items-center gap-6 mb-8 w-full">
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <TeikonLogo size={48} className="drop-shadow-md" />
        </div>
        <nav className="flex-1 flex flex-col gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`p-4 rounded-2xl transition-all duration-300 relative group ${
                activeView === item.id 
                  ? themeClasses.navActive 
                  : themeClasses.navItem + ' hover:text-emerald-500'
              }`}
              title={item.label}
            >
              <item.icon size={24} />
            </button>
          ))}
        </nav>
        <button onClick={onExit} className="p-4 text-red-500/50 hover:text-red-500 transition-colors"><LogOut size={24} /></button>
      </aside>
      <main className="flex-1 overflow-y-auto px-12 py-12 no-scrollbar">
        <header className="flex justify-between items-end mb-16">
          <div>
            <h1 className={`text-4xl font-black uppercase tracking-tighter ${themeClasses.text}`}>
              {activeView === 'dashboard' && 'PANEL DE CONTROL'}
              {activeView === 'stores' && 'TIENDAS'}
              {activeView === 'support' && 'SOPORTE'}
            </h1>
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-3 ${themeClasses.subtext}`}>TEIKON OS // ADMIN MODE</p>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-xl border ${themeClasses.card}`}>
              {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-500" />}
            </button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'stores' && renderStores()}
          {activeView === 'support' && renderSupport()}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
