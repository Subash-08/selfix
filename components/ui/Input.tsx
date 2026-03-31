import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>}
        <input
          ref={ref}
          className={`h-11 px-4 rounded bg-[var(--bg-primary)] border ${error ? 'border-[var(--accent-red)]' : 'border-[var(--border)]'} focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-[var(--accent-red)] mt-0.5">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
