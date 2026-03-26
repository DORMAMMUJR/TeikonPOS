import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Lock, DollarSign } from 'lucide-react';
import OpenCashRegisterModal from './OpenCashRegisterModal';

interface CashRegisterGuardProps {
    children: React.ReactNode;
}

/**
 * CashRegisterGuard Component
 * 
 * Purpose: Controls access to views that require an open cash register session.
 * 
 * Behavior:
 * - Shows loading spinner while recovering session from backend
 * - Shows "Caja Cerrada" message if no open session exists
 * - Renders children (POS view) if cash register is open
 */
const CashRegisterGuard: React.FC<CashRegisterGuardProps> = ({ children }) => {
    const { isCashRegisterOpen, isRecoveringSession, currentUser } = useStore();
    const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);

    // Show loading while recovering session from backend
    if (isRecoveringSession) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-brand-emerald mx-auto"></div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Verificando sesión de caja...
                    </p>
                </div>
            </div>
        );
    }

    // Show "Caja Cerrada" message if no open session
    if (!isCashRegisterOpen) {
        return (
            <>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="max-w-md w-full mx-4">
                        {/* Card Container */}
                        <div className="card-premium border-t-4 border-t-red-500 bg-white dark:bg-slate-900 shadow-2xl p-8 space-y-6">
                            {/* Icon */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                                    <div className="relative bg-red-500/10 p-6 rounded-full border-4 border-red-500/30">
                                        <Lock className="text-red-500" size={48} />
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Caja Cerrada
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                    Debes abrir una caja para realizar ventas
                                </p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                                <div className="flex items-start gap-3">
                                    <DollarSign className="text-brand-emerald mt-0.5 shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                                            Usuario: {currentUser?.username || 'N/A'}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Para comenzar a vender, abre una sesión de caja con el monto inicial disponible.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => setIsOpenCashModalOpen(true)}
                                className="w-full py-4 bg-brand-emerald hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
                            >
                                Abrir Caja
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cash Register Modal */}
                <OpenCashRegisterModal
                    isOpen={isOpenCashModalOpen}
                    onSuccess={() => setIsOpenCashModalOpen(false)}
                />
            </>
        );
    }

    // Render children if cash register is open
    return <>{children}</>;
};

export default CashRegisterGuard;
