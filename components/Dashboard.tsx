
import React from 'react';
import { useStore } from '../context/StoreContext';
import { DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Box, Target, ShieldAlert } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { getDashboardStats, products, settings } = useStore();
  const stats = getDashboardStats('month');
  const lowStockProducts = products.filter(p => p.isActive && p.stock > 0 && p.stock <= p.minStock);
  const negativeStockProducts = products.filter(p => p.isActive && p.stock < 0);

  const breakEvenRevenue = settings.monthlyFixedCosts / (settings.targetMargin || 1);
  const breakEvenProgress = Math.min((stats.totalRevenue / breakEvenRevenue) * 100, 100);
  const isBrokenEven = stats.totalRevenue >= breakEvenRevenue;

  const isHealthy = breakEvenProgress >= 50;
  const barColorClass = isHealthy ? 'bg-green-500' : 'bg-red-500';
  const glowShadow = isHealthy 
    ? '0 0 20px rgba(34, 197, 94, 0.4)' 
    : '0 0 20px rgba(239, 68, 68, 0.4)';

  return (
    <div className="space-y-12 pb-20">
      <div className="border-l-4 border-brand-text pl-6">
        <h2 className="text-3xl font-black uppercase tracking-[0.2em]">SITUACIÓN ACTUAL</h2>
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em] mt-2">Métricas globales de la red</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'INGRESOS TOTALES', val: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign },
          { label: 'UTILIDAD BRUTA', val: `$${stats.totalProfit.toLocaleString()}`, icon: TrendingUp },
          { label: 'ORDENES PROCESADAS', val: stats.salesCount, icon: ShoppingBag },
          { label: 'VALOR TICKET', val: `$${stats.ticketAverage.toFixed(2)}`, icon: Box },
        ].map((kpi, i) => (
          <div key={i} className="bg-brand-panel border border-brand-border p-8 cut-corner hover:bg-brand-text/5 transition-all group">
            <kpi.icon className="h-5 w-5 text-brand-muted group-hover:text-brand-text transition-colors mb-6" />
            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-xl font-black text-brand-text">{kpi.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-panel border border-brand-border p-10 cut-corner relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-brand-text" />
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-brand-text">EQUILIBRIO FINANCIERO</h3>
            </div>
            <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">PROGRESO HACIA LA RENTABILIDAD TOTAL</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest">OBJETIVO MENSUAL</p>
            <p className="text-xl font-black text-brand-text">${breakEvenRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative h-20 bg-brand-text/5 border border-brand-border cut-corner-sm flex items-center px-1">
          <div 
            className={`h-12 ${barColorClass} transition-all duration-1000 ease-out`}
            style={{ 
              width: `${breakEvenProgress}%`, 
              zIndex: 10,
              boxShadow: glowShadow 
            }}
          />
          
          <div 
            className="absolute top-0 bottom-0 w-[3px] bg-brand-text z-50 shadow-[0_0_20px_currentColor]"
            style={{ left: '99.5%' }}
          >
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-brand-text text-brand-bg px-4 py-2 text-[9px] font-black cut-corner-sm whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              UMBRAL DE EQUILIBRIO (100%)
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8 items-center">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isBrokenEven ? 'text-green-500' : 'text-brand-muted'}`}>
            {isBrokenEven ? 'ZONA DE UTILIDAD ACTIVA' : 'FASE DE RECUPERACIÓN'}
          </span>
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
              {breakEvenProgress.toFixed(1)}% COMPLETADO
            </span>
            <div className={`w-12 h-[1px] ${isHealthy ? 'bg-green-500/30' : 'bg-red-500/30'}`}></div>
          </div>
        </div>
      </div>

      {/* Alertas Críticas de Descuadre (Stock < 0) */}
      {negativeStockProducts.length > 0 && (
        <div className="bg-red-600 border-2 border-red-500 p-8 cut-corner shadow-[0_0_30px_rgba(220,38,38,0.2)]">
          <div className="flex items-center gap-3 mb-8 text-white">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-[0.3em]">DESCUADRES DE INVENTARIO DETECTADOS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {negativeStockProducts.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-black/20 border border-white/20 cut-corner-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">{p.name}</span>
                <span className="bg-white text-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest cut-corner-sm">
                  NEGATIVO: {p.stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-brand-panel border border-brand-border p-8 cut-corner opacity-80">
          <div className="flex items-center gap-3 mb-8 text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">ALERTAS DE SUMINISTRO</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-brand-text/5 border border-brand-border cut-corner-sm">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text/80">{p.name}</span>
                <span className="bg-yellow-500 text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest cut-corner-sm">
                  STOCK: {p.stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
