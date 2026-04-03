"use client";

import { useState, useCallback, useEffect } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Delete, Check } from "lucide-react";

interface NumpadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  label: string;
  initialValue?: number;
}

export function NumpadSheet({ isOpen, onClose, onSubmit, label, initialValue }: NumpadSheetProps) {
  const [display, setDisplay] = useState(initialValue !== undefined ? initialValue.toFixed(2) : "0");
  const [hasDecimal, setHasDecimal] = useState(initialValue !== undefined ? initialValue.toFixed(2).includes(".") : false);

  useEffect(() => {
    if (isOpen) {
      setDisplay(initialValue !== undefined ? initialValue.toFixed(2) : "0");
      setHasDecimal(initialValue !== undefined ? initialValue.toFixed(2).includes(".") : false);
    }
  }, [isOpen, initialValue]);

  const resetState = useCallback(() => {
    setDisplay(initialValue !== undefined ? initialValue.toFixed(2) : "0");
    setHasDecimal(initialValue !== undefined ? initialValue.toFixed(2).includes(".") : false);
  }, [initialValue]);

  const handleKey = (key: string) => {
    if (key === "backspace") {
      if (display.length <= 1 || display === "0") {
        setDisplay("0");
        setHasDecimal(false);
        return;
      }
      const newVal = display.slice(0, -1);
      if (!newVal.includes(".")) setHasDecimal(false);
      setDisplay(newVal || "0");
      return;
    }

    if (key === ".") {
      if (hasDecimal) return;
      setHasDecimal(true);
      setDisplay(display + ".");
      return;
    }

    // Number key
    if (display === "0" && key !== ".") {
      setDisplay(key);
      return;
    }

    // Max 2 decimal places
    const parts = display.split(".");
    if (parts[1] && parts[1].length >= 2) return;

    // Max 10 digits before decimal
    if (!hasDecimal && parts[0].length >= 10) return;

    setDisplay(display + key);
  };

  const handleSubmit = () => {
    const value = parseFloat(display);
    if (!isNaN(value) && value >= 0) {
      onSubmit(value);
      resetState();
      onClose();
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const numericValue = parseFloat(display) || 0;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col gap-4 pb-4">
        {/* Label */}
        <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest text-center">
          {label}
        </p>

        {/* Amount Display */}
        <div className="text-center py-4">
          <span
            className={`amount text-4xl font-bold transition-colors duration-200 ${
              numericValue > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            ₹{display}
          </span>
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              className="flex items-center justify-center h-[72px] rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xl font-semibold transition-all active:scale-95 active:bg-[var(--border)]"
            >
              {key === "backspace" ? (
                <Delete size={22} className="text-[var(--text-secondary)]" />
              ) : key === "." ? (
                <span className="text-2xl">.</span>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isNaN(numericValue) || numericValue < 0}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[var(--accent)] text-white font-bold text-base transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        >
          <Check size={20} />
          Confirm
        </button>
      </div>
    </BottomSheet>
  );
}
