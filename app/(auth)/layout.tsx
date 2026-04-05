import { SessionProviderWrapper } from "@/components/auth/SessionProviderWrapper";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProviderWrapper session={null}>
      {children}
    </SessionProviderWrapper>
  );
}
