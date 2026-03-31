import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-[var(--accent)] text-white hover:opacity-90",
    secondary: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]",
    ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
    danger: "bg-[var(--accent-red)] text-white hover:opacity-90",
    outline: "bg-transparent border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : children}
    </button>
  );
}
