import React, { useRef, useEffect } from 'react';
import { Moon, Sun, Target, DollarSign, LifeBuoy, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../context/StoreContext';

interface POSSettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onOpenSupport: () => void;
}

const POSSettingsMenu: React.FC<POSSettingsMenuProps> = ({
    isOpen,
    onClose,
    onOpenGoalModal,
    onOpenCashClose,
    onOpenSupport
}) => {
    const { theme, toggleTheme } = useTheme();
    const { logout } = useStore();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleThemeToggle = () => {
        toggleTheme();
    };

    const handleLogout = () => {
        onClose();
        logout();
    };

    const menuItems = [
        {
            icon: theme === 'dark' ? Sun : Moon,
            label: theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro',
            onClick: handleThemeToggle,
            color: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
        },
        {
            icon: Target,
            label: 'Modificar Meta de Venta',
            onClick: () => { onClose(); onOpenGoalModal(); },
            color: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10'
        },
        {
            icon: DollarSign,
            label: 'Corte de Caja',
            onClick: () => { onClose(); onOpenCashClose(); },
            color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
        },
        {
            icon: LifeBuoy,
            label: 'Soporte Técnico',
            onClick: () => { onClose(); onOpenSupport(); },
            color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10'
        },
        {
            icon: LogOut,
            label: 'Salir / Cerrar Sesión',
            onClick: handleLogout,
            color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
        }
    ];

    return (
        <div
            ref={menuRef}
            className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <div className="p-2 space-y-1">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.onClick}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${item.color}`}
                    >
                        <item.icon size={18} />
                        <span className="text-left flex-1">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default POSSettingsMenu;
