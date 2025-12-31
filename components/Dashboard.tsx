
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Target, ShieldAlert, CheckCircle2, Briefcase, RefreshCw } from 'lucide-react';

interface DashboardStats {
  salesToday: number;
  ordersCount: number;
  grossProfit: number;
  netProfit: number;
  investment: number;
  dailyTarget: number;
  dailyOperationalCost: number;
}

interface DashboardProps {
  storeId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ storeId }) => {
  const { getDashboardStats, products, isOnline, sales } = useStore();
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
    fetchStats(false); // Don't show full loading state, just refresh icon
  };

  // Initial fetch + auto-refresh on sales changes + polling
  useEffect(() => {
    // Immediate fetch on mount
    fetchStats();

    // Polling: Refresh every 60 seconds
    const pollingInterval = setInterval(() => {
      console.log('📊 Dashboard auto-refresh (polling)');
      fetchStats(false); // Background refresh without loading state
    }, 60000); // 60 seconds

    return () => clearInterval(pollingInterval);
  }, [getDashboardStats, storeId, sales]); // Re-fetch when sales change

  const dailyFixedCost = stats?.dailyOperationalCost || 0;
  const netDailyProfit = stats?.netProfit || 0;
  const totalInventoryValue = stats?.investment || 0;
  const salesRevenue = stats?.salesToday || 0;

  const isProfitable = netDailyProfit > 0;
  const isBreakeven = Math.abs(netDailyProfit) < 0.01;

  // Safe filtering for undefined products
  const lowStockProducts = (products || []).filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock);

  const kpis = [
    { label: 'Facturación Hoy', val: `$${salesRevenue.toLocaleString()}`, icon: ShoppingBag, color: 'text-brand-emerald' },
    { label: 'Capital Inventario', val: `$${totalInventoryValue.toLocaleString()}`, icon: Briefcase, color: 'text-orange-500' },
    { label: 'Órdenes Totales', val: stats?.ordersCount || 0, icon: Target, color: 'text-brand-purple' },
    { label: 'Inversión Mercancía', val: `$${totalInventoryValue.toLocaleString()}`, icon: DollarSign, color: 'text-slate-400' },
  ];

  if (loading && !stats) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER WITH REFRESH BUTTON */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Dashboard</h2>
          {lastUpdate && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${isRefreshing
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-brand-purple text-white hover:bg-brand-purple/90 active:scale-95'
            }`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* TARJETA DE RESULTADO NETO (THEMED PURPLE) */}
      <div className="card-premium p-6 md:p-8 space-y-6 relative overflow-hidden bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 border-t-4 border-t-brand-purple">
        {/* Sutil resplandor de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">Utilidad Neta del Día</h4>
              {!isOnline && <span className="text-[10px] text-orange-500 font-bold">(Offline)</span>}
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-4xl md:text-6xl font-black tracking-tighter ${isProfitable ? 'text-brand-emerald' : netDailyProfit < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'
                }`}>
                ${(netDailyProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs font-bold text-brand-muted">MXN</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isProfitable ? 'bg-brand-emerald/10 text-brand-emerald' : isBreakeven ? 'bg-brand-blue/10 text-brand-blue' : 'bg-red-500/10 text-red-500'
              }`}>
              {isProfitable ? <CheckCircle2 size={14} /> : <TrendingUp size={14} />}
              {isProfitable ? 'En Ganancias' : isBreakeven ? 'Punto de Equilibrio' : 'Déficit'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">Costo Operativo Diario</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">${dailyFixedCost.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-brand-purple/5 dark:bg-brand-purple/10 rounded-2xl border border-brand-purple/20 dark:border-brand-purple/20">
            <p className="text-[10px] font-black text-brand-purple uppercase tracking-widest mb-1">Utilidad Bruta Generada</p>
            <p className="text-xl font-black text-brand-purple">${(stats?.grossProfit || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="card-premium p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:translate-y-[-4px] transition-all">
            <div className={`p-2.5 w-fit rounded-xl mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${kpi.color}`}>
              <kpi.icon size={20} />
            </div>
            <h5 className="text-[10px] font-black text-brand-muted uppercase tracking-widest mb-1">{kpi.label}</h5>
            <p className="text-2xl font-black text-slate-900 dark:text-white truncate">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* ALERTAS */}
      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/30 p-6 rounded-3xl flex items-center gap-5">
          <div className="p-4 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
            <ShieldAlert className="text-white h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Alerta de Suministros</h4>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase leading-relaxed">
              {lowStockProducts.length} productos críticos requieren reposición inmediata.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
