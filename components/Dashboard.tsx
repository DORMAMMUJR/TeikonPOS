
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Target, ShieldAlert, CheckCircle2, Briefcase, RefreshCw, Package, Zap, BarChart3 } from 'lucide-react';

interface DashboardStats {
  costoOperativo: number;
  ventaTotal: number;
  utilidadBruta: number;
  utilidadNeta: number;
  porcentajeEquilibrio: number;
}

interface DashboardProps {
  storeId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ storeId }) => {
  const { getDashboardStats, products, isOnline, sales, settings } = useStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch dashboard stats
  const fetchStats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getDashboardStats('day', storeId);
      setStats(data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Dashboard fetch error", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchStats(false);
  };

  // Initial fetch + auto-refresh on sales or settings changes
  useEffect(() => {
    fetchStats();
  }, [getDashboardStats, storeId, sales, settings]);

  const costoOperativo = stats?.costoOperativo || 0;
  const utilidadNeta = stats?.utilidadNeta || 0;
  const utilidadBruta = stats?.utilidadBruta || 0;
  const ventaTotal = stats?.ventaTotal || 0;
  const porcentajeEquilibrio = stats?.porcentajeEquilibrio || 0;

  const isProfitable = utilidadNeta > 0;
  const isBreakeven = Math.abs(utilidadNeta) < 0.01;
  const isCoveringCosts = utilidadBruta >= costoOperativo;

  // Safe filtering for undefined products
  const lowStockProducts = (products || []).filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock);
  const totalProducts = (products || []).filter(p => p.isActive).length;
  const todaySales = (sales || []).length;

  if (loading && !stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-72 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER WITH REFRESH BUTTON */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
          {lastUpdate && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${isRefreshing
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 active:scale-95 shadow-purple-500/30'
            }`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* TARJETA PRINCIPAL - UTILIDAD DEL DÍA CON GRADIENTE VIBRANTE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-8 shadow-2xl shadow-purple-500/30">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <h4 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">Utilidad del Día</h4>
                {!isOnline && <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">Offline</span>}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                  ${(utilidadBruta || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-lg font-bold text-white/80">MXN</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${isCoveringCosts
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
                }`}>
                {isCoveringCosts ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {isCoveringCosts ? 'Cubriendo Gastos' : 'Bajo Equilibrio'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <p className="text-xs font-black text-white/80 uppercase tracking-widest mb-2">Costo Operativo Diario</p>
              <p className="text-3xl font-black text-white">${costoOperativo.toFixed(2)}</p>
            </div>
            <div className={`p-5 rounded-2xl border backdrop-blur-md ${isProfitable
              ? 'bg-emerald-500/20 border-emerald-400/30'
              : 'bg-red-500/20 border-red-400/30'
              }`}>
              <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isProfitable ? 'text-emerald-100' : 'text-red-100'}`}>
                Utilidad Neta
              </p>
              <p className={`text-3xl font-black ${isProfitable ? 'text-emerald-50' : 'text-red-50'}`}>
                ${utilidadNeta.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <ShoppingBag size={28} className="opacity-90" />
            <span className="text-4xl font-black">{todaySales}</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wide opacity-90">Ventas Hoy</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Package size={28} className="opacity-90" />
            <span className="text-4xl font-black">{totalProducts}</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wide opacity-90">Productos Activos</p>
        </div>

        <div className={`rounded-2xl p-6 text-white shadow-lg hover:scale-105 transition-transform ${lowStockProducts.length > 0
          ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/30'
          : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/30'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle size={28} className="opacity-90" />
            <span className="text-4xl font-black">{lowStockProducts.length}</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wide opacity-90">Stock Bajo</p>
        </div>
      </div>

      {/* PROGRESS BAR - COBERTURA DE GASTOS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={18} />
              Cobertura de Gastos
            </h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">${utilidadBruta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">/ ${costoOperativo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-black ${isCoveringCosts ? 'text-emerald-500' : 'text-red-500'}`}>
              {Math.min(porcentajeEquilibrio, 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${isCoveringCosts
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-red-500 to-orange-500'
              }`}
            style={{ width: `${Math.min(porcentajeEquilibrio, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* ALERTAS */}
      {lowStockProducts.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-2 border-orange-300 dark:border-orange-600/50 p-6 rounded-2xl flex items-center gap-5 shadow-lg">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/30">
            <ShieldAlert className="text-white h-7 w-7" />
          </div>
          <div>
            <h4 className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">Alerta de Suministros</h4>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300 mt-1">
              {lowStockProducts.length} producto{lowStockProducts.length > 1 ? 's' : ''} requiere{lowStockProducts.length > 1 ? 'n' : ''} reposición inmediata
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
