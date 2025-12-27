
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Settings, 
  LogOut, 
  History, 
  Sun, 
  Moon, 
  LifeBuoy, 
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';
import SupportTicketModal from './SupportTicketModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, logout, settings, getDashboardStats } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Lógica de Meta Operativa (Read-Only)
  const stats = getDashboardStats('day');
  const dailyTarget = settings.monthlyFixedCosts / 30;
  const currentProfit = stats.totalProfit;
  const progressPercent = Math.min(Math.max((currentProfit / dailyTarget) * 100, 0), 100);

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, color: 'text-brand-purple' },
    { id: 'pos', label: 'Ventas', icon: ShoppingCart, color: 'text-brand-emerald' },
    { id: 'history', label: 'Historial', icon: History, color: 'text-brand-pink' },
    { id: 'products', label: 'Inventario', icon: Package, color: 'text-orange-600' },
    { id: 'settings', label: 'Admin', icon: Settings, adminOnly: true, color: 'text-brand-blue' },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Resumen de Hoy';
      case 'pos': return 'Terminal de Ventas';
      case 'history': return 'Historial de Operaciones';
      case 'products': return 'Gestión de Stock';
      case 'settings': return 'Parámetros de Sistema';
      default: return 'Teikon OS';
    }
  };

  const handleMobileNav = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden transition-colors duration-500 flex-col md:flex-row">
      
      {/* --- 1. BARRA SUPERIOR (Solo visible en Celular) --- */}
      <div className="md:hidden bg-brand-panel border-b border-brand-border p-4 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center gap-3">
          <TeikonLogo size={32} />
          <TeikonWordmark height={16} className="text-slate-900 dark:text-white" />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-brand-text rounded-lg active:bg-slate-100 dark:active:bg-slate-800"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- 2. SIDEBAR (Menú Desplegable en Móvil / Barra Lateral en PC) --- */}
      <aside 
        className={`
          flex flex-col bg-brand-panel border-r border-brand-border transition-all duration-300 z-[70] shrink-0
          /* Lógica Móvil */
          ${isMobileMenuOpen ? 'fixed inset-0 w-full' : 'hidden'}
          /* Lógica Escritorio */
          md:relative md:flex md:h-screen md:w-auto md:block
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Botón Cerrar (Solo Móvil) */}
        <div className="md:hidden flex justify-end p-6 pb-2">
           <button 
             onClick={() => setIsMobileMenuOpen(false)}
             className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"
           >
             <X size={24} />
           </button>
        </div>

        {/* Header del Sidebar (Solo Desktop) */}
        <div className="hidden md:flex h-20 items-center px-4 border-b border-brand-border shrink-0 overflow-hidden">
          <div className={`flex items-center flex-1 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            <TeikonLogo size={32} className="shrink-0" />
            <div className="ml-3">
              <TeikonWordmark height={14} className="text-slate-900 dark:text-white" />
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-xl text-brand-muted hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 ${isCollapsed ? 'mx-auto' : 'ml-auto'}`}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 space-y-2">
          {navItems.map(item => {
            if (item.adminOnly && currentUser?.role !== 'admin') return null;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMobileNav(item.id)}
                className={`flex items-center w-full rounded-2xl transition-all duration-150 ease-in-out group min-h-[50px] active:scale-[0.97] ${
                  active 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/10' 
                    : 'text-brand-muted hover:bg-black/5 dark:hover:bg-white/5'
                } 
                /* Mobile: siempre expandido */
                justify-start px-4 gap-4
                /* Desktop: depende de isCollapsed */
                md:${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}
                `}
              >
                <item.icon size={20} className={`shrink-0 ${active ? 'text-inherit' : item.color}`} />
                
                <span className={`text-xs font-black uppercase tracking-widest truncate 
                  /* Mobile: siempre visible */
                  block
                  /* Desktop: oculto si colapsado */
                  md:${isCollapsed ? 'hidden' : 'block'}
                `}>
                  {item.label}
                </span>

                {active && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse 
                    block md:${isCollapsed ? 'hidden' : 'block'}
                  `} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-3 border-t border-brand-border space-y-2 bg-black/5 dark:bg-white/5">
          <button 
            onClick={() => { setIsSupportModalOpen(true); setIsMobileMenuOpen(false); }}
            className={`flex items-center w-full rounded-xl py-3 text-brand-muted hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-bold active:scale-95 px-4 gap-4 md:${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}`}
          >
            <LifeBuoy size={20} />
            <span className={`text-[10px] font-black uppercase tracking-widest block md:${isCollapsed ? 'hidden' : 'block'}`}>Soporte</span>
          </button>

          <button 
            onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
            className={`flex items-center w-full rounded-xl py-3 text-brand-muted hover:text-amber-500 hover:bg-amber-500/5 transition-all font-bold active:scale-95 px-4 gap-4 md:${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className={`text-[10px] font-black uppercase tracking-widest block md:${isCollapsed ? 'hidden' : 'block'}`}>{theme === 'dark' ? 'Modo Luz' : 'Modo Oscuro'}</span>
          </button>

          <button 
            onClick={logout}
            className={`flex items-center w-full rounded-xl py-3 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all font-bold active:scale-95 px-4 gap-4 md:${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}`}
          >
            <LogOut size={20} />
            <span className={`text-[10px] font-black uppercase tracking-widest block md:${isCollapsed ? 'hidden' : 'block'}`}>Salir</span>
          </button>
        </div>
      </aside>

      {/* --- 3. ÁREA DE CONTENIDO PRINCIPAL --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* Top Header Dinámico */}
        <header className="h-20 bg-brand-panel border-b border-brand-border flex items-center justify-between px-6 md:px-8 shrink-0 shadow-sm z-50">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[8px] font-black text-brand-muted uppercase tracking-[0.2em]">
                {currentUser?.storeName || 'SISTEMA'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 max-w-[200px] md:max-w-[300px] w-full hidden sm:flex">
            <div className="flex justify-between w-full text-[8px] font-black uppercase tracking-widest text-brand-muted">
              <span>Utilidad vs Meta</span>
              <span className="text-slate-900 dark:text-white">${currentProfit.toFixed(0)} / ${dailyTarget.toFixed(0)}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full relative overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
              <div 
                className="h-full bg-brand-purple transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar space-y-6 md:space-y-10">
          {children}

          <footer className="pt-10 md:pt-20 pb-10 border-t border-brand-border text-[9px] font-black text-brand-muted uppercase tracking-[0.5em] text-center opacity-20">
            TEIKON OS // CORE INTELLIGENCE v2.9.1
          </footer>
        </main>
      </div>

      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
};

export default Layout;
