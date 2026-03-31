"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Activity, Target, HeartPulse, LineChart, Settings, LogOut } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: Props) {
  const pathname = usePathname();

  const menuItems = [
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Goals", href: "/goals", icon: Target },
    { label: "Health", href: "/health", icon: HeartPulse },
    { label: "Analytics", href: "/analytics", icon: LineChart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-[var(--radius)] z-50 flex flex-col shadow-[var(--shadow)] pb-[env(safe-area-inset-bottom)] md:hidden"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            <div className="w-full flex justify-center p-3 shrink-0 touch-none cursor-grab">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
            
            <div className="p-4 grid grid-cols-4 gap-4 pb-8">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={onClose}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'}`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{item.label}</span>
                  </Link>
                );
              })}
              
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--accent-red)]">
                  <LogOut size={24} />
                </div>
                <span className="text-xs font-medium text-[var(--accent-red)]">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
