
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Target, ShieldAlert, CheckCircle2, Briefcase } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { getDashboardStats, products, settings, calculateTotalInventoryValue, isOnline } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getDashboardStats('day');
        setStats(data);
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getDashboardStats]);

  const dailyFixedCost = (settings?.monthlyFixedCosts || 0) / 30;
  const dailyGrossProfit = stats?.totalProfit || 0;
  const netDailyProfit = dailyGrossProfit - dailyFixedCost;
  const totalInventoryValue = calculateTotalInventoryValue();

  const isProfitable = netDailyProfit > 0;
  const isBreakeven = Math.abs(netDailyProfit) < 0.01;

  // Safe filtering for undefined products
  const lowStockProducts = (products || []).filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock);

  const kpis = [
    { label: 'Facturación Hoy', val: `$${(stats?.totalRevenue || 0).toLocaleString()}`, icon: ShoppingBag, color: 'text-brand-emerald' },
    { label: 'Capital Inventario', val: `$${(totalInventoryValue || 0).toLocaleString()}`, icon: Briefcase, color: 'text-orange-500' },
    { label: 'Órdenes Totales', val: stats?.salesCount || 0, icon: Target, color: 'text-brand-purple' },
    { label: 'Inversión Mercancía', val: `$${(stats?.totalCost || 0).toLocaleString()}`, icon: DollarSign, color: 'text-slate-400' },
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
            <p className="text-xl font-black text-brand-purple">${(dailyGrossProfit || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
