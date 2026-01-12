import React from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface POSHeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const POSHeader: React.FC<POSHeaderProps> = ({
    searchTerm,
    setSearchTerm,
    searchInputRef
}) => {
    const { getDashboardStats, settings } = useStore();
    const [stats, setStats] = React.useState<any>({ totalRevenue: 0 });

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getDashboardStats('day');
                setStats(data || { totalRevenue: 0 });
            } catch (error) {
                console.error("Error fetching POS header stats", error);
            }
        };
        fetchStats();
        // No polling needed - data updates via StoreContext background sync
    }, [getDashboardStats]);

    // Get sales goal from localStorage or default to 10000
    const dailyGoal = parseFloat(localStorage.getItem('dailySalesGoal') || '10000');
    const currentRevenue = stats.totalRevenue || 0;
    const progressPercent = dailyGoal > 0 ? Math.min(Math.max((currentRevenue / dailyGoal) * 100, 0), 100) : 0;

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
                    />
                </div>
            </div>

            {/* CENTER: Sales Goal Progress */}
            <div className="hidden md:flex flex-col items-center gap-1.5 min-w-[280px]">
                <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>Meta Diaria</span>
                    <span className="text-slate-900 dark:text-white">
                        Vendido: ${currentRevenue.toFixed(0)} / Meta: ${dailyGoal.toFixed(0)}
                    </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full relative overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

        </div>
    );
};

export default POSHeader;
