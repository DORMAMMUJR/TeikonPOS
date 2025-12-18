
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, UserCircle, Moon, Sun, TrendingUp, History, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, logout, getDashboardStats, settings } = useStore();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const stats = getDashboardStats('month');
  const breakevenTarget = settings.targetMargin > 0 ? settings.monthlyFixedCosts / settings.targetMargin : 0;
  const progressPercent = breakevenTarget > 0 ? (stats.totalRevenue / breakevenTarget) * 100 : 0;

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-indigo-500' },
    { id: 'pos', label: 'Ventas', icon: ShoppingCart, color: 'bg-emerald-500' },
    { id: 'history', label: 'Historial', icon: History, color: 'bg-purple-500' },
    { id: 'products', label: 'Productos', icon: Package, color: 'bg-blue-500' },
    { id: 'settings', label: 'Finanzas', icon: Settings, adminOnly: true, color: 'bg-slate-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">TeikonPOS</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">
                Dept: {currentUser?.department}
              </p>
            </div>
          </div>

          <div className="flex-1 w-full md:px-8">
            <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase text-gray-400">
              <span>Progreso de Meta</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
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
                  className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                    active ? `${item.color} text-white shadow-lg` : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                  }`}
                >
                  <item.icon size={18} />
                  <span className={`text-xs font-bold ${active ? 'block' : 'hidden lg:block'}`}>{item.label}</span>
                </button>
              );
            })}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-400 hover:text-yellow-500 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={logout} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={20} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
