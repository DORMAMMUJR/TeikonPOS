import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { getAuthToken, API_URL, getCurrentUserFromToken } from '../../../utils/api';

interface GoalComparativeProps {
    storeId: string;
}

interface MonthlyData {
    month: number;
    year: number;
    goal: number;
    sales: number;
}

const GoalComparative: React.FC<GoalComparativeProps> = ({ storeId }) => {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const currentUser = getCurrentUserFromToken();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    useEffect(() => {
        if (storeId) {
            fetchData();
        }

        const handleGoalUpdate = () => {
            fetchData();
        };

        window.addEventListener('goalUpdated', handleGoalUpdate);
        return () => window.removeEventListener('goalUpdated', handleGoalUpdate);
    }, [storeId, selectedYear]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            };

            // Fetch Goals
            const goalsRes = await fetch(`${API_URL}/api/stores/${storeId}/goal-history?year=${selectedYear}`, { headers });
            const goalsData = goalsRes.ok ? await goalsRes.json() : [];

            // Fetch Sales
            const salesRes = await fetch(`${API_URL}/api/stores/${storeId}/sales-history?year=${selectedYear}`, { headers });
            const salesData = salesRes.ok ? await salesRes.json() : [];

            // Combine Data
            const combined: MonthlyData[] = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const goalRecord = goalsData.find((g: any) => g.month === month);
                const salesRecord = salesData.find((s: any) => s.month === month);

                return {
                    month,
                    year: selectedYear,
                    goal: goalRecord ? parseFloat(goalRecord.amount) : 0,
                    sales: salesRecord ? parseFloat(salesRecord.totalSales) : 0
                };
            });

            setData(combined);
        } catch (error) {
            console.error('Error fetching comparative data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="text-indigo-500 animate-pulse" size={32} />
                    <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Analizando Histórico...</p>
                </div>
            </div>
        );
    }

    const currentMonthData = data[new Date().getMonth()];
    const currentMonthProgress = currentMonthData?.goal > 0
        ? (currentMonthData.sales / currentMonthData.goal) * 100
        : 0;

    // Find the max value (either goal or sales) to scale the chart
    const maxValue = Math.max(
        ...data.map(d => Math.max(d.goal, d.sales)),
        1000 // Minimum scale
    );

    return (
        <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] space-y-8 animate-fade-in-up">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            Rendimiento Histórico
                        </h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Ventas Reales vs. Meta de Equilibrio
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-black/20 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Calendar size={16} className="text-slate-400 ml-2" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none cursor-pointer pr-4"
                    >
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                        <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                    </select>
                </div>
            </div>

            {/* Current Month Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                        Meta Este Mes
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                        ${currentMonthData?.goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500 mb-1">
                        Ventas Reales
                    </p>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            ${currentMonthData?.sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {currentMonthData?.sales >= currentMonthData?.goal && currentMonthData?.goal > 0 ? (
                            <ArrowUpRight size={20} className="text-emerald-500" />
                        ) : (
                            <ArrowDownRight size={20} className="text-rose-500" />
                        )}
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900 dark:bg-black text-white shadow-xl shadow-slate-900/20 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 relative z-10">
                        Progreso Mensual
                    </p>
                    <div className="flex items-center gap-3 relative z-10">
                        <p className="text-3xl font-black">
                            {currentMonthProgress.toFixed(1)}%
                        </p>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden relative z-10">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${currentMonthProgress >= 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                            style={{ width: `${Math.min(currentMonthProgress, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Monthly Bar Chart */}
            <div className="pt-6">
                <div className="flex items-center justify-end gap-6 mb-8 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <span className="text-slate-500">Meta Objetivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/30" />
                        <span className="text-slate-700 dark:text-slate-300">Ventas Reales</span>
                    </div>
                </div>

                <div className="h-[250px] flex items-end justify-between gap-2 md:gap-4 relative pt-6">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-slate-100 dark:border-slate-800">
                        {[4, 3, 2, 1, 0].map((line, i) => (
                            <div key={i} className="w-full relative h-[1px] bg-slate-50 dark:bg-slate-800/50">
                                {i !== 4 && (
                                    <span className="absolute -top-2 -left-2 -translate-x-full text-[9px] font-bold text-slate-400">
                                        ${((maxValue / 4) * line).toLocaleString(undefined, { notation: "compact" })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Bars */}
                    {data.map((monthData, i) => {
                        const goalHeight = Math.max((monthData.goal / maxValue) * 100, 0);
                        const salesHeight = Math.max((monthData.sales / maxValue) * 100, 0);
                        const isCurrentMonth = new Date().getMonth() === i && selectedYear === new Date().getFullYear();

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 relative group z-10">
                                {/* Tooltip */}
                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 pt-2 transition-all bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-xl pointer-events-none z-20 whitespace-nowrap">
                                    Meta: ${monthData.goal.toLocaleString(undefined, { maximumFractionDigits: 0 })}<br />
                                    Real: ${monthData.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                </div>

                                <div className="w-full flex justify-center items-end h-[200px] gap-0.5 md:gap-1">
                                    {/* Goal Bar */}
                                    <div
                                        className="w-1/2 max-w-[16px] bg-slate-200 dark:bg-slate-700 rounded-t-sm transition-all duration-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                                        style={{ height: `${goalHeight}%` }}
                                    />
                                    {/* Sales Bar */}
                                    <div
                                        className={`w-1/2 max-w-[16px] rounded-t-sm transition-all duration-700 relative overflow-hidden ${monthData.sales >= monthData.goal && monthData.goal > 0
                                            ? 'bg-emerald-500 hover:bg-emerald-400'
                                            : 'bg-indigo-500 hover:bg-indigo-400'
                                            }`}
                                        style={{ height: `${salesHeight}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>
                                </div>
                                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${isCurrentMonth ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                    }`}>
                                    {monthNames[i]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default GoalComparative;
