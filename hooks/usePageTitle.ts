import { usePathname } from "next/navigation";

export function usePageTitle() {
  const pathname = usePathname();

  if (pathname.includes("/dashboard")) return "Dashboard";
  if (pathname.includes("/money")) return "Money";
  if (pathname.includes("/habits")) return "Habits";
  if (pathname.includes("/journal")) return "Journal";
  if (pathname.includes("/activity")) return "Activity";
  if (pathname.includes("/goals")) return "Goals";
  if (pathname.includes("/health")) return "Health";
  if (pathname.includes("/analytics")) return "Analytics";
  if (pathname.includes("/settings")) return "Settings";
  if (pathname.includes("/admin")) return "Admin Panel";
  
  return "Selfix";
}
