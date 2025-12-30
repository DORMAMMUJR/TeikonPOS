import React, { useState } from 'react';
import {
    Home,
    ShoppingCart,
    History,
    Package,
    Headphones,
    Settings,
    LogOut,
    Target,
    DollarSign
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onOpenSupport: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    onTabChange,
    onOpenGoalModal,
    onOpenCashClose,
    onOpenSupport
}) => {
    const { logout, currentUser } = useStore();
    const [showConfigMenu, setShowConfigMenu] = useState(false);

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

                {/* Botón de Soporte */}
                <button
                    onClick={onOpenSupport}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                    <Headphones className="text-xl" size={20} />
                    <span className="font-medium">Soporte</span>
                </button>

                {/* --- AQUÍ ESTÁ LA TUERCA --- */}
                <div className="relative">
                    <button
                        onClick={() => setShowConfigMenu(!showConfigMenu)}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${showConfigMenu
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                    >
                        <Settings className="text-xl" size={20} />
                        <span className="font-medium">Configuración</span>
                    </button>

                    {/* Sub-menú Flotante (Aparece al hacer clic en Configuración) */}
                    {showConfigMenu && (
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                            <button
                                onClick={() => {
                                    onOpenGoalModal();
                                    setShowConfigMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white text-left transition-colors"
                            >
                                <Target className="text-blue-400" size={16} />
                                <span>Ajustar Meta</span>
                            </button>
                            <button
                                onClick={() => {
                                    onOpenCashClose();
                                    setShowConfigMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white text-left border-t border-gray-700 transition-colors"
                            >
                                <DollarSign className="text-green-400" size={16} />
                                <span>Corte de Caja</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Botón Salir */}
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all mt-4"
                >
                    <LogOut className="text-xl" size={20} />
                    <span className="font-medium">Salir</span>
                </button>
            </div>

        </div>
    );
};

export default Sidebar;
