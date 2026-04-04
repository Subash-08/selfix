import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
}

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  
  let colorClass = "bg-[var(--accent-red)]";
  if (safeProgress >= 67) {
    colorClass = "bg-[var(--accent-green)]";
  } else if (safeProgress >= 34) {
    colorClass = "bg-[var(--accent-amber)]";
  }

  return (
    <div 
      className="w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden" 
      style={{ height: `${height}px` }}
    >
      <motion.div
        className={`h-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${safeProgress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
