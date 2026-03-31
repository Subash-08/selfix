import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "xl" | "full" | "none" | "2xl";
  className?: string;
}

export function Skeleton({ width = "100%", height = "20px", rounded = "md", className = "" }: SkeletonProps) {
  const roundRadius = {
    sm: "rounded",
    md: "rounded-md",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
    none: "rounded-none",
  };
  
  return (
    <div 
      className={`bg-[var(--border)] animate-pulse ${roundRadius[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}
