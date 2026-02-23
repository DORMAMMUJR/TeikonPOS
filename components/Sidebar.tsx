import React, { useState, useRef, useEffect } from 'react';
import {
    Home,
    ShoppingCart, History, Package,
    Target, Banknote, LifeBuoy, Sun, Moon, User, Headphones,
    Settings, LogOut, ChevronDown, BarChart2
} from 'lucide-react';
import OpenShiftWarningModal from './OpenShiftWarningModal';
import CloseShiftModal from './CloseShiftModal';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onOpenSupport: () => void;
    onOpenProfile: () => void;
}

// ─── Reusable Section Label ───────────────────────────────────────────────────
const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <div className="px-4 pt-5 pb-1">
        <span className="text-[9px] font-black tracking-[0.25em] text-slate-500 uppercase select-none">
            {label}
        </span>
    </div>
);

// ─── Reusable Nav Button ──────────────────────────────────────────────────────
interface NavButtonProps {
    id: string;
    label: string;
    icon: React.ElementType;
    activeTab: string;
    onClick: () => void;
    iconColor?: string;
}
const NavButton: React.FC<NavButtonProps> = ({ id, label, icon: Icon, activeTab, onClick, iconColor }) => {
    const isActive = activeTab === id;
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
        >
            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-800'}`}>
                <Icon size={15} className={isActive ? '' : (iconColor ?? 'text-slate-400')} />
            </div>
            <span>{label}</span>
        </button>
    );
};

// ─── Configuración Accordion ─────────────────────────────────────────────────
interface ConfigAccordionProps {
    onOpenGoalModal: () => void;
    onOpenCashClose: () => void;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onLogout: () => void;
    onOpenProfile: () => void;
}
const ConfigAccordion: React.FC<ConfigAccordionProps> = ({
    onOpenGoalModal,
    onOpenCashClose,
    onToggleTheme,
    isDarkMode,
    onLogout,
    onOpenProfile,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
        <button
            onClick={() => { action(); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${danger
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div>
            {/* Accordion toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-white/20' : 'bg-slate-800'}`}>
                        <Settings size={15} className={isOpen ? 'animate-spin-slow' : ''} />
                    </div>
                    <span>Configuración</span>
                </div>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Accordion body */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="pl-3 flex flex-col gap-0.5 border-l border-slate-700 ml-6">
                    {item(<User size={14} className="text-blue-400 shrink-0" />, 'Mi Perfil', onOpenProfile)}
                    {item(<Target size={14} className="text-emerald-400 shrink-0" />, 'Ajustar Meta', onOpenGoalModal)}
                    {item(<Banknote size={14} className="text-amber-400 shrink-0" />, 'Corte de Caja', onOpenCashClose)}
                    {item(
                        isDarkMode
                            ? <Sun size={14} className="text-yellow-400 shrink-0" />
                            : <Moon size={14} className="text-indigo-400 shrink-0" />,
                        `Tema ${isDarkMode ? 'Claro' : 'Oscuro'}`,
                        onToggleTheme
                    )}
                    <div className="h-px bg-slate-800 my-1 mx-2" />
                    {item(<LogOut size={14} className="shrink-0" />, 'Cerrar Sesión', onLogout, true)}
                </div>
            </div>
        </div>
    );
};


// ─── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    onTabChange,
    onOpenGoalModal,
    onOpenCashClose,
    onOpenSupport,
    onOpenProfile,
}) => {
    const { logout, safeLogout, currentUser } = useStore();
    const { theme, toggleTheme } = useTheme();

    // --- Guard modal state ---
    const [isShiftWarningOpen, setIsShiftWarningOpen] = useState(false);
    const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

    /**
     * handleLogout — uses safeLogout guard:
     * - No open shift (or SUPER_ADMIN) → safeLogout() calls logout() internally, returns true.
     * - Open shift found → safeLogout() returns false → show OpenShiftWarningModal.
     */
    const handleLogout = () => {
        const proceeded = safeLogout();
        if (!proceeded) {
            setIsShiftWarningOpen(true);
        } else {
            window.location.href = '/login';
        }
    };

    /** Opens CloseShiftModal from the warning dialog */
    const handleGoToCloseShift = () => {
        setIsShiftWarningOpen(false);
        setIsCloseShiftOpen(true);
    };

    /** After shift is successfully closed — auto-logout */
    const handleShiftClosed = () => {
        setIsCloseShiftOpen(false);
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="h-screen w-64 bg-[#0f172a] flex flex-col border-r border-gray-800 overflow-y-auto overflow-x-hidden transition-all duration-300 custom-scrollbar">

            {/* Logo */}
            <div className="h-20 flex items-center px-8 border-b border-gray-800 shrink-0">
                <h1 className="text-2xl font-bold text-white tracking-wider">TEIKON</h1>
            </div>

            {/* ── PRINCIPAL ─────────────────────────────── */}
            <SectionLabel label="Principal" />
            <nav className="flex flex-col gap-1 px-4">
                <NavButton id="dashboard" label="Inicio" icon={Home} activeTab={activeTab} onClick={() => onTabChange('dashboard')} iconColor="text-blue-400" />
                <NavButton id="pos" label="Ventas" icon={ShoppingCart} activeTab={activeTab} onClick={() => onTabChange('pos')} iconColor="text-emerald-400" />
            </nav>

            {/* ── CLIENTES ──────────────────────────────── */}
            <SectionLabel label="Clientes" />
            <nav className="flex flex-col gap-1 px-4">
                <NavButton id="products" label="Inventario" icon={Package} activeTab={activeTab} onClick={() => onTabChange('products')} iconColor="text-violet-400" />
                <NavButton id="history" label="Historial" icon={History} activeTab={activeTab} onClick={() => onTabChange('history')} iconColor="text-orange-400" />
            </nav>

            {/* ── REPORTES ──────────────────────────────── */}
            <SectionLabel label="Reportes" />
            <nav className="flex flex-col gap-1 px-4">
                <NavButton id="reports" label="Estadísticas" icon={BarChart2} activeTab={activeTab} onClick={() => onTabChange('dashboard')} iconColor="text-sky-400" />
            </nav>

            {/* ── SOPORTE ───────────────────────────────── */}
            <SectionLabel label="Soporte" />
            <nav className="flex flex-col gap-1 px-4">
                <button
                    onClick={onOpenSupport}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                    <div className="p-1.5 rounded-lg bg-slate-800">
                        <Headphones size={15} className="text-rose-400" />
                    </div>
                    <span>Abrir Ticket</span>
                </button>
            </nav>

            {/* ── CONFIGURACIÓN ─────────────────────────── */}
            <SectionLabel label="Configuración" />
            <div className="px-4 pb-6">
                <ConfigAccordion
                    onOpenGoalModal={onOpenGoalModal}
                    onOpenCashClose={onOpenCashClose}
                    onToggleTheme={toggleTheme}
                    isDarkMode={theme === 'dark'}
                    onLogout={handleLogout}
                    onOpenProfile={onOpenProfile}
                />
            </div>

            {/* ─── Cash Flow Integrity Guard modals ───────────────── */}
            {/* 1. Shown when logout is blocked by an open cash shift   */}
            <OpenShiftWarningModal
                isOpen={isShiftWarningOpen}
                onClose={() => setIsShiftWarningOpen(false)}
                onGoToCloseShift={handleGoToCloseShift}
            />
            {/* 2. Performs the reconciliation then auto-logouts         */}
            <CloseShiftModal
                isOpen={isCloseShiftOpen}
                onClose={() => setIsCloseShiftOpen(false)}
                onShiftClosed={handleShiftClosed}
            />

        </div>
    );
};

export default Sidebar;
