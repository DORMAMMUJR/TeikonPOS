import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Settings, LogOut, UserCircle, Moon, Sun, TrendingUp, History } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUserRole, switchRole, getDashboardStats, settings } = useStore();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Calculate Breakeven for Global Header
  const stats = getDashboardStats('month');
  const monthlyFixedCosts = settings.monthlyFixedCosts;
  const contributionMargin = settings.targetMargin || 0.30;
  const breakevenTarget = contributionMargin > 0 ? monthlyFixedCosts / contributionMargin : 0;
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-indigo-500 hover:bg-indigo-600' },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, color: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'history', label: 'Historial', icon: History, color: 'bg-purple-500 hover:bg-purple-600' },
    { id: 'products', label: 'Productos', icon: Package, color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true, color: 'bg-slate-500 hover:bg-slate-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      
      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            
            {/* Logo & Role */}
            <div className="flex items-center gap-4 min-w-fit">
               <div className="flex items-center text-blue-600 dark:text-blue-400">
                <ShoppingCart className="h-8 w-8" />
                <span className="ml-2 text-2xl font-extrabold tracking-tight">TeikonPOS</span>
              </div>
              <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-500 dark:text-gray-300">
                 <UserCircle size={14} />
                 <span>{currentUserRole === 'admin' ? 'Admin' : 'Vendedor'}</span>
              </div>
            </div>

            {/* Global Breakeven Widget */}
            <div className="flex-1 w-full md:mx-6">
              <div className="flex justify-between items-center text-xs mb-1">
                 <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                    <TrendingUp size={12}/> Meta Mensual (PE)
                 </span>
                 <span className="font-bold text-gray-700 dark:text-gray-200">
                    {progressPercent.toFixed(1)}% ({stats.totalRevenue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })})
                 </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                 <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      progressPercent >= 100 
                      ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.7)]' 
                      : 'bg-gradient-to-r from-blue-400 to-indigo-600'
                    }`}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                 ></div>
              </div>
            </div>

            {/* Navigation Buttons & Actions */}
            <div className="flex flex-wrap justify-center items-center gap-2">
               {navItems.map((item) => {
                  if (item.adminOnly && currentUserRole !== 'admin') return null;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${
                        isActive 
                          ? `${item.color} text-white ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-900 ring-blue-400 scale-105` 
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <item.icon className={`mr-2 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
                
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 hidden md:block"></div>

                {/* Dark Mode Toggle */}
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full text-gray-500 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Cambiar Tema"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Role Toggle */}
                <button 
                  onClick={() => switchRole(currentUserRole === 'admin' ? 'seller' : 'admin')}
                  className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Cambiar Rol"
                >
                  <LogOut size={20} />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-transparent animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;