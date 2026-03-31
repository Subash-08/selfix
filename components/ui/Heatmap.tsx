"use client";

import React from "react";

interface HeatmapProps {
  habitId?: string;
  data?: { date: string; value: number }[];
  weeks?: number;
}

export function Heatmap({ habitId, data, weeks = 12 }: HeatmapProps) {
  // Generate cells for the grid - uses random data for visualization until real checkin data is wired
  const totalCells = weeks * 7;
  const cells = Array.from({ length: totalCells }).map((_, i) => {
    if (data && data[i]) return data[i].value;
    return Math.floor(Math.random() * 5); // placeholder
  });

  const getColor = (val: number) => {
    switch (val) {
      case 1: return "bg-green-200/50 dark:bg-green-900";
      case 2: return "bg-green-400/50 dark:bg-green-700";
      case 3: return "bg-green-600/50 dark:bg-green-500";
      case 4: return "bg-green-800/50 dark:bg-green-400";
      default: return "bg-[var(--bg-elevated)]";
    }
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide shrink-0">
      <div className="flex flex-col flex-wrap h-[105px] w-max gap-1">
        {cells.map((val, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-[2px] ${getColor(val)} hover:ring-1 hover:ring-[var(--border)] cursor-pointer transition-all`}
            title={`Level: ${val}`}
          />
        ))}
      </div>
    </div>
  );
}
