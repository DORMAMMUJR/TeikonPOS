
import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, History, Sun, Moon, LifeBuoy } from 'lucide-react';
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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

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
      <header className="bg-brand-panel border-b border-brand-border sticky top-0 z-[60] px-4 md:px-6 h-16 flex items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <TeikonLogo size={32} />
          <div className="hidden lg:block">
            <TeikonWordmark height={14} className="text-slate-900 dark:text-white" />
          </div>
        </div>

        {/* Navegación Refactorizada: Scroll horizontal en móviles */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-2">
          {navItems.map(item => {
            if (item.adminOnly && currentUser?.role !== 'admin') return null;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center h-10 px-3 rounded-full font-bold transition-all duration-300 group shrink-0 ${
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
          <button 
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-2 h-10 px-3 rounded-full text-brand-muted hover:text-indigo-500 hover:bg-indigo-500/5 transition-all font-bold"
            title="Soporte Técnico"
          >
            <LifeBuoy size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Soporte</span>
          </button>
        </div>
      </header>

      <div className="bg-brand-panel border-b border-brand-border py-6 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">Utilidad Bruta vs Gasto Operativo Diario</span>
              <span className="text-[10px] font-black text-slate-800 dark:text-white font-mono">
                ${currentProfit.toFixed(0)} / <span className="text-brand-muted opacity-60">${dailyTarget.toFixed(0)}</span>
              </span>
            </div>

            <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-lg relative overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
              <div 
                className="h-full bg-[#A020F0] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(160,32,240,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white] transition-all duration-1000 ease-out z-10"
                style={{ left: `calc(${progressPercent}% - 1px)` }}
              />
            </div>

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

      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
};

export default Layout;
