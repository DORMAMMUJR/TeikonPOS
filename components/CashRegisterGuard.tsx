import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingBag, Lock, Power } from 'lucide-react';
import Button from './Button';

interface CashRegisterGuardProps {
    children: React.ReactNode;
}

const CashRegisterGuard: React.FC<CashRegisterGuardProps> = ({ children }) => {
    const { isCashRegisterOpen, isLoading, isRecoveringSession, currentUser, isOpeningSession, openSession } = useStore();
    const [openingBalance, setOpeningBalance] = useState('');

    // 1. Mostrar loading mientras recuperamos el estado
    if (isLoading || isRecoveringSession) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-emerald"></div>
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Verificando estado de caja...</p>
                </div>
            </div>
        );
    }

    // 2. Si la caja está cerrada, mostrar Modal de Apertura
    if (!isCashRegisterOpen) {
        return (
            <div className="flex h-full items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="max-w-md w-full bg-white dark:bg-brand-panel border border-slate-200 dark:border-brand-border p-10 cut-corner shadow-2xl">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-200 dark:border-brand-border">
                            <Power className="h-10 w-10 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white">Apertura de Terminal</h2>
                            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-2">
                                Nodo Activo: {currentUser?.storeName}
                            </p>
                            <p className="text-[10px] font-medium text-brand-muted uppercase mt-1">
                                Ingrese el fondo de caja inicial para comenzar
                            </p>
                        </div>
                        <div className="w-full relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-brand-muted">$</span>
                            <input
                                type="number"
                                autoFocus
                                disabled={isOpeningSession}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cut-corner p-6 pl-14 text-4xl font-black text-slate-900 dark:text-white outline-none focus:border-brand-purple transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="0.00"
                                value={openingBalance}
                                onChange={e => setOpeningBalance(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isOpeningSession) {
                                        openSession(parseFloat(openingBalance) || 0);
                                    }
                                }}
                            />
                        </div>
                        <Button
                            fullWidth
                            variant="primary"
                            disabled={isOpeningSession}
                            className="py-5 bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => openSession(parseFloat(openingBalance) || 0)}
                        >
                            {isOpeningSession ? 'Iniciando...' : 'Iniciar Operaciones'}
                        </Button>
                        <p className="text-[8px] font-black text-brand-muted uppercase tracking-[0.4em]">SISTEMA TEIKON v2.9.1 SECURE</p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Si todo está en orden, mostrar el contenido (POS)
    return <>{children}</>;
};

export default CashRegisterGuard;
