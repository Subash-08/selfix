"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value?: number;
  progress?: number; // alias for value
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  progress,
  size = 120,
  strokeWidth = 8,
  color = "var(--accent)",
  children,
}: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, value ?? progress ?? 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = Math.max(0, circumference - (pct / 100) * circumference);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          stroke="var(--bg-elevated)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
      {!children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-[var(--text-primary)]">{Math.round(pct)}</span>
        </div>
      )}
    </div>
  );
}
