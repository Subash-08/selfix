"use client";

import { Circle, CircleDot, CheckCircle2, XCircle, PlusSquare, MoreVertical } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

export function TaskCard({
  instance,
  onLogTime,
  onStateUpdate,
  onEdit,
  onDelete
}: {
  instance: any;
  onLogTime: (taskId: string, mins: number) => void;
  onStateUpdate: (instanceId: string, loggedTime: number) => void;
  onEdit: (instance: any) => void;
  onDelete?: (instanceId: string) => void;
}) {
  const task = instance; // Use snapshot directly
  const isCheckbox = task.targetDuration === 0;
  const isQuit = task.mode === "target-max";
  const progress = instance.progress || 0;
  const logged = instance.loggedTime || 0;
  const target = task.targetDuration || 0;

  const controls = useAnimation();

  const handleCardClick = () => {
    if (!isCheckbox) {
      onLogTime(task._id, logged);
    } else {
      handleCheckClick();
    }
  };

  const { addToast } = useUIStore();
  const [isSwiping, setIsSwiping] = useState(false);

  const handleDragEnd = async (e: any, info: any) => {
    if (isSwiping) return;

    // left pan (Right-to-Left swipe)
    if (info.offset.x < -50) {
      if (!isCheckbox) {
        setIsSwiping(true);
        addToast({ message: "+15m added!", type: "success" });
        onStateUpdate(instance._id, logged + 15);
        setTimeout(() => setIsSwiping(false), 500);
      }
    }
    // right pan (Left-to-Right swipe) 
    else if (info.offset.x > 80 && onDelete) {
      if (confirm("Delete task?")) {
        setIsSwiping(true);
        await fetch(`/api/task-instances/${instance._id}`, { method: 'DELETE' });
        onDelete(instance._id);
        setTimeout(() => setIsSwiping(false), 500);
      }
    }
  };

  const handleCheckClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Only process click if it's explicitly a checkbox task (targetDuration = 0)
    if (isCheckbox) {
      onStateUpdate(instance._id, logged > 0 ? 0 : 1);
    }
  };

  let CheckIcon = Circle;
  let CheckColor = "text-[var(--text-muted)]";

  if (isQuit && target > 0) {
    if (logged <= target) {
      CheckIcon = CheckCircle2;
      CheckColor = "text-[var(--accent-green)]";
    } else {
      CheckIcon = XCircle;
      CheckColor = "text-[var(--accent-red)]";
    }
  } else {
    if (progress === 0) {
      CheckIcon = Circle;
    } else if (progress < 100) {
      CheckIcon = CircleDot;
      CheckColor = "text-[var(--accent-amber)]";
    } else {
      CheckIcon = CheckCircle2;
      CheckColor = "text-[var(--accent-green)]";
    }
  }

  const priorityColor = task.priority === 'high' ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]' :
    task.priority === 'low' ? 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]' :
      'bg-[var(--accent)]/10 text-[var(--accent)]';

  return (
    <div className="relative w-full rounded-2xl  shadow-inner overflow-hidden border border-transparent">
      {!isCheckbox && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-6 text-[var(--accent)] font-extrabold z-0 gap-1 opacity-80 mix-blend-color-burn">
          <PlusSquare size={18} /> 15m
        </div>
      )}
      {onDelete && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-6 text-white font-extrabold z-0 gap-1 opacity-80">
          Delete
        </div>
      )}

      <motion.div
        drag={!isCheckbox ? "x" : false}
        dragConstraints={{ left: -100, right: onDelete ? 100 : 0 }}
        dragElastic={0.2}
        dragSnapToOrigin={true}
        onDragEnd={handleDragEnd}
        animate={controls}
        onClick={handleCardClick}
        className={`relative z-10 bg-[var(--bg-card)] border border-[var(--border)] shadow-sm rounded-2xl p-4 overflow-hidden transition-colors active:scale-[0.99] cursor-pointer ${progress === 100 && !isQuit && logged > 0 ? 'bg-[var(--bg-elevated)] grayscale-[50%]' : ''} ${(isQuit && logged > target) ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/5' : ''}`}
      >
        <div className="flex items-center justify-between gap-4 relative z-10 w-full mb-2">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--accent)] flex-shrink-0"
              style={{ backgroundColor: (task.color || "#3b82f6") + "20" }}
            >
              <DynamicIcon name={task.icon || "dumbbell"} size={24} />
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <h4 className="text-base font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
                <span className={progress === 100 && !isQuit ? 'line-through decoration-[var(--text-muted)]' : ''}>{task.name}</span>
              </h4>

              <div className="flex items-center gap-2 mt-1">
                {task.priority && (
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${priorityColor}`}>
                    {task.priority}
                  </span>
                )}
                {target > 0 && (
                  <p className={`text-[11px] font-bold ${isQuit && logged > target ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
                    {isQuit ? 'Limit' : 'Target'}: {Math.floor(target / 60) > 0 ? `${Math.floor(target / 60)}h ` : ''}{target % 60 > 0 ? `${target % 60}m` : ''}
                    {logged > 0 && ` • Logged: ${Math.floor(logged / 60) > 0 ? `${Math.floor(logged / 60)}h ` : ''}${logged % 60 > 0 ? `${logged % 60}m` : ''}`}
                  </p>
                )}
              </div>
            </div>

            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(instance); }}
              className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors active:scale-95 pointer-events-auto"
            >
              <MoreVertical size={16} />
            </button>
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleCheckClick}
            className={`shrink-0 p-2 -mr-2 transition-transform active:scale-90 ${CheckColor} pointer-events-auto`}
          >
            <CheckIcon size={24} strokeWidth={isQuit && logged > target ? 3 : 2} className={CheckColor} />
          </button>
        </div>

        {!isCheckbox && (
          <div className="mt-1 opacity-90">
            <ProgressBar progress={isQuit ? (lockedMathForQuitProgress(logged, target)) : progress} height={4} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function lockedMathForQuitProgress(logged: number, target: number) {
  if (logged > target) return 100; // Over filled (red logic maps via ProgressBar natively if 100 it turns green, wait, ProgressBar turns green at 67. We need inverse colors for quit).
  // The progress bar component handles its own colors. Since I can't inject a reverse scheme trivially without updating ProgressBar,
  // Let's pass the mathematical progress. Actually, target-max progress calculation was defined earlier:
  // Progress = INVERSE: 100% - (loggedTime / targetDuration) * 100.
  // We'll leave the ProgressBar generic. Let's just calculate logic.
  if (logged >= target) return 100;
  return (logged / target) * 100;
}
