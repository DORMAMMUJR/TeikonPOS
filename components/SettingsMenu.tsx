
import React, { useState } from 'react';
import { Settings, Moon, Sun, LifeBuoy, LogOut, User, X, MessageSquare, Phone, Mail } from 'lucide-react';
import Modal from './Modal';

interface SettingsMenuProps {
    onLogout: () => void;
    isDarkMode: boolean;
    setIsDarkMode: (val: boolean) => void;
    username: string;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onLogout, isDarkMode, setIsDarkMode, username }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);

    return (
        <div className="relative">
            {/* TRIGGER */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-2 pr-4 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold uppercase">
                    {username.substring(0, 2)}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">Perfil</p>
                    <p className="text-xs font-bold dark:text-white leading-none">{username}</p>
                </div>
                <Settings size={16} className="text-slate-400" />
            </button>

            {/* DROPDOWN - Overlay para cerrar clickando fuera */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                            <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Configuración</p>
                        </div>

                        <div className="space-y-1">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300"
                            >
                                <span className="flex items-center gap-2"><Moon size={16} /> Tema Oscuro</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
                                </div>
                            </button>

                            <button
                                onClick={() => { setIsSupportOpen(true); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300"
                            >
                                <LifeBuoy size={16} className="text-blue-500" />
                                Soporte Técnico
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                            <button
                                onClick={onLogout}
                                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-xs font-bold text-red-500"
                            >
                                <LogOut size={16} />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL SOPORTE */}
            <Modal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="SOPORTE TÉCNICO">
                <div className="p-2 space-y-6">
                    <div className="bg-blue-500/10 p-6 rounded-2xl flex items-start gap-4">
                        <MessageSquare className="text-blue-600 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-black text-blue-900 uppercase tracking-wide text-sm mb-1">Centro de Ayuda</h4>
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Nuestro equipo está disponible de Lunes a Viernes de 9:00 AM a 6:00 PM para resolver cualquier incidencia crítica.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <a href="tel:+525500000000" className="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-center">
                            <Phone className="mx-auto mb-2 text-slate-400 group-hover:text-emerald-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Línea Directa</p>
                        </a>
                        <a href="mailto:soporte@teikonpos.com" className="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-center">
                            <Mail className="mx-auto mb-2 text-slate-400 group-hover:text-emerald-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Email</p>
                        </a>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsMenu;
