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

    // 1. SUPER_ADMIN tiene pase libre siempre
    if (currentUser?.role === 'SUPER_ADMIN') {
        return <>{children}</>;
    }

    // 2. Verificar configuración inicial
    const isStoreConfigured = currentUser?.storeName && currentUser.storeName.trim() !== '';
    if (!isStoreConfigured) {
        return <InitialConfig />;
    }

    // 3. Esperar a que termine la recuperación de sesión para no mostrar el modal por error
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
        // Limpieza preventiva: Si llegamos aquí, el estado es inconsistente
        // Eliminamos cualquier sesión corrupta del localStorage para garantizar un inicio limpio
        localStorage.removeItem('cashSession');

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

    // Si hay sesión abierta, renderizar el contenido protegido (POS)
    return <>{children}</>;
};

export default StoreGuard;
