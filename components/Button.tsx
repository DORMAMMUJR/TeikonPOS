import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'warning' | 'info';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95";
  
  const variants = {
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500",
    secondary: "text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600",
    success: "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-500",
    danger: "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-500",
    warning: "text-white bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500",
    info: "text-white bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-500",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white",
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