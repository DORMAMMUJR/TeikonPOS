
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 disabled:opacity-30 cut-corner active:scale-95 border-2";
  
  const variants = {
    // Primary siempre usa el contraste invertido al fondo
    primary: "bg-brand-text text-brand-bg border-brand-text hover:bg-brand-bg hover:text-brand-text shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
    secondary: "bg-transparent text-brand-text border-brand-text hover:bg-brand-text hover:text-brand-bg",
    ghost: "bg-transparent text-brand-text border-transparent hover:border-brand-text",
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
