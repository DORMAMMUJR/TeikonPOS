import React, { useState } from 'react';
import { AlertTriangle, Trash2, Lock, X } from 'lucide-react';
import Button from './Button';
import { storesAPI } from '../utils/api';

interface DangerZoneProps {
    onStoreDeleted: () => void;
}

const DangerZone: React.FC<DangerZoneProps> = ({ onStoreDeleted }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!password) {
            setError('Debes ingresar tu contraseña');
            return;
        }

        setIsDeleting(true);
        setError('');

        try {
            // Get current store ID from context or props
            const storeId = localStorage.getItem('currentStoreId'); // Adjust as needed

            if (!storeId) {
                setError('No se pudo identificar la tienda');
                return;
            }

            await storesAPI.delete(storeId, password);

            alert('✅ Tienda eliminada correctamente');
            setIsModalOpen(false);
            onStoreDeleted();
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la tienda');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/50 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500 rounded-xl">
                        <AlertTriangle className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
                            Zona de Peligro
                        </h3>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
                            Esta acción eliminará permanentemente tu tienda, productos, ventas e historial completo.
                        </p>
                        <p className="text-xs font-bold text-red-500 mt-2">
                            ⚠️ Esta acción NO se puede deshacer
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        variant="secondary"
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-500/20"
                    >
                        <Trash2 size={16} className="mr-2" />
                        ELIMINAR TIENDA
                    </Button>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border-2 border-red-500">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-xl text-red-500">
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                        Confirmar Eliminación
                                    </h3>
                                    <p className="text-xs font-bold text-red-500 mt-0.5">
                                        Acción Irreversible
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setPassword('');
                                    setError('');
                                }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                                aria-label="Cerrar modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    Esta acción eliminará permanentemente:
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                                    <li>• Todos los productos del inventario</li>
                                    <li>• Historial completo de ventas</li>
                                    <li>• Configuraciones y preferencias</li>
                                    <li>• Usuarios asociados a la tienda</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                                    Ingresa tu contraseña para confirmar
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="password"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="••••••••"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setPassword('');
                                        setError('');
                                    }}
                                    className="h-12"
                                >
                                    CANCELAR
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    fullWidth
                                    onClick={handleDelete}
                                    disabled={!password || isDeleting}
                                    className="h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? 'ELIMINANDO...' : 'CONFIRMAR ELIMINACIÓN'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DangerZone;
