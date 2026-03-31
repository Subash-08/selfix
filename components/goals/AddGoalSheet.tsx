"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";

export function AddGoalSheet() {
  const { isAddGoalOpen, setAddGoalOpen, addToast } = useUIStore();
  const { mutate } = useSWRConfig();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return addToast({ message: "Aim for something! Title required.", type: "error" });

    setIsLoading(true);
    
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error);
      
      addToast({ message: "Goal targeted successfully!", type: "success" });
      setTitle(""); setDescription("");
      setAddGoalOpen(false);
      
      mutate("/api/goals");
    } catch (err: any) {
      addToast({ message: err.message || "Failed to establish goal", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isAddGoalOpen} onClose={() => setAddGoalOpen(false)}>
      <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto pb-6">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">New Target</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Goal Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Save $5,000" required />
          <Input label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why are you pursuing this?" />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-3.5 rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] font-semibold shadow-sm transition-all focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="personal">Personal</option>
              <option value="finance">Finance</option>
              <option value="health">Health</option>
              <option value="career">Career</option>
              <option value="learning">Learning</option>
            </select>
          </div>
          
          <Button type="submit" isLoading={isLoading} className="mt-4 w-full h-12 font-bold tracking-wide">
            Establish Goal
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
