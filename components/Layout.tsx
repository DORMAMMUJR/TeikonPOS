import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { TeikonLogo } from '../src/components/ui';
import SupportTicketModal from './SupportTicketModal';
import SalesGoalModal from './SalesGoalModal';
import CloseShiftModal from './CloseShiftModal';
import ProfileSettings from './ProfileSettings';
import ConnectionStatus from './ConnectionStatus';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, getDashboardStats, settings, sales, logout } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCashCloseOpen, setIsCashCloseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [stats, setStats] = useState<any>({ salesToday: 0, totalProfit: 0 });

  // Update document title dynamically
  useEffect(() => {
    const storeName = currentUser?.storeName || 'TeikonPOS';
    const pageTitle = getPageTitle();
    document.title = `${storeName} - ${pageTitle}`;
  }, [currentUser, activeTab]);

  // Fetch dashboard stats - updates when sales change or settings change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats('day');
        setStats(data || { salesToday: 0, totalProfit: 0 });
      } catch (error) {
        console.error("Error fetching layout stats", error);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [getDashboardStats, sales, settings]); // Added sales and settings as dependencies

  // Calculate daily target from store config (break-even goal / 30)
  const dailyTarget = (settings.monthlyFixedCosts || 0) / 30;

  // Use salesToday for progress calculation (not totalProfit)
  const currentSales = stats.salesToday || 0;

  // Calculate progress percentage with bounds checking
  const progressPercent = dailyTarget > 0
    ? Math.min(Math.max((currentSales / dailyTarget) * 100, 0), 100)
    : 0;

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

  // Extracted style for progress bar to satisfy Webhint linter
  const progressBarStyle = { width: `${progressPercent}%` };

  return (
    <div className="flex h-[100dvh] bg-brand-bg text-brand-text overflow-hidden transition-colors duration-500">

      <ConnectionStatus />

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden bg-brand-panel border-b border-brand-border px-4 py-3 flex justify-between items-center shrink-0 z-[60] shadow-sm fixed top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 text-brand-text rounded-lg active:bg-slate-100 dark:active:bg-slate-800 focus:outline-none"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              {currentUser?.storeName || 'TeikonPOS'}
            </h1>
            <span className="text-[10px] font-bold text-brand-muted">
              Hola, {currentUser?.fullName || currentUser?.username}
            </span>
          </div>
        </div>
      </div>

      {/* --- SIDEBAR (Desktop) / DRAWER (Mobile) --- */}
      <div className={`
        fixed inset-y-0 left-0 z-[70] transform transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleMobileNav}
          onOpenGoalModal={() => setIsGoalModalOpen(true)}
          onOpenCashClose={() => setIsCashCloseOpen(true)}
          onOpenSupport={() => setIsSupportModalOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>

      {/* Overlay para cerrar drawer en móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[65] md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 relative w-full h-full bg-brand-bg mt-14 md:mt-0">

        {/* Top Header */}
        <header className="h-14 md:h-20 bg-brand-panel border-b border-brand-border flex items-center justify-between px-4 md:px-8 shrink-0 z-40 sticky top-0">
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">
              {getPageTitle()}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-base md:text-2xl font-black text-blue-600 dark:text-blue-400 truncate">
                {currentUser?.storeName || 'SISTEMA'}
              </span>
              <span className="hidden md:inline text-xs font-bold text-brand-muted">
                • Hola, {currentUser?.fullName || currentUser?.username}
              </span>
            </div>
          </div>

          {/* Daily Goal Progress */}
          <div className="flex flex-col items-end gap-1.5 max-w-[150px] md:max-w-[300px] w-full hidden sm:flex">
            <div className="flex justify-between w-full text-[8px] font-black uppercase tracking-widest text-brand-muted">
              <span>Meta Diaria</span>
              <span className="text-slate-900 dark:text-white">${currentSales.toFixed(0)} / ${dailyTarget.toFixed(0)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full relative overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
              {/* eslint-disable-next-line webhint/no-inline-styles */}
              <div
                className="h-full bg-brand-purple transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                style={progressBarStyle}
              />
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 min-h-full pb-20">
            {children}

            <footer className="pt-8 pb-4 border-t border-brand-border text-[9px] font-black text-brand-muted uppercase tracking-[0.5em] text-center opacity-30 select-none">
              TEIKON OS // CORE INTELLIGENCE v2.9.2
            </footer>
          </div>
        </main>
      </div>

      {/* Modals */}
      <SupportTicketModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
      <SalesGoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />
      <CloseShiftModal
        isOpen={isCashCloseOpen}
        onClose={() => setIsCashCloseOpen(false)}
        onShiftClosed={() => {
          setIsCashCloseOpen(false);
          logout();
          window.location.href = '/login';
        }}
      />
      {isProfileOpen && <ProfileSettings onClose={() => setIsProfileOpen(false)} />}
    </div>
  );
};

export default Layout;
