import React, { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-16 pb-16 md:pt-0 md:pb-0 md:pl-[240px] flex flex-col items-center">
      <div className="w-full max-w-5xl px-4 py-6 md:p-8 flex-1">
        {children}
      </div>
    </div>
  );
}
