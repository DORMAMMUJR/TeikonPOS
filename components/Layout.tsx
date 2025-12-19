
import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, History, Target, Sun, Moon } from 'lucide-react';
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
  const { currentUser, logout, getDashboardStats, settings } = useStore();
  const { theme, toggleTheme } = useTheme();

  const stats = getDashboardStats('month');
  const breakEvenRevenue = settings.monthlyFixedCosts / (settings.targetMargin || 1);
  const breakEvenProgress = Math.min((stats.totalRevenue / breakEvenRevenue) * 100, 100);

  const isHealthy = breakEvenProgress >= 50;
  const barColorClass = isHealthy ? 'bg-green-500' : 'bg-red-500';
  const glowShadow = isHealthy 
    ? '0 0 15px rgba(34, 197, 94, 0.6)' 
    : '0 0 15px rgba(239, 68, 68, 0.6)';

  const navItems = [
    { id: 'dashboard', label: 'METRICAS', icon: LayoutDashboard },
    { id: 'pos', label: 'PUNTO DE VENTA', icon: ShoppingCart },
    { id: 'history', label: 'HISTORIAL DE VENTAS', icon: History },
    { id: 'products', label: 'INVENTARIO', icon: Package },
    { id: 'settings', label: 'FINANZAS', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text transition-all duration-500 flex flex-col">
      <header className="bg-brand-bg border-b border-brand-border sticky top-0 z-50 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 relative">
          
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="absolute top-0 right-4 p-3 bg-brand-panel border border-brand-border cut-corner-sm hover:scale-110 transition-transform active:scale-90"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-brand-text/5 blur-3xl rounded-full"></div>
              <TeikonLogo size={70} className="relative transition-all duration-700 hover:scale-105" />
            </div>
            
            <TeikonWordmark height={30} className="text-brand-text" />
            
            <div className="flex items-center gap-3 text-[8px] font-black text-brand-muted uppercase tracking-[0.5em]">
              <div className="w-8 h-[1px] bg-brand-border"></div>
              <span>OPERADOR : {currentUser?.department || 'CORE'}</span>
              <div className="w-8 h-[1px] bg-brand-border"></div>
            </div>
          </div>

          <div className="mt-8 max-w-md mx-auto px-4">
            <div className="flex justify-between items-end mb-1 px-1">
              <span className="text-[7px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-1">
                <Target size={8} className="text-brand-text" /> UMBRAL DE RENTABILIDAD
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
                {breakEvenProgress.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2.5 w-full bg-brand-text/10 cut-corner-sm overflow-hidden border border-brand-border">
              <div 
                className={`absolute top-0 left-0 h-full ${barColorClass} transition-all duration-1000 ease-out`}
                style={{ 
                  width: `${breakEvenProgress}%`, 
                  zIndex: 10,
                  boxShadow: glowShadow
                }}
              />
              <div 
                className="absolute top-0 bottom-0 w-[1.5px] bg-brand-text z-20 shadow-[0_0_5px_currentColor]"
                style={{ left: '99%' }} 
              />
            </div>
          </div>

          <nav className="flex justify-center items-center gap-4 md:gap-8 mt-6 overflow-x-auto no-scrollbar pb-2">
            {navItems.map(item => {
              if (item.adminOnly && currentUser?.role !== 'admin') return null;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em] transition-all border-b-2 whitespace-nowrap ${
                    active 
                      ? 'border-brand-text text-brand-text' 
                      : 'border-transparent text-brand-muted hover:text-brand-text'
                  }`}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <item.icon size={16} className="sm:hidden" />
                </button>
              );
            })}
            <div className="w-[1px] h-4 bg-brand-border mx-2"></div>
            <button 
              onClick={logout} 
              className="p-2 text-brand-muted hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10 w-full animate-in fade-in duration-1000">
        {children}
      </main>
      
      <footer className="mt-auto border-t border-brand-border p-6 text-center">
        <p className="text-[8px] font-bold text-brand-muted uppercase tracking-[0.6em]">
          TEIKON OS // SECURE PROTOCOL TERMINAL
        </p>
      </footer>
    </div>
  );
};

export default Layout;
