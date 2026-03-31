"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";
import { z } from "zod";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{name?: string, email?: string, password?: string}>({});
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Client side validtion
    const schema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email"),
      password: z.string().min(8, "Password must be at least 8 characters")
    });
    
    const result = schema.safeParse({ name, email, password });
    if (!result.success) {
      addToast({ message: result.error.message, type: "error" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        addToast({ message: data.error || "Failed to sign up", type: "error" });
      } else {
        addToast({ message: "Success! Please check your email to verify.", type: "success" });
        router.push("/login");
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create Account</h1>
          <p className="text-[var(--text-secondary)] text-sm">Start tracking with Selfix</p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <Input 
            label="Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="John Doe"
            error={errors.name}
          />
          <Input 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com"
            error={errors.email}
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            error={errors.password}
          />
          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Sign Up
          </Button>
        </form>
        
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Already have an account? <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
