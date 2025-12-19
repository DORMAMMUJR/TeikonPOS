
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'sales' | 'finance';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-30 rounded-xl active:scale-95 border-2 shadow-sm";
  
  const variants = {
    primary: "bg-brand-text text-brand-bg border-brand-text hover:bg-brand-text/90 shadow-brand-text/10",
    secondary: "bg-transparent text-brand-text border-brand-text/20 hover:border-brand-text/50",
    ghost: "bg-transparent text-brand-muted border-transparent hover:text-brand-text hover:bg-white/5",
    sales: "bg-brand-emerald text-slate-900 border-brand-emerald hover:bg-emerald-400 shadow-emerald-500/20",
    finance: "bg-brand-blue text-white border-brand-blue hover:bg-blue-400 shadow-blue-500/20",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
