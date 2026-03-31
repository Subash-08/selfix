"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, IndianRupee, RotateCcw, PenSquare, Activity, Target, HeartPulse, LineChart, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  const topItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Money", href: "/money", icon: IndianRupee },
    { label: "Habits", href: "/habits", icon: RotateCcw },
    { label: "Journal", href: "/journal", icon: PenSquare },
    { label: "Activity", href: "/activity", icon: Activity },
    { label: "Goals", href: "/goals", icon: Target },
    { label: "Health", href: "/health", icon: HeartPulse },
  ];

  const bottomItems = [
    { label: "Analytics", href: "/analytics", icon: LineChart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-[240px] h-screen fixed left-0 top-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex-col shadow-[var(--shadow)] z-40">
      <div className="h-16 flex items-center px-6 border-b border-[var(--border)] shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-[var(--accent)]">Selfix</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1 scrollbar-hide">
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
        
        <div className="my-4 border-t border-[var(--border)] mx-2" />
        
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 px-3 w-full group cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
          {session?.user?.image ? (
            <img src={session.user.image} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] shrink-0 flex items-center justify-center text-[var(--accent)] font-bold">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session?.user?.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate group-hover:text-[var(--accent-red)] transition-colors">Sign Out</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
