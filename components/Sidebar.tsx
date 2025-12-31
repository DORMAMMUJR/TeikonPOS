import React, { useState, useRef, useEffect } from 'react';
import {
    Home,
    LayoutGrid, ShoppingCart, History, Settings, LogOut, Package,
    ChevronRight, Target, Banknote, Users, FolderKanban, LifeBuoy, Sun, Moon, User, Headphones
} from 'lucide-react';
import ProfileSettings from './ProfileSettings';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onOpenSupport: () => void;
    onOpenProfile: () => void; // Added for the new dropdown
}

// New interface for SettingsDropdown
interface SettingsDropdownProps {
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onLogout: () => void;
    onOpenProfile: () => void;
}

// New SettingsDropdown component
const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
    onOpenGoalModal,
    onOpenCashClose,
    onToggleTheme,
    isDarkMode,
    onLogout,
    onOpenProfile
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${isOpen ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-white/20' : 'bg-slate-800'}`}>
                        <Settings size={16} className={isOpen ? 'animate-spin-slow' : ''} />
                    </div>
                    <span>CONFIGURACIÓN</span>
                </div>
                <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute bottom-full left-0 w-full mb-2 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-200 origin-bottom ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                <div className="p-1 space-y-1">
                    <button
                        onClick={() => handleAction(onOpenProfile)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <User size={14} className="text-blue-400" />
                        MI PERFIL
                    </button>
                    <button
                        onClick={() => handleAction(onOpenGoalModal)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <Target size={14} className="text-emerald-400" />
                        AJUSTAR META
                    </button>
                    <button
                        onClick={() => handleAction(onOpenCashClose)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <Banknote size={14} className="text-amber-400" />
                        CORTE DE CAJA
                    </button>
                    <button
                        onClick={() => handleAction(onToggleTheme)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        {isDarkMode ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-indigo-400" />}
                        TEMA {isDarkMode ? 'CLARO' : 'OSCURO'}
                    </button>
                    <div className="h-px bg-slate-700 my-1"></div>
                    <button
                        onClick={() => handleAction(onLogout)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <LogOut size={14} />
                        CERRAR SESIÓN
                    </button>
                </div>
            </div>
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    onTabChange,
    onOpenGoalModal,
    onOpenCashClose,
    onOpenSupport,
    onOpenProfile // Added for the new dropdown
}) => {
    const { logout, currentUser } = useStore();
    const { theme, toggleTheme } = useTheme();
    // const [showConfigMenu, setShowConfigMenu] = useState(false); // No longer needed directly here

    const isActive = (tab: string) =>
        activeTab === tab
            ? "bg-blue-600 text-white shadow-lg"
            : "text-gray-400 hover:bg-gray-800 hover:text-white";

    const navItems = [
        { id: 'dashboard', label: 'Inicio', icon: Home },
        { id: 'pos', label: 'Ventas', icon: ShoppingCart },
        { id: 'history', label: 'Historial', icon: History },
        { id: 'products', label: 'Inventario', icon: Package },
    ];

    const handleLogout = () => {
        logout();
        // Force full reload to clear all states
        window.location.href = '/login';
    };

    return (
        <div className="h-screen w-64 bg-[#0f172a] flex flex-col justify-between border-r border-gray-800 transition-all duration-300">

            {/* SECCIÓN SUPERIOR: Logo y Navegación Principal */}
            <div>
                <div className="h-20 flex items-center px-8 border-b border-gray-800 mb-6">
                    <h1 className="text-2xl font-bold text-white tracking-wider">TEIKON</h1>
                </div>

                <nav className="flex flex-col gap-2 px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive(item.id)}`}
                            >
                                <Icon className="text-xl" size={20} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* SECCIÓN INFERIOR: Herramientas y Configuración */}
            <div className="px-4 pb-6 space-y-2">

                <SettingsDropdown
                    onOpenGoalModal={onOpenGoalModal}
                    onOpenCashClose={onOpenCashClose}
                    onToggleTheme={toggleTheme}
                    isDarkMode={theme === 'dark'}
                    onLogout={handleLogout}
                    onOpenProfile={onOpenProfile}
                />

                {/* Botón de Soporte */}
                <button
                    onClick={onOpenSupport}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                    <Headphones className="text-xl" size={20} />
                    <span className="font-medium">Soporte</span>
                </button>

            </div>

        </div>
    );
};

export default Sidebar;
