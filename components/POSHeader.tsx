import React from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface POSHeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onCloseShift?: () => void;
}

const POSHeader: React.FC<POSHeaderProps> = ({
    searchTerm,
    setSearchTerm,
    searchInputRef,
    onKeyDown,
    onCloseShift
}) => {
    const { sales, settings } = useStore();

    // ------------------------------------------------------------------
    // BARRA DE SALUD FINANCIERA (Financial Health / Break-Even Point)
    // ------------------------------------------------------------------
    // Concepto: Compara el progreso financiero (utilidad acumulada) 
    // contra el progreso temporal (días transcurridos del mes)
    // ------------------------------------------------------------------

    // 1. Obtener fecha actual y días del mes
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Enero)
    const currentDay = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 2. Calcular Progreso Temporal (Time Pace)
    // Porcentaje del tiempo transcurrido en el mes
    const timeProgressPercent = (currentDay / daysInMonth) * 100;

    // 3. Calcular Utilidad Real Acumulada del Mes (Accumulated Profit)
    // Filtrar solo ventas ACTIVAS del mes actual y sumar netProfit
    const monthlyProfit = sales
        .filter(sale => {
            const saleDate = new Date(sale.date);
            return (
                sale.status === 'ACTIVE' &&
                saleDate.getMonth() === currentMonth &&
                saleDate.getFullYear() === currentYear
            );
        })
        .reduce((sum, sale) => sum + (sale.netProfit || 0), 0);

    // 4. Meta Mensual: Gastos Fijos (Configurable desde Settings)
    const monthlyGoal = settings.monthlyFixedCosts || 30000; // Fallback: $30,000

    // 5. Calcular Progreso Financiero (Financial Progress)
    // Porcentaje de la meta alcanzada (máximo 100%)
    const financialProgressPercent = monthlyGoal > 0
        ? Math.min((monthlyProfit / monthlyGoal) * 100, 100)
        : 0;

    // 6. Determinar Estado de Salud Financiera (Health Status)
    // SUPERÁVIT: La utilidad va adelante del tiempo ✅
    // DÉFICIT: La utilidad va atrasada respecto al tiempo ⚠️
    const isHealthy = financialProgressPercent >= timeProgressPercent;

    // 7. Colores dinámicos según estado (Semáforo Visual)
    const progressColorClass = isHealthy
        ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]" // Verde
        : "bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";    // Rojo/Naranja

    return (
        <div className="bg-white dark:bg-slate-900 border-b-2 border-brand-emerald/20 px-4 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm">
            {/* LEFT: Search Bar */}
            <div className="flex-1 max-w-xs">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        ref={searchInputRef}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-brand-emerald outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                </div>
            </div>

            {/* CENTER: Financial Health Bar (Break-Even Indicator) */}
            <div className="hidden md:flex flex-col items-center gap-1.5 min-w-[320px]">
                {/* Labels superiores */}
                <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>Salud Financiera</span>
                    <span className={isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}>
                        ${monthlyProfit.toLocaleString()} / ${monthlyGoal.toLocaleString()}
                    </span>
                </div>

                {/* Contenedor de la Barra */}
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-visible border border-slate-200 dark:border-slate-700">

                    {/* CAPA A: Barra de Progreso Financiero (Utilidad Acumulada) */}
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative z-10 ${progressColorClass}`}
                        style={{ width: `${financialProgressPercent}%` }}
                        title={`Progreso Financiero: ${financialProgressPercent.toFixed(1)}%`}
                    />

                    {/* CAPA B: Marcador de Tiempo (Línea Vertical) */}
                    <div
                        className="absolute top-[-4px] bottom-[-4px] w-1 bg-slate-900/40 dark:bg-white/40 z-20 backdrop-blur-sm rounded-full pointer-events-none transition-all duration-500"
                        style={{ left: `${timeProgressPercent}%` }}
                        title={`Día ${currentDay} de ${daysInMonth} (${timeProgressPercent.toFixed(1)}% del mes)`}
                    >
                        {/* Etiqueta del día (visible en hover) */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                            Día {currentDay}
                        </div>
                    </div>

                </div>

                {/* Etiquetas inferiores (Status) */}
                <div className="w-full flex justify-between items-center px-1">
                    <span className="text-[8px] font-bold text-slate-400">Inicio Mes</span>
                    <span className={`text-[8px] font-bold ${isHealthy ? "text-emerald-500" : "text-orange-500"}`}>
                        {isHealthy ? "✅ SUPERÁVIT (EN CAMINO)" : "⚠️ DÉFICIT (ATRASADO)"}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400">Fin Mes</span>
                </div>
            </div>

            {/* RIGHT: Close Shift Button */}
            <div>
                <button
                    onClick={onCloseShift}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800 text-xs font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Cerrar Turno
                </button>
            </div>

        </div>
    );
};

export default POSHeader;
