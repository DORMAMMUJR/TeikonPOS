import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Power } from 'lucide-react';
import Button from './Button';
import InitialConfig from './InitialConfig';

interface StoreGuardProps {
    children: React.ReactNode;
}

const StoreGuard = ({ children }: StoreGuardProps) => {
    const { currentUser, currentSession, openSession, isRecoveringSession, isOpeningSession } = useStore();
    const [openingBalance, setOpeningBalance] = useState('');

    // IMPROVED: SUPER_ADMIN bypasses ALL checks (onboarding + session)
    // They can access the system without opening a shift
    if (currentUser?.role === 'SUPER_ADMIN') {
        console.log('👑 SUPER_ADMIN detected in StoreGuard - Granting full access');
        return <>{children}</>;
    }

    // Check Onboarding (only for ADMIN/USER)
    const isStoreConfigured = currentUser?.storeName && currentUser.storeName.trim() !== '';
    if (!isStoreConfigured) {
        return <InitialConfig />;
    }

    // CRITICAL FIX: Wait for session recovery before showing modal
    // This prevents the "amnesia" bug where the system forgets the open shift on reload
    if (isRecoveringSession) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
                    <p className="text-sm text-brand-muted">Verificando sesión...</p>
                </div>
            </div>
        );
    }

    // Check Session (only for ADMIN/USER)
    if (!currentSession) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-brand-panel border border-slate-200 dark:border-brand-border p-10 cut-corner shadow-2xl animate-in zoom-in duration-500">
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

    return <>{children}</>;
};

export default StoreGuard;
