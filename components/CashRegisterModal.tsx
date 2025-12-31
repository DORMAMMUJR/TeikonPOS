import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { DollarSign, TrendingUp, ShoppingCart, Percent } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { API_URL, getHeaders, clearAuthToken } from '../utils/api';

interface CashRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CashRegisterModal: React.FC<CashRegisterModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { getDashboardStats } = useStore();
    const [stats, setStats] = useState<any>({
        totalRevenue: 0,
        totalProfit: 0,
        totalSales: 0,
        profitMargin: 0
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchShiftStats();
        }
    }, [isOpen]);

    const fetchDayStats = async () => {
        setIsLoading(true);
        try {
            const data = await getDashboardStats('day');
            setStats(data || {
                totalRevenue: 0,
                totalProfit: 0,
                totalSales: 0,
                profitMargin: 0
            });
        } catch (error) {
            console.error("Error fetching cash register stats", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchShiftStats = async () => {
        setIsLoading(true);
        try {
            // Get shift start time from localStorage
            const shiftStartTime = localStorage.getItem('cashRegisterOpenedAt');

            if (!shiftStartTime) {
                console.error('No shift start time found');
                setStats({
                    totalRevenue: 0,
                    totalProfit: 0,
                    totalSales: 0,
                    profitMargin: 0
                });
                return;
            }

            const response = await fetch(`${API_URL}/api/sales/cash-close?shiftStartTime=${shiftStartTime}`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch shift stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error("Error fetching shift stats", error);
            setStats({
                totalRevenue: 0,
                totalProfit: 0,
                totalSales: 0,
                profitMargin: 0
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseShift = () => {
        const confirmed = confirm(
            `¿Confirmar cierre de turno?\n\nVentas: $${(stats.totalRevenue || 0).toLocaleString()}\nGanancia: $${(stats.totalProfit || 0).toLocaleString()}\n\nEsta acción cerrará tu sesión.`
        );

        if (confirmed) {
            // Clear all session data
            localStorage.removeItem('cashRegisterOpenedAt');
            localStorage.removeItem('cashRegisterSession');
            localStorage.removeItem('cart');
            sessionStorage.clear();

            // Clear auth token and redirect to login
            clearAuthToken();

            alert('✅ Turno cerrado exitosamente. Sesión finalizada.');

            // Force redirect to login
            navigate('/login');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="CORTE DE CAJA">
            <div className="space-y-6 p-2">
                {isLoading ? (
                    <div className="text-center py-10">
                        <p className="text-sm font-bold text-slate-500">Cargando resumen...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-500/5 rounded-2xl border-2 border-emerald-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="text-emerald-600" size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        Ingresos
                                    </span>
                                </div>
                                <p className="text-2xl font-black text-emerald-600">
                                    ${(stats.totalRevenue || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 bg-purple-500/5 rounded-2xl border-2 border-purple-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="text-purple-600" size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        Ganancia
                                    </span>
                                </div>
                                <p className="text-2xl font-black text-purple-600">
                                    ${(stats.totalProfit || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 bg-blue-500/5 rounded-2xl border-2 border-blue-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShoppingCart className="text-blue-600" size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        Transacciones
                                    </span>
                                </div>
                                <p className="text-2xl font-black text-blue-600">
                                    {stats.totalSales || 0}
                                </p>
                            </div>

                            <div className="p-4 bg-amber-500/5 rounded-2xl border-2 border-amber-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Percent className="text-amber-600" size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        Margen
                                    </span>
                                </div>
                                <p className="text-2xl font-black text-amber-600">
                                    {(stats.profitMargin || 0).toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center">
                                📅 Resumen del día: {new Date().toLocaleDateString('es-MX', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" fullWidth onClick={onClose}>
                                CANCELAR
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                onClick={handleCloseShift}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                CERRAR TURNO
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default CashRegisterModal;
