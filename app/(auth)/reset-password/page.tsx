"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return addToast({ message: "Missing reset token url", type: "error" });
    if (password !== confirmPassword) {
      return addToast({ message: "Passwords do not match", type: "error" });
    }
    if (password.length < 8) {
      return addToast({ message: "Password must be at least 8 characters", type: "error" });
    }
    
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        addToast({ message: data.error || "Failed to reset", type: "error" });
      } else {
        addToast({ message: "Password reset successful! You can now log in.", type: "success" });
        router.push("/login");
      }
    } catch (err: any) {
      addToast({ message: "Network error", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm bg-[var(--bg-card)] p-6 md:p-8 rounded-[var(--radius)] shadow border border-[var(--border)] text-center">
        <p className="text-[var(--accent-red)] mb-4">Invalid link. No token provided.</p>
        <Link href="/login"><Button className="w-full">Back to Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-[var(--bg-card)] p-6 md:p-8 rounded-[var(--radius)] shadow border border-[var(--border)]">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">New Password</h1>
        <p className="text-[var(--text-secondary)] text-sm">Create a new secure password.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
        <Input 
          label="New Password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="••••••••"
        />
        <Input 
          label="Confirm Password" 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          placeholder="••••••••"
        />
        <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
          Confirm Reset
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <Suspense fallback={<div className="text-[var(--text-muted)]">Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
