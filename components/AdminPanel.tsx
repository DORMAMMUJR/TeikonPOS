
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
  Circle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  User,
  Zap,
  Lock,
  Unlock,
  Phone,
  Plus,
  Mail,
  Key,
  X,
  Menu,
  ChevronLeft,
  Check
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
  phone: string;
  plan: 'Basic' | 'Premium' | 'Enterprise';
  status: 'active' | 'suspended';
  lastActive: string;
}

interface AdminPanelProps {
  onExit: () => void;
}

const DEFAULT_STORES: StoreData[] = [
  { id: 'ST-001', name: 'Óptica Visionary', owner: 'Carlos Mendez', phone: '5512345678', plan: 'Premium', status: 'active', lastActive: 'Justo ahora' },
  { id: 'ST-002', name: 'Teikon Concept Store', owner: 'Laura Sanz', phone: '5598765432', plan: 'Enterprise', status: 'active', lastActive: 'hace 2 horas' },
  { id: 'ST-003', name: 'Mini Market Express', owner: 'Miguel Polo', phone: '5544332211', plan: 'Basic', status: 'suspended', lastActive: 'hace 3 días' },
];

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'stores' | 'support'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  const [isNewStoreModalOpen, setIsNewStoreModalOpen] = useState(false);
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [newStorePassword, setNewStorePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stores, setStores] = useState<StoreData[]>([]);

  useEffect(() => {
    const loadStores = () => {
      const saved = localStorage.getItem('teikon_all_stores');
      if (saved) {
        setStores(JSON.parse(saved));
      } else {
        localStorage.setItem('teikon_all_stores', JSON.stringify(DEFAULT_STORES));
        setStores(DEFAULT_STORES);
      }
    };

    const loadTickets = () => {
      const raw = localStorage.getItem('teikon_tickets');
      if (raw) setTickets(JSON.parse(raw));
    };

    loadStores();
    loadTickets();
    
    window.addEventListener('storage', (e) => {
      if (e.key === 'teikon_all_stores') loadStores();
      if (e.key === 'teikon_tickets') loadTickets();
    });
    
    return () => window.removeEventListener('storage', loadStores as any);
  }, []);

  const markAsResolved = (ticketId: number) => {
    const updated = tickets.map(t => 
      t.id === ticketId ? { ...t, status: 'resolved' as const } : t
    );
    setTickets(updated);
    localStorage.setItem('teikon_tickets', JSON.stringify(updated));
  };

  const toggleStoreStatus = (id: string) => {
    const updatedStores = stores.map(s => 
      s.id === id ? { ...s, status: s.status === 'active' ? 'suspended' : 'active' } as StoreData : s
    );
    setStores(updatedStores);
    localStorage.setItem('teikon_all_stores', JSON.stringify(updatedStores));
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreEmail || !newStorePassword) return;
    
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newStore: StoreData = {
        id: `ST-${Math.floor(Math.random() * 900 + 100)}`,
        name: newStoreEmail.split('@')[0].toUpperCase(),
        owner: 'Cliente Externo',
        phone: 'N/A',
        plan: 'Basic',
        status: 'active',
        lastActive: 'Pendiente Onboarding'
      };
      
      const updated = [newStore, ...stores];
      setStores(updated);
      localStorage.setItem('teikon_all_stores', JSON.stringify(updated));

      setIsNewStoreModalOpen(false);
      setNewStoreEmail('');
      setNewStorePassword('');
      setIsSubmitting(false);
      
      // Se elimina el modal de éxito para una transición inmediata a la lista actualizada
    }, 800);
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

  const handleNavClick = (view: any) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const renderDashboard = () => (
    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${themeClasses.card} border p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-6 transition-all`}>
        <div className="p-4 md:p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <ShieldCheck size={48} className="text-emerald-500 md:hidden" />
          <ShieldCheck size={64} className="text-emerald-500 hidden md:block" />
        </div>
        <div>
          <h2 className={`text-xl md:text-2xl font-black uppercase tracking-widest ${themeClasses.text}`}>Sistemas Operativos</h2>
          <p className="text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] mt-2 text-emerald-500/80">Protocolo de seguridad activo</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {[
          { label: 'Revenue Global', value: '$248.5K', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Usuarios Activos', value: stores.length.toString(), icon: Users, color: 'text-sky-400' },
          { label: 'Actividad 24h', value: '98.2%', icon: Activity, color: 'text-indigo-400' },
        ].map((kpi, i) => (
          <div key={i} className={`${themeClasses.card} border p-6 md:p-8 rounded-3xl hover:scale-105 transition-all active:scale-[0.98]`}>
            <kpi.icon size={20} className={`${kpi.color} mb-6`} />
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.subtext}`}>{kpi.label}</p>
            <h3 className={`text-2xl md:text-3xl font-black ${themeClasses.text}`}>{kpi.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStores = () => {
    const filteredStores = stores.filter(store => {
      const cleanSearch = searchTerm.trim().toLowerCase();
      if (!cleanSearch) return true;
      return store.name.toLowerCase().includes(cleanSearch) || store.phone.includes(cleanSearch);
    });

    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="BUSCAR POR NOMBRE O TELÉFONO..."
              className={`w-full ${isDarkMode ? 'bg-[#1e323d]' : 'bg-slate-50'} border ${themeClasses.card} rounded-2xl py-4 md:py-5 pl-16 pr-8 text-[10px] md:text-xs font-bold ${themeClasses.text} outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-400 uppercase tracking-widest`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setIsNewStoreModalOpen(true)}
            className="px-8 py-4 md:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl md:rounded-[1.5rem] text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Nueva Tienda
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredStores.map((store, idx) => (
            <div 
              key={store.id} 
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`${themeClasses.card} border rounded-[2rem] p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg active:scale-[0.99] animate-fade-in-up`}
            >
              <div className="absolute top-6 right-6">
                <span className={`px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${
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
                  <h4 className={`text-base md:text-lg font-black uppercase tracking-tight ${themeClasses.text}`}>{store.name}</h4>
                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>{store.id}</span>
                </div>
              </div>
              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <div className="flex items-center gap-3 text-[11px] md:text-xs">
                  <User size={14} className={themeClasses.subtext} />
                  <span className={`font-bold ${themeClasses.text}`}>Dueño: {store.owner}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] md:text-xs">
                  <Phone size={14} className={themeClasses.subtext} />
                  <a href={`tel:${store.phone}`} className={`font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} hover:underline active:scale-95 transition-transform inline-block`}>{store.phone}</a>
                </div>
                <div className="flex items-center gap-3 text-[11px] md:text-xs">
                  <Zap size={14} className={themeClasses.subtext} />
                  <span className={`font-bold ${themeClasses.text}`}>Plan: {store.plan}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] md:text-xs">
                  <Clock size={14} className={themeClasses.subtext} />
                  <span className={`font-bold ${themeClasses.text}`}>Visto: {store.lastActive}</span>
                </div>
              </div>
              <div className={`pt-4 md:pt-6 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-100'} flex items-center justify-between`}>
                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>ACCESO</span>
                <button 
                  onClick={() => toggleStoreStatus(store.id)}
                  className={`w-10 md:w-12 h-5 md:h-6 rounded-full p-1 transition-all duration-300 flex items-center active:scale-90 ${store.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}
                >
                  <div className={`w-3 md:w-4 h-3 md:h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${store.status === 'active' ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'} flex items-center justify-center`}>
                    {store.status === 'active' ? <Unlock size={8} className="text-emerald-500" /> : <Lock size={8} className="text-red-500" />}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSupport = () => (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 px-2">
        <div>
          <h3 className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${themeClasses.subtext}`}>Tickets de Soporte</h3>
          <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-1 ${themeClasses.subtext}`}>Gestión Centralizada</p>
        </div>
        <span className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-red-500 bg-red-500/5 px-3 py-1 rounded-full uppercase">
          <Circle size={8} className="fill-current" /> {tickets.filter(t => t.status === 'pending').length} Pendientes
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tickets.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
            <Ticket size={48} className={themeClasses.text} />
            <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.4em] ${themeClasses.text}`}>Sin reportes</p>
          </div>
        ) : (
          tickets.map((ticket, idx) => (
            <div key={ticket.id} style={{ animationDelay: `${idx * 40}ms` }} className={`${themeClasses.card} border p-6 md:p-8 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between hover:scale-[1.01] transition-all group gap-6 active:scale-[0.99] animate-fade-in-up`}>
              <div className="flex items-start gap-4 md:gap-6 flex-1 min-w-0">
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 ${ticket.status === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {ticket.status === 'pending' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${themeClasses.subtext}`}>{ticket.storeName}</span>
                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${themeClasses.subtext}`}>REF: {ticket.id}</span>
                  </div>
                  <h4 className={`text-xs md:text-sm font-black uppercase tracking-tight line-clamp-1 mb-2 ${themeClasses.text}`}>Solicitante: {ticket.requesterName}</h4>
                  <p className={`text-[10px] md:text-xs font-bold leading-relaxed max-w-2xl line-clamp-2 uppercase ${themeClasses.subtext}`}>{ticket.description}</p>
                </div>
              </div>
              {ticket.status === 'pending' && (
                <button 
                  onClick={() => markAsResolved(ticket.id)}
                  className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
                >
                  Resolver
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col md:flex-row h-screen font-sans selection:bg-emerald-500/30 transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text} overflow-hidden`}>
      
      {/* HEADER MÓVIL EXCLUSIVO */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-brand-panel border-b border-brand-border z-[120] sticky top-0 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <TeikonLogo size={32} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
          <span className="text-[10px] font-black uppercase tracking-widest">Admin OS</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-brand-text border border-brand-border active:scale-90 transition-transform"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* OVERLAY MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVO */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[110] transform transition-transform duration-300 bg-brand-panel border-r border-brand-border
          md:relative md:translate-x-0 md:flex md:flex-col items-center py-10
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          w-64 shrink-0
        `}
      >
        <div className={`flex items-center justify-between w-full px-6 mb-12 hidden md:flex`}>
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <TeikonLogo size={32} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Teikon OS</span>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* LOGO EN MÓVIL DENTRO DEL SIDEBAR */}
        <div className="md:hidden flex flex-col items-center mb-10 w-full px-6">
           <TeikonLogo size={64} className="mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-muted">Admin Terminal</p>
        </div>

        <nav className="flex-1 flex flex-col gap-4 w-full px-4 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center transition-all duration-150 ease-in-out active:scale-[0.97] rounded-2xl group relative overflow-hidden h-14 ${
                  isActive 
                    ? themeClasses.navActive 
                    : `${themeClasses.navItem} hover:bg-black/5 dark:hover:bg-white/5`
                } ${isCollapsed ? 'md:justify-center' : 'px-5 gap-4'}`}
              >
                <item.icon size={22} className="shrink-0" />
                <span className={`text-xs font-black uppercase tracking-widest truncate ${isCollapsed ? 'md:hidden' : 'block'}`}>
                  {item.label}
                </span>
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 hidden md:block" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="w-full px-4 mt-auto pt-6 border-t md:border-t-0 border-brand-border">
          <button 
            onClick={onExit} 
            className={`flex items-center w-full py-4 text-red-500/70 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all duration-150 active:scale-95 ${isCollapsed ? 'md:justify-center' : 'px-5 gap-4'}`}
          >
            <LogOut size={22} className="shrink-0" />
            <span className={`text-xs font-black uppercase tracking-widest ${isCollapsed ? 'md:hidden' : 'block'}`}>Salir</span>
          </button>
        </div>
      </aside>
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 no-scrollbar">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-6">
          <div>
            <h1 className={`text-2xl md:text-4xl font-black uppercase tracking-tighter ${themeClasses.text}`}>
              {activeView === 'dashboard' && 'PANEL DE CONTROL'}
              {activeView === 'stores' && 'TIENDAS'}
              {activeView === 'support' && 'SOPORTE'}
            </h1>
            <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mt-2 md:mt-3 ${themeClasses.subtext}`}>TEIKON OS // ADMIN MODE</p>
          </div>
          <div className="flex items-center gap-4 md:gap-6 self-end md:self-auto">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-xl border ${themeClasses.card} shadow-sm active:scale-90 transition-transform`}>
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto pb-10">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'stores' && renderStores()}
          {activeView === 'support' && renderSupport()}
        </div>
      </main>

      {/* MODAL DE ALTA DE NUEVA TIENDA RESPONSIVO */}
      {isNewStoreModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsNewStoreModalOpen(false)} />
          <div className={`relative w-full max-w-md ${isDarkMode ? 'bg-[#264a5e] border-white/10' : 'bg-white border-slate-200'} border p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <Plus size={20} className="text-white" />
                </div>
                <div>
                  <h3 className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${themeClasses.text}`}>Nueva Tienda</h3>
                  <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-0.5 ${themeClasses.subtext}`}>Alta de Cliente</p>
                </div>
              </div>
              <button onClick={() => setIsNewStoreModalOpen(false)} className={`${themeClasses.subtext} hover:${themeClasses.text} transition-all active:scale-90`}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4 md:space-y-6">
              <div className="space-y-1.5">
                <label className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.subtext}`}>Email del Cliente</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@cliente.com"
                    value={newStoreEmail}
                    onChange={(e) => setNewStoreEmail(e.target.value)}
                    className={`w-full pl-12 pr-6 py-4 rounded-xl md:rounded-2xl border ${isDarkMode ? 'bg-[#1e323d] border-white/5' : 'bg-slate-50 border-slate-100'} text-xs font-bold outline-none focus:border-emerald-500/50 transition-all ${themeClasses.text}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.subtext}`}>Contraseña Temporal</label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="Contraseña inicial"
                    value={newStorePassword}
                    onChange={(e) => setNewStorePassword(e.target.value)}
                    className={`w-full pl-12 pr-6 py-4 rounded-xl md:rounded-2xl border ${isDarkMode ? 'bg-[#1e323d] border-white/5' : 'bg-slate-50 border-slate-100'} text-xs font-bold outline-none focus:border-emerald-500/50 transition-all ${themeClasses.text}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-600/10 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Crear Tienda</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
