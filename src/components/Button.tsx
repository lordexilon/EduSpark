import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = "font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150 ease-in-out inline-flex items-center justify-center";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };

  const variantStyles = {
    primary: "bg-primary hover:opacity-90 text-white focus:ring-primary",
    secondary: "bg-border hover:bg-slate-300 text-text-dark focus:ring-slate-400",
    // FIX: Add danger variant
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    // FIX: Add ghost variant
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-sky-500",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* FIX: Use conditional margin for size and remove fixed icon size */}
      {leftIcon && <span className={size === 'sm' ? "mr-1.5" : "mr-2"}>{leftIcon}</span>}
      {children}
      {rightIcon && <span className={size === 'sm' ? "ml-1.5" : "ml-2"}>{rightIcon}</span>}
    </button>
  );
};

export default Button;