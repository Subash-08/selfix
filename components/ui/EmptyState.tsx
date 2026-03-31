import React from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  subtitle: string;
  buttonText?: string;
  onClick?: () => void;
}

export function EmptyState({ title, subtitle, buttonText, onClick }: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] border-dashed my-4">
      <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4 text-2xl">
        🍃
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-[250px]">{subtitle}</p>
      {buttonText && onClick && (
        <Button onClick={onClick} variant="secondary" size="sm">
          {buttonText}
        </Button>
      )}
    </div>
  );
}
