import React from 'react';
import { AlertTriangle, Banknote, X, LogOut } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CashSession } from '../types';

interface OpenShiftWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called when user chooses to perform the cash register cut before logout */
    onGoToCloseShift: () => void;
}

/**
 * OpenShiftWarningModal
 * Shown when a user attempts to log out while a cash shift is still open.
 * Forces reconciliation before allowing logout.
 */
const OpenShiftWarningModal: React.FC<OpenShiftWarningModalProps> = ({
    isOpen,
    onClose,
    onGoToCloseShift,
}) => {
    const { currentSession } = useStore();

    if (!isOpen) return null;

    // Format start time for display
    const formatTime = (dateStr: string | Date | undefined) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '—';
        }
    };

    const formatMoney = (value: number | undefined) =>
        `$${(value ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-shift-warning-title"
        >
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header stripe */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <AlertTriangle className="text-white" size={22} />
                    </div>
                    <div className="flex-1">
                        <h2
                            id="open-shift-warning-title"
                            className="text-sm font-black text-white uppercase tracking-widest"
                        >
                            Turno de Caja Abierto
                        </h2>
                        <p className="text-[10px] text-white/80 font-bold mt-0.5">
                            Debes realizar el corte antes de cerrar sesión
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                        aria-label="Cancelar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        No puedes cerrar sesión mientras hay un{' '}
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                            turno de caja activo
                        </span>
                        . Realiza el corte de caja para conciliar el efectivo y garantizar
                        la integridad contable.
                    </p>

                    {/* Shift info card */}
                    {currentSession && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Banknote size={15} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                    Turno Activo
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider text-[9px]">
                                        Hora de Apertura
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {formatTime((currentSession as CashSession).startTime)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider text-[9px]">
                                        Fondo Inicial
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {formatMoney((currentSession as CashSession).startBalance)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider text-[9px]">
                                        Ventas Efectivo
                                    </span>
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        {formatMoney((currentSession as CashSession).cashSales)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider text-[9px]">
                                        Estado
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                                        ABIERTO
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning note */}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-center">
                        ⚠️ Cerrar sin corte puede causar descuadre contable
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-3">
                    {/* Cancel — stay logged in */}
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        CANCELAR
                    </button>

                    {/* Primary — go to close shift */}
                    <button
                        onClick={onGoToCloseShift}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                    >
                        <Banknote size={14} />
                        HACER CORTE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpenShiftWarningModal;
