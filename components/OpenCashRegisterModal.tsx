import React, { useState } from 'react';
import { Modal, Button } from '../src/components/ui';
import { DollarSign, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface OpenCashRegisterModalProps {
    isOpen: boolean;
    onSuccess: () => void;
}

const OpenCashRegisterModal: React.FC<OpenCashRegisterModalProps> = ({ isOpen, onSuccess }) => {
    const { currentUser, openSession, isOpeningSession } = useStore();
    const [initialAmount, setInitialAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleOpenCashRegister = async () => {
        // Validate input
        const amount = parseFloat(initialAmount);

        if (isNaN(amount) || amount < 0) {
            setError('Por favor, ingresa un monto válido (mayor o igual a 0)');
            return;
        }

        try {
            setError(null);
            await openSession(amount);

            // Success - reset form and notify parent
            setInitialAmount('');
            onSuccess();
        } catch (err: any) {
            console.error('Error opening cash register:', err);
            setError(err.message || 'Error al abrir la caja. Por favor, intenta nuevamente.');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isOpeningSession) {
            handleOpenCashRegister();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { }} title="">
            <div className="space-y-6 p-2">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-emerald-500/10 rounded-full border-2 border-emerald-500/20">
                            <DollarSign className="h-10 w-10 text-emerald-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                        Apertura de Turno
                    </h2>
                    <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                        {currentUser?.storeName || 'Sistema POS'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-600">{error}</p>
                        </div>
                    </div>
                )}

                {/* Input Section */}
                <div className="space-y-3">
                    <label className="block">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-2 block">
                            Fondo Inicial
                        </span>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-brand-muted">
                                $
                            </span>
                            <input
                                type="number"
                                autoFocus
                                disabled={isOpeningSession}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 cut-corner p-6 pl-14 text-4xl font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="0.00"
                                value={initialAmount}
                                onChange={(e) => {
                                    setInitialAmount(e.target.value);
                                    setError(null); // Clear error on input change
                                }}
                                onKeyPress={handleKeyPress}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </label>
                    <p className="text-[10px] font-medium text-brand-muted uppercase tracking-wider">
                        Ingresa el monto en efectivo con el que inicia la caja
                    </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                    <Button
                        fullWidth
                        variant="primary"
                        disabled={isOpeningSession || !initialAmount}
                        className="py-5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleOpenCashRegister}
                    >
                        {isOpeningSession ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Abriendo Caja...
                            </span>
                        ) : (
                            'ABRIR CAJA'
                        )}
                    </Button>
                </div>

                {/* Footer Info */}
                <div className="text-center">
                    <p className="text-[8px] font-black text-brand-muted uppercase tracking-[0.4em]">
                        SISTEMA TEIKON v2.9.1 SECURE
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default OpenCashRegisterModal;
