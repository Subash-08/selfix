import React from "react";

export function PercentagePill({ value }: { value: number }) {
  let colorVar = "var(--accent-green)";
  let bgVar = "rgba(34, 197, 94, 0.1)"; // accent-green with opacity
  
  if (value < 50) {
    colorVar = "var(--accent-red)";
    bgVar = "rgba(239, 68, 68, 0.1)";
  } else if (value < 80) {
    colorVar = "var(--accent-amber)";
    bgVar = "rgba(245, 158, 11, 0.1)";
  }

  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: colorVar, backgroundColor: bgVar }}
    >
      {Math.round(value)}%
    </span>
  );
}
