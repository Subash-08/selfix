"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const title = usePageTitle();
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <header className="h-16 w-full md:hidden fixed top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md z-30 px-4 flex items-center justify-between border-b border-[var(--border)]">
      <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
      
      <Link href="/settings">
        {session?.user?.image ? (
          <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs shadow-sm">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
        )}
      </Link>
    </header>
  );
}
