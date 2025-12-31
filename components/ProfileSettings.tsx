
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { authAPI } from '../utils/api';
import Button from './Button';
import { X, User, Lock, Store as StoreIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import DangerZone from './DangerZone';

interface ProfileSettingsProps {
    onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
    const { currentUser } = useStore();
    const [storeName, setStoreName] = useState(currentUser?.storeName || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (newPassword && newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const result = await authAPI.updateProfile({
                storeName,
                newPassword: newPassword || undefined
            });

            setSuccessMessage(result.message || 'Perfil actualizado correctamente');
            setNewPassword('');
            setConfirmPassword('');

            // Close after 1.5s
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error(err);
            // Extract nicer error message if possible
            let msg = 'Error al actualizar perfil';
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.error) msg = parsed.error;
            } catch (e) {
                if (err.message && !err.message.includes('{')) msg = err.message;
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStoreDeleted = () => {
        // Redirect to login after store deletion
        window.location.href = '/login';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Mi Perfil</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">Gestión de Cuenta y Seguridad</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Read Only Info */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                        <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500">
                            <User size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Usuario / ID</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentUser?.username || currentUser?.id}</p>
                        </div>
                    </div>

                    {/* Store Name */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre de la Tienda</label>
                        <div className="relative">
                            <StoreIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                value={storeName}
                                onChange={e => setStoreName(e.target.value)}
                                placeholder="Nombre comercial"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
                        <p className="text-xs font-bold text-brand-blue mb-4">Cambiar Contraseña (Opcional)</p>

                        {/* New Password */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="password"
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Nueva Contraseña"
                                />
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="password"
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmar Nueva Contraseña"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feedback */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                            <CheckCircle size={16} />
                            {successMessage}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            fullWidth
                            onClick={onClose}
                            className="h-12"
                        >
                            CANCELAR
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            className="h-12 shadow-lg shadow-brand-blue/20 bg-brand-blue text-white hover:bg-blue-600"
                            disabled={isLoading}
                        >
                            {isLoading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </Button>
                    </div>

                </form>

                {/* DANGER ZONE */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <DangerZone onStoreDeleted={handleStoreDeleted} />
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
