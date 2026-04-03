"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart3 } from "lucide-react";

export function MoneyTabSwitcher() {
  const pathname = usePathname();
  const isDaily = pathname === "/money";
  const isReport = pathname === "/money/report";

  const tabs = [
    { label: "Daily", href: "/money", active: isDaily, icon: CalendarDays },
    { label: "Report", href: "/money/report", active: isReport, icon: BarChart3 },
  ];

  return (
    <div className="flex border-b border-[var(--border)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors relative ${
              tab.active
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon size={16} />
            {tab.label}
            {tab.active && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
