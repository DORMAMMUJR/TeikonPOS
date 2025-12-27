
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
  TrendingUp
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

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden transition-colors duration-500">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside 
        className={`flex flex-col bg-brand-panel border-r border-brand-border transition-all duration-300 z-[70] h-screen shrink-0 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Header del Sidebar: Logo y Toggle */}
        <div className="h-20 flex items-center px-4 border-b border-brand-border shrink-0 overflow-hidden">
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
                onClick={() => onTabChange(item.id)}
                className={`flex items-center w-full rounded-2xl transition-all duration-150 ease-in-out group min-h-[50px] active:scale-[0.97] ${
                  active 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/10' 
                    : 'text-brand-muted hover:bg-black/5 dark:hover:bg-white/5'
                } ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}`}
              >
                <item.icon size={20} className={`shrink-0 ${active ? 'text-inherit' : item.color}`} />
                {!isCollapsed && (
                  <span className="text-xs font-black uppercase tracking-widest truncate">
                    {item.label}
                  </span>
                )}
                {active && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer del Sidebar: Soporte, Tema y Logout */}
        <div className="p-3 border-t border-brand-border space-y-2 bg-black/5 dark:bg-white/5">
          <button 
            onClick={() => setIsSupportModalOpen(true)}
            className={`flex items-center w-full rounded-xl py-3 text-brand-muted hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-bold active:scale-95 ${isCollapsed ? 'justify-center' : 'px-4 gap-4'}`}
          >
            <LifeBuoy size={20} />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Soporte</span>}
          </button>

          <button 
            onClick={toggleTheme}
            className={`flex items-center w-full rounded-xl py-3 text-brand-muted hover:text-amber-500 hover:bg-amber-500/5 transition-all font-bold active:scale-95 ${isCollapsed ? 'justify-center' : 'px-4 gap-4'}`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">{theme === 'dark' ? 'Modo Luz' : 'Modo Oscuro'}</span>}
          </button>

          <button 
            onClick={logout}
            className={`flex items-center w-full rounded-xl py-3 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all font-bold active:scale-95 ${isCollapsed ? 'justify-center' : 'px-4 gap-4'}`}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Salir</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header Dinámico */}
        <header className="h-20 bg-brand-panel border-b border-brand-border flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[8px] font-black text-brand-muted uppercase tracking-[0.2em]">
                {currentUser?.storeName || 'SISTEMA'} // {currentUser?.username}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 max-w-[300px] w-full hidden md:flex">
            <div className="flex justify-between w-full text-[8px] font-black uppercase tracking-widest text-brand-muted">
              <span>Utilidad Bruta vs Gasto Diario</span>
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
        <main className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar space-y-10">
          {children}

          <footer className="pt-20 pb-10 border-t border-brand-border text-[9px] font-black text-brand-muted uppercase tracking-[0.5em] text-center opacity-20">
            TEIKON OS // CORE INTELLIGENCE v2.9.1
          </footer>
        </main>
      </div>

      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
};

export default Layout;
