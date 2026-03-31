"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage("Email verified successfully! You can now sign in.");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error occurred.");
      });
  }, [token]);

  return (
    <div className="w-full max-w-sm bg-[var(--bg-card)] p-6 md:p-8 rounded-[var(--radius)] shadow-[var(--shadow)] border border-[var(--border)] text-center">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Email Verification</h1>
      <p className={`mb-6 text-sm ${status === "error" ? "text-[var(--accent-red)]" : "text-[var(--text-secondary)]"}`}>
        {message}
      </p>
      
      {status !== "loading" && (
        <Link href="/login" className="block">
          <Button className="w-full">Go to Sign In</Button>
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <Suspense fallback={<div className="text-[var(--text-muted)]">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
