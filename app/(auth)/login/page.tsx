"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  // Helper to safely get the callback URL from search parameters
  const getCallbackUrl = () => {
    if (typeof window === "undefined") return "/dashboard";
    const urlParams = new URLSearchParams(window.location.search);
    const callbackUrl = urlParams.get("callbackUrl");
    // Ensure it's a relative path to prevent open redirects
    return callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
  };

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push(getCallbackUrl());
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      if (res?.error) {
        addToast({ message: res.error, type: "error" });
      } else if (res?.ok) {
        // Must refresh to wipe out any cached state for server components
        router.refresh();
        router.push(getCallbackUrl());
      } else {
        addToast({ message: "Login failed. Please try again.", type: "error" });
      }
    } catch (err) {
      addToast({ message: "An unexpected error occurred", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = () => {
    signIn("google", { callbackUrl: getCallbackUrl() });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm bg-[var(--bg-card)] p-6 md:p-8 rounded-[var(--radius)] shadow-[var(--shadow)] border border-[var(--border)]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome Back</h1>
          <p className="text-[var(--text-secondary)] text-sm">Sign in to your Selfix dashboard</p>
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
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="••••••••"
          />
          <div className="flex justify-end mt-[-8px]">
            <Link href="/forgot-password" className="text-sm tracking-tight text-[var(--accent)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Sign In 
          </Button>
        </form>
        
        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-[var(--border)]"></div>
          <span className="flex-shrink-0 mx-4 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">Or</span>
          <div className="flex-grow border-t border-[var(--border)]"></div>
        </div>
        
        <Button variant="secondary" className="w-full mb-6" onClick={handleGoogle}>
          Sign in with Google
        </Button>
        
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Don't have an account? <Link href="/signup" className="text-[var(--accent)] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
