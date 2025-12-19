
import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, History, Sun, Moon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import TeikonLogo from './TeikonLogo';
import TeikonWordmark from './TeikonWordmark';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, logout, settings, getDashboardStats } = useStore();
  const { theme, toggleTheme } = useTheme();

  // Lógica de Meta Operativa simplificada (Read-Only)
  const stats = getDashboardStats('day');
  const dailyTarget = settings.monthlyFixedCosts / 30;
  const currentProfit = stats.totalProfit;
  const progressPercent = Math.min(Math.max((currentProfit / dailyTarget) * 100, 0), 100);

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, color: 'bg-brand-purple' },
    { id: 'pos', label: 'Ventas', icon: ShoppingCart, color: 'bg-brand-emerald' },
    { id: 'history', label: 'Historial', icon: History, color: 'bg-brand-pink' },
    { id: 'products', label: 'Inventario', icon: Package, color: 'bg-orange-600' },
    { id: 'settings', label: 'Admin', icon: Settings, adminOnly: true, color: 'bg-brand-blue' },
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
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col transition-colors duration-500">
      {/* HEADER PRINCIPAL (SIN CAMBIOS) */}
      <header className="bg-brand-panel border-b border-brand-border sticky top-0 z-[60] px-4 md:px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <TeikonLogo size={32} />
          <div className="hidden lg:block">
            <TeikonWordmark height={14} className="text-slate-900 dark:text-white" />
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {navItems.map(item => {
            if (item.adminOnly && currentUser?.role !== 'admin') return null;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center h-10 px-3 rounded-full font-bold transition-all duration-300 group ${
                  active 
                    ? `active-pill ${item.color} text-white shadow-lg` 
                    : 'text-brand-muted hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="nav-pill-label text-xs">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleTheme} className="p-2 text-brand-muted hover:text-brand-text transition-colors rounded-lg">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="h-4 w-px bg-brand-border mx-1"></div>
          <button onClick={logout} className="p-2 text-brand-muted hover:text-red-500 transition-colors rounded-lg">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* SUB-HEADER SIMPLIFICADO: BARRA DE PROGRESO PROTAGONISTA */}
      <div className="bg-brand-panel border-b border-brand-border py-6 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-2">
            {/* Texto discreto sobre la barra */}
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">Utilidad Bruta vs Gasto Operativo Diario</span>
              <span className="text-[10px] font-black text-slate-800 dark:text-white font-mono">
                ${currentProfit.toFixed(0)} / <span className="text-brand-muted opacity-60">${dailyTarget.toFixed(0)}</span>
              </span>
            </div>

            {/* Barra de Progreso Robusta */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-lg relative overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
              {/* Relleno Morado Neón #A020F0 */}
              <div 
                className="h-full bg-[#A020F0] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(160,32,240,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Marcador Vertical Brillante */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white] transition-all duration-1000 ease-out z-10"
                style={{ left: `calc(${progressPercent}% - 1px)` }}
              />
            </div>

            {/* Porcentaje discreto debajo */}
            <div className="flex justify-end">
              <span className="text-[9px] font-black text-[#A020F0] tracking-widest">{progressPercent.toFixed(1)}% PUNTO DE EQUILIBRIO</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex items-end justify-between border-b-2 border-brand-border pb-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-brand-muted rounded text-[9px] font-black uppercase tracking-widest border border-brand-border">
                DEP: {currentUser?.department || 'GENERAL'}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-brand-muted rounded text-[9px] font-black uppercase tracking-widest border border-brand-border">
                USER: {currentUser?.username}
              </span>
            </div>
          </div>
        </div>

        {children}
      </main>

      <footer className="mt-auto py-10 border-t border-brand-border bg-brand-panel/30">
        <div className="max-w-7xl mx-auto px-6 text-[10px] font-black text-brand-muted uppercase tracking-[0.5em] text-center opacity-30">
          TEIKON OS // CORE INTELLIGENCE v2.9.1
        </div>
      </footer>
    </div>
  );
};

export default Layout;
