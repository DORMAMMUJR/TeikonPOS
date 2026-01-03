import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { DollarSign, AlertCircle, FileText, Calculator, Save } from 'lucide-react';
import { API_URL, getHeaders } from '../utils/api';

interface CloseShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShiftClosed?: () => void;
}

interface ShiftData {
    id: number;
    montoInicial: number;
    ventasEfectivo: number;
    gastos: number;
    montoEsperado: number;
    ventasTotales?: number;
}

const CloseShiftModal: React.FC<CloseShiftModalProps> = ({ isOpen, onClose, onShiftClosed }) => {


    const [loading, setLoading] = useState(false);
    const [shiftData, setShiftData] = useState<ShiftData | null>(null);
    const [montoReal, setMontoReal] = useState<string>('');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Fetch current shift data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCurrentShift();
            setMontoReal('');
            setNotas('');
            setError(null);
        }
    }, [isOpen]);

    const fetchCurrentShift = async () => {
        setLoading(true);
        setError(null);
        try {
            // TODO: Endpoint /api/shifts/current not implemented yet
            // Temporarily disabled to prevent errors
            throw new Error('Endpoint not implemented');

        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!shiftData) return;

        const realAmount = parseFloat(montoReal);
        if (isNaN(realAmount)) {
            setError('Por favor ingresa un monto válido');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/shifts/end`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    shiftId: shiftData.id,
                    montoReal: realAmount,
                    notas
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al cerrar el turno');
            }

            // Success
            alert('✅ Turno cerrado exitosamente');

            // Clean up local storage if you were using it for backup
            localStorage.removeItem('currentShiftId');

            if (onShiftClosed) {
                onShiftClosed();
            } else {
                // Default behavior: logout or reload
                // For now, let's close the modal and maybe refresh
                onClose();
                // Optionally logout user as is common in POS
                // logout(); 
                // navigate('/login');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    const calculateDifference = () => {
        if (!shiftData) return 0;
        const real = parseFloat(montoReal) || 0;
        return real - shiftData.montoEsperado;
    };

    const difference = calculateDifference();
    const isDifferenceNegative = difference < 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="CERRAR TURNO (CORTE DE CAJA)">
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {loading && !shiftData ? (
                    <div className="py-8 text-center text-slate-500">Cargando información del turno...</div>
                ) : shiftData ? (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Fondo Inicial</div>
                                <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {formatCurrency(shiftData.montoInicial)}
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                <div className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Ventas Efectivo</div>
                                <div className="text-lg font-mono font-bold text-green-700 dark:text-green-400">
                                    + {formatCurrency(shiftData.ventasEfectivo)}
                                </div>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Gastos</div>
                                <div className="text-lg font-mono font-bold text-red-700 dark:text-red-400">
                                    - {formatCurrency(shiftData.gastos)}
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Esperado en Caja</div>
                                <div className="text-xl font-mono font-black text-blue-700 dark:text-blue-400">
                                    {formatCurrency(shiftData.montoEsperado)}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Dinero Real en Caja (Contado)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign className="text-slate-400" size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        value={montoReal}
                                        onChange={(e) => setMontoReal(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 font-mono text-lg font-bold"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Difference Indicator */}
                            {montoReal !== '' && (
                                <div className={`p-3 rounded-lg flex justify-between items-center ${isDifferenceNegative ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    <span className="text-xs font-bold uppercase flex items-center gap-2">
                                        <Calculator size={14} /> Diferencia
                                    </span>
                                    <span className="font-mono font-bold">
                                        {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Notas / Observaciones
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none">
                                        <FileText className="text-slate-400" size={18} />
                                    </div>
                                    <textarea
                                        value={notas}
                                        onChange={(e) => setNotas(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 min-h-[80px]"
                                        placeholder="Justificación de diferencias..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
                                CANCELAR
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={handleCloseShift}
                                disabled={loading || montoReal === ''}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {loading ? 'CERRANDO...' : 'CONFIRMAR CIERRE'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CloseShiftModal;
