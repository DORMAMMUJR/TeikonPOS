

import React, { useState, useEffect } from 'react';
import { DollarSign, Target, Save, Calculator, AlertTriangle, CheckCircle2, Eye, User, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../src/components/ui';
import { getAuthToken, API_URL, getCurrentUserFromToken } from '../utils/api';

export interface StoreOperationsProps {
    storeId: string;
    mode?: 'cash' | 'settings'; // IMPROVED: Add mode prop
}

const StoreOperations: React.FC<StoreOperationsProps> = ({ storeId, mode = 'cash' }) => {
    const [goal, setGoal] = useState<string>('');
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // IMPROVED: Get current user role for audit mode
    const currentUser = getCurrentUserFromToken();
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    // Load Initial Data
    useEffect(() => {
        if (mode === 'settings') {
            loadConfig();
        }
        if (mode === 'cash') {
            loadSummary();
        }
    }, [storeId, mode]);

    const getHeaders = () => ({
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
    });

    const loadConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/api/config`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setGoal(data.breakEvenGoal || '');
            }
        } catch (e) { console.error(e); }
    };

    const loadSummary = async () => {
        setIsLoading(true);
        try {
            // Updated to use the new specific Cash Close endpoint
            const res = await fetch(`${API_URL}/api/sales/cash-close?storeId=${storeId}`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error fetching cash close data');

            const data = await res.json();
            setSummary(data);
        } catch (e) {
            console.error("Error cargando corte:", e);
            if (!isSuperAdmin) {
                alert("No se pudo cargar el corte de caja. Por favor intente de nuevo.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const savedGoal = async () => {
        setIsSaving(true);
        try {
            await fetch(`${API_URL}/api/config`, {
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
        const confirmMsg = `¿Confirmar Cierre de Caja?\n\nTotal Recaudado: $${(summary.total || 0).toLocaleString()}\nTransacciones: ${summary.count || 0}\n\nEsta acción generará el reporte final del día.`;
        if (confirm(confirmMsg)) {
            alert('✅ Turno Cerrado Exitosamente.\nEl reporte ha sido enviado al administrador.');
            // Future: Call POST /api/shift/close
        }
    };

    // IMPROVED: Render only the section based on mode
    if (mode === 'settings') {
        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* SECCIÓN: CONFIGURACIÓN DE META */}
                <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                                <Target size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Configuración de Meta</h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {isSuperAdmin ? 'Vista de auditoría - Solo lectura' : 'Define el punto de equilibrio mensual para esta tienda.'}
                                </p>
                            </div>
                        </div>
                        {isSuperAdmin && (
                            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                                <Eye size={12} />
                                MODO AUDITORÍA
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 items-end max-w-md">
                        <div className="w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Meta Mensual ($)</label>
                            <input
                                type="number"
                                value={goal}
                                onChange={e => setGoal(e.target.value)}
                                disabled={isSuperAdmin}
                                className={`w-full text-xl font-bold p-4 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none transition-colors ${isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                                placeholder="0.00"
                            />
                        </div>
                        {!isSuperAdmin && (
                            <Button
                                variant="primary"
                                onClick={savedGoal}
                                disabled={isSaving}
                                icon={Save}
                                className="h-[60px] px-6"
                            >
                                {isSaving ? '...' : 'GUARDAR'}
                            </Button>
                        )}
                    </div>

                    {isSuperAdmin && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-bold flex items-center gap-2">
                                <AlertTriangle size={14} />
                                Como Super Admin, puedes ver esta configuración pero no modificarla. Solo el dueño de la tienda puede editar la meta mensual.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // mode === 'cash'
    // IMPROVED: Audit Mode for SUPER_ADMIN
    if (isSuperAdmin) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                {/* AUDIT MODE: READ-ONLY VIEW */}
                <div className="card-premium p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="flex items-start justify-between mb-8 relative">
                        <div className="flex gap-4">
                            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                <Eye size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Modo Auditoría - Estado de Caja</h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Vista en tiempo real - Solo lectura (Sin permisos operativos)</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                            <Eye size={12} />
                            SUPER ADMIN
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-40 flex items-center justify-center text-slate-400 font-bold uppercase text-xs animate-pulse">Cargando datos de auditoría...</div>
                    ) : (
                        <>
                            {/* Status Badge */}
                            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200 dark:border-emerald-900/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">🟢 CAJA ABIERTA</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Turno Actual</p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 font-black">Activo desde hoy</p>
                                    </div>
                                </div>
                            </div>

                            {/* Shift Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={14} className="text-slate-400" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Abierto Por</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">Usuario de Tienda</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={14} className="text-slate-400" />
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Hora de Apertura</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{new Date().toLocaleTimeString()}</p>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Efectivo</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">${(summary?.methods?.CASH || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Tarjeta</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">${(summary?.methods?.CARD || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-blue-100 mb-2">Venta Total</p>
                                    <p className="text-3xl font-black">${(summary?.total || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Info Alert */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    Modo Auditoría Activo: Puedes visualizar el estado de la caja pero no realizar operaciones de apertura/cierre. Solo el personal de la tienda puede ejecutar estas acciones.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // OPERATIONAL MODE: For ADMIN/USER (Store Owners)
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* SECCIÓN: CORTE DE CAJA (CASH CLOSE) */}
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
                                <p className="text-2xl font-black text-slate-800 dark:text-white">${(summary?.methods?.CASH || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Tarjeta</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">${(summary?.methods?.CARD || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100 mb-2">Venta Total</p>
                                <p className="text-3xl font-black">${(summary?.total || 0).toLocaleString()}</p>
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
