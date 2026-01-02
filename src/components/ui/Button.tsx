<<<<<<< HEAD
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'sales' | 'finance';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ElementType;
=======

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'sales' | 'finance';
>>>>>>> bf8c5a6c68ba90d674e30bc90174141a3a0b2683
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
<<<<<<< HEAD
    size = 'md',
    loading = false,
    icon: Icon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 focus:ring-blue-500 border border-transparent",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white",
        sales: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 focus:ring-emerald-500",
        finance: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 focus:ring-amber-500"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-base"
    };

    return (
        <button
            className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!loading && Icon && <Icon className="w-4 h-4 mr-2" />}
=======
    fullWidth = false,
    className = '',
    ...props
}) => {
    // Se integra transition-transform active:scale-95 duration-150 ease-in-out para respuesta táctil superior
    const baseStyles = "inline-flex items-center justify-center min-h-[44px] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-150 ease-in-out active:scale-95 disabled:opacity-40 rounded-xl border-2 shadow-sm whitespace-nowrap overflow-hidden select-none";

    const variants = {
        primary: "bg-brand-text text-brand-bg border-brand-text hover:bg-brand-text/90 shadow-brand-text/10",
        secondary: "bg-transparent text-brand-text border-brand-text/20 hover:border-brand-text/50",
        ghost: "bg-transparent text-brand-muted border-transparent hover:text-brand-text hover:bg-white/5",
        sales: "bg-brand-emerald text-white border-brand-emerald hover:bg-emerald-400 shadow-emerald-500/20",
        finance: "bg-brand-blue text-white border-brand-blue hover:bg-blue-400 shadow-blue-500/20",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
            {...props}
        >
>>>>>>> bf8c5a6c68ba90d674e30bc90174141a3a0b2683
            {children}
        </button>
    );
};

export default Button;
