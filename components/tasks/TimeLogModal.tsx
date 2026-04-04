import { useState, useEffect } from "react";
import { X, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  currentLogged: number;
  targetDuration: number | null;
  mode: "target-min" | "target-max";
  onSave: (newLoggedTime: number) => void;
}

export function TimeLogModal({ isOpen, onClose, taskName, currentLogged, targetDuration, mode, onSave }: TimeLogModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [undoStack, setUndoStack] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const h = Math.floor(currentLogged / 60);
      const m = currentLogged % 60;
      setHours(h);
      setMinutes(m);
      setUndoStack(null);
    }
  }, [isOpen, currentLogged]);

  if (!isOpen) return null;

  const totalMinutes = (hours * 60) + minutes;

  const handleUpdate = (total: number) => {
    setUndoStack(totalMinutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    setHours(h);
    setMinutes(m);
  };

  const handleAdd = (val: number) => {
    handleUpdate(totalMinutes + val);
  };

  const handleSave = () => {
    onSave(totalMinutes);
    onClose();
  };

  const handleUndo = () => {
    if (undoStack !== null) {
      handleUpdate(undoStack);
      setUndoStack(null);
    }
  };

  const target = targetDuration || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 border border-[var(--border)] shadow-[var(--shadow-xl)] flex flex-col gap-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{taskName}</h3>
              {target > 0 && (
                <p className="text-xs font-bold text-[var(--accent)] mt-1">
                  {mode === 'target-min' ? 'Target: At least ' : 'Limit: Less than '}
                  {Math.floor(target / 60) > 0 ? `${Math.floor(target / 60)}h ` : ''}
                  {target % 60 > 0 ? `${target % 60}m` : ''}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors self-start">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            
            {/* Input Row */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-baseline gap-1 bg-[var(--bg-elevated)] px-4 py-3 rounded-2xl border border-[var(--border-hover)] focus-within:border-[var(--accent)] transition-colors">
                <input 
                  type="number"
                  min="0"
                  value={hours || ""}
                  onChange={(e) => {
                      setUndoStack(totalMinutes);
                      setHours(Math.max(0, Number(e.target.value) || 0));
                  }}
                  className="w-12 text-center text-3xl font-bold bg-transparent outline-none p-0 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  placeholder="0"
                  inputMode="numeric"
                />
                <span className="text-lg font-bold text-[var(--text-muted)]">h</span>
              </div>
              <span className="text-2xl font-bold text-[var(--text-muted)]">:</span>
              <div className="flex items-baseline gap-1 bg-[var(--bg-elevated)] px-4 py-3 rounded-2xl border border-[var(--border-hover)] focus-within:border-[var(--accent)] transition-colors">
                <input 
                  type="number"
                  min="0"
                  max="59"
                  value={minutes || ""}
                  onChange={(e) => {
                      setUndoStack(totalMinutes);
                      let val = Number(e.target.value) || 0;
                      if (val > 59) {
                        setHours(h => h + Math.floor(val / 60));
                        val = val % 60;
                      }
                      setMinutes(Math.max(0, val));
                  }}
                  className="w-16 text-center text-3xl font-bold bg-transparent outline-none p-0 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  placeholder="00"
                  inputMode="numeric"
                  autoFocus
                />
                <span className="text-lg font-bold text-[var(--text-muted)]">m</span>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 mt-2 w-full justify-center">
              <button onClick={() => handleAdd(5)} className="px-5 py-3 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-hover)] transition-colors flex-1 flex justify-center text-sm border border-[var(--border)]">+5m</button>
              <button onClick={() => handleAdd(15)} className="px-5 py-3 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-hover)] transition-colors flex-1 flex justify-center text-sm border border-[var(--border)]">+15m</button>
              <button onClick={() => handleAdd(30)} className="px-5 py-3 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-hover)] transition-colors flex-1 flex justify-center text-sm border border-[var(--border)]">+30m</button>
            </div>

            {target > 0 && (
              <div className="flex gap-2 w-full mt-2">
                {mode === 'target-min' ? (
                  <button onClick={() => handleUpdate(target)} className="flex-1 py-3 bg-[var(--accent-green)]/10 text-[var(--accent-green)] font-bold rounded-xl text-sm border border-[var(--accent-green)]/20">Quick Done ({target}m)</button>
                ) : (
                  <>
                    <button onClick={() => handleUpdate(target)} className="flex-1 py-3 bg-[var(--accent-green)]/10 text-[var(--accent-green)] font-bold rounded-xl text-xs border border-[var(--accent-green)]/20">Exact Limit ({target}m)</button>
                    <button onClick={() => handleUpdate(target + 15)} className="flex-1 py-3 bg-[var(--accent-red)]/10 text-[var(--accent-red)] font-bold rounded-xl text-xs border border-[var(--accent-red)]/20">Way Over (+15m)</button>
                  </>
                )}
              </div>
            )}
            
            <div className="flex w-full gap-3 mt-4">
              <button 
                onClick={handleUndo}
                disabled={undoStack === null}
                className="px-5 py-4 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-[100px] border border-[var(--border)]"
              >
                <Undo2 size={22} className="opacity-80" />
              </button>
              <button 
                onClick={handleSave}
                className="py-4 rounded-2xl bg-[var(--accent)] text-white font-bold hover:opacity-90 transition-opacity flex-1 shadow-md text-lg"
              >
                Save Protocol
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
