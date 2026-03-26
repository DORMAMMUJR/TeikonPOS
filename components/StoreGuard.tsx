import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import InitialConfig from './InitialConfig';
import OpenCashRegisterModal from './OpenCashRegisterModal';

interface StoreGuardProps {
    children: React.ReactNode;
}

const StoreGuard = ({ children }: StoreGuardProps) => {
    const { currentUser, currentSession, isRecoveringSession } = useStore();

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
    // If no active session, show the cash register opening modal
    if (!currentSession) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <OpenCashRegisterModal
                    isOpen={true}
                    onSuccess={() => {
                        // Modal will automatically hide when session is created
                        // The StoreGuard will re-render and show children
                        console.log('✅ Cash register opened successfully');
                    }}
                />
            </div>
        );
    }

    return <>{children}</>;
};

export default StoreGuard;
