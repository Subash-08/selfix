"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        addToast({ message: data.error || "Failed to process request", type: "error" });
      } else {
        addToast({ message: data.data.message, type: "success" });
        setEmail("");
      }
    } catch (err: any) {
      addToast({ message: "Network error", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm bg-[var(--bg-card)] p-6 md:p-8 rounded-[var(--radius)] shadow-[var(--shadow)] border border-[var(--border)]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Reset Password</h1>
          <p className="text-[var(--text-secondary)] text-sm">Enter your email to receive a recovery link.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <Input 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="you@example.com"
          />
          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Send Link
          </Button>
        </form>
        
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Remember your password? <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
