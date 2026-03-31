import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { FAB } from "@/components/layout/FAB";
import { PageShell } from "@/components/layout/PageShell";
import { SessionProviderWrapper } from "@/components/auth/SessionProviderWrapper";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProviderWrapper session={session}>
      <TopBar />
      <Sidebar />
      <PageShell>{children}</PageShell>
      <FAB />
      <BottomNav />
    </SessionProviderWrapper>
  );
}
