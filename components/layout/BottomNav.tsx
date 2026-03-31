"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, IndianRupee, RotateCcw, PenSquare, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { MobileDrawer } from "./MobileDrawer";

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Exclude auth / unrestricted public routes entirely logically
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  const tabs = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Money", href: "/money", icon: IndianRupee },
    { label: "Habits", href: "/habits", icon: RotateCcw },
    { label: "Journal", href: "/journal", icon: PenSquare },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 w-full bg-[var(--bg-card)] border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)] z-30 px-2 h-16 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.05)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          
          return (
            <Link 
              key={tab.href} 
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] relative"
            >
              <motion.div animate={{ scale: isActive ? 1.15 : 1 }} className="relative z-10 transition-colors">
                <Icon size={22} className={isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
              </motion.div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        
        <button 
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px]"
        >
          <motion.div whileTap={{ scale: 0.9 }}>
            <MoreHorizontal size={22} className="text-[var(--text-muted)]" />
          </motion.div>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">More</span>
        </button>
      </nav>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
