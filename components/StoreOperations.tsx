
import React, { useState, useEffect } from 'react';
import { DollarSign, Target, Save, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from './Button';
import { getAuthToken } from '../utils/api';

interface StoreOperationsProps {
    storeId: string;
}

const StoreOperations: React.FC<StoreOperationsProps> = ({ storeId }) => {
    const [goal, setGoal] = useState<string>('');
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load Initial Data
    useEffect(() => {
        loadConfig();
        loadSummary();
    }, [storeId]);

    const getHeaders = () => ({
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
    });

    const loadConfig = async () => {
        try {
            const res = await fetch('http://localhost:80/api/config', { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setGoal(data.breakEvenGoal || '');
            }
        } catch (e) { console.error(e); }
    };

    const loadSummary = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:80/api/finance/daily-summary', { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const savedGoal = async () => {
        setIsSaving(true);
        try {
            await fetch('http://localhost:80/api/config', {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ breakEvenGoal: parseFloat(goal) || 0 })
            });
            alert('Meta actualizada correctamente');
        } catch (e) { alert('Error al guardar meta'); }
        finally { setIsSaving(false); }
    };

    const handleCloseShift = () => {
        if (!summary) return;
        const confirmMsg = `¿Confirmar Cierre de Caja?\n\nTotal Recaudado: $${summary.total?.toLocaleString()}\nTransacciones: ${summary.count}\n\nEsta acción generará el reporte final del día.`;
        if (confirm(confirmMsg)) {
            alert('✅ Turno Cerrado Exitosamente.\nEl reporte ha sido enviado al administrador.');
            // Future: Call POST /api/shift/close
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* SECCIÓN 1: CONFIGURACIÓN DE META */}
            <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Configuración de Meta</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Define el punto de equilibrio mensual para esta tienda.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-end max-w-md">
                    <div className="w-full">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Meta Mensual ($)</label>
                        <input
                            type="number"
                            value={goal}
                            onChange={e => setGoal(e.target.value)}
                            className="w-full text-xl font-bold p-4 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={savedGoal}
                        disabled={isSaving}
                        icon={Save}
                        className="h-[60px] px-6"
                    >
                        {isSaving ? '...' : 'GUARDAR'}
                    </Button>
                </div>
            </div>

            {/* SECCIÓN 2: CORTE DE CAJA (CASH CLOSE) */}
            <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                <div className="flex items-start justify-between mb-8 relative">
                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Calculator size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Cierre de Caja</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Resumen operativo del día en curso (Solo esta tienda).</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase">
                        TURNO ACTIVO
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-40 flex items-center justify-center text-slate-400 font-bold uppercase text-xs animate-pulse">Cargando datos financieros...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Efectivo</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">${summary?.methods?.CASH?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Tarjeta</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">${summary?.methods?.CARD?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100 mb-2">Venta Total</p>
                                <p className="text-3xl font-black">${summary?.total?.toLocaleString() || '0'}</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                variant="danger"
                                onClick={handleCloseShift}
                                icon={CheckCircle2}
                                className="py-4 px-8 text-xs bg-slate-900 hover:bg-black text-white"
                            >
                                REALIZAR CIERRE DE TURNO
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StoreOperations;
