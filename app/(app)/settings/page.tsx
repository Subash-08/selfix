"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession, signOut } from "next-auth/react";
import { Moon, Sun, Monitor, UserCircle, Palette, IndianRupee, Bell, Database, Shield, LogOut, ChevronRight, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUIStore } from "@/store/uiStore";
import { TIMEZONES, MONEY_CATEGORIES } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Section = "profile" | "appearance" | "money" | "notifications" | "data" | "account";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: profileData, isLoading, mutate } = useSWR("/api/user/profile", fetcher);
  const { theme, setTheme, addToast } = useUIStore();

  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [saving, setSaving] = useState(false);

  // Profile form
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [locale, setLocale] = useState("en-IN");
  const [currency, setCurrency] = useState("INR");
  const [weekStartsOn, setWeekStartsOn] = useState(1);

  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      setName(p.name || "");
      setTimezone(p.timezone || "Asia/Kolkata");
      setLocale(p.locale || "en-IN");
      setCurrency(p.currency || "INR");
      setWeekStartsOn(p.weekStartsOn ?? 1);
    }
  }, [profileData]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, locale, currency, weekStartsOn }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      addToast({ message: "Profile saved!", type: "success" });
      mutate();
    } catch (e: any) {
      addToast({ message: e.message || "Failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/analytics/export?format=json");
      const d = await res.json();
      const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selfix_data_export.json";
      a.click();
      addToast({ message: "Data exported!", type: "success" });
    } catch {
      addToast({ message: "Export failed", type: "error" });
    }
  };

  const sections = [
    { id: "profile" as const, label: "Profile", icon: UserCircle },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "money" as const, label: "Money", icon: IndianRupee },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "data" as const, label: "Data", icon: Database },
    { id: "account" as const, label: "Account", icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="40px" rounded="xl" />
        <Skeleton height="300px" rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>

      {/* Section Tabs (horizontal on mobile, vertical on desktop) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x pb-2 md:flex-wrap md:mx-0 md:px-0">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap snap-center shrink-0 transition-colors ${
                activeSection === s.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}>
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Profile Section */}
      {activeSection === "profile" && (
        <Card className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold">
              {profileData?.data?.avatar ? (
                <img src={profileData.data.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{name}</h3>
              <p className="text-sm text-[var(--text-muted)]">{session?.user?.email}</p>
            </div>
          </div>

          <Input label="Display Name" value={name} onChange={e => setName(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] focus:outline-none">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Locale</label>
              <select value={locale} onChange={e => setLocale(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] focus:outline-none">
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] focus:outline-none">
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>

          <Button onClick={saveProfile} isLoading={saving}>
            <Save size={16} className="mr-2" /> Save Profile
          </Button>
        </Card>
      )}

      {/* Appearance Section */}
      {activeSection === "appearance" && (
        <Card className="flex flex-col gap-5 p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Theme</h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { id: "dark" as const, label: "Dark", icon: Moon },
              { id: "light" as const, label: "Light", icon: Sun },
              { id: "system" as const, label: "System", icon: Monitor },
            ]).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all ${
                    theme === t.id
                      ? "bg-[var(--accent)] text-white shadow-md"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
                  }`}>
                  <Icon size={24} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Money Section */}
      {activeSection === "money" && (
        <Card className="flex flex-col gap-5 p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Money Settings</h3>
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Available Categories</h4>
            <div className="flex flex-wrap gap-2">
              {MONEY_CATEGORIES.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)]">
                  {c.icon} {c.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Custom categories coming soon</p>
          </div>
        </Card>
      )}

      {/* Notifications Section */}
      {activeSection === "notifications" && (
        <Card className="flex flex-col gap-5 p-5 items-center justify-center py-12">
          <Bell size={32} className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
          <p className="text-xs text-[var(--text-muted)] text-center">Push notifications and email reminders will be available in a future update.</p>
        </Card>
      )}

      {/* Data Section */}
      {activeSection === "data" && (
        <Card className="flex flex-col gap-5 p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Data Management</h3>
          <Button variant="secondary" onClick={handleExport}>
            <Database size={16} className="mr-2" /> Export All Data (JSON)
          </Button>
          <p className="text-xs text-[var(--text-muted)]">Download all your data as a JSON file for backup or analysis.</p>
        </Card>
      )}

      {/* Account Section */}
      {activeSection === "account" && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Account</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Email</span>
                <span className="font-bold text-[var(--text-primary)]">{session?.user?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Provider</span>
                <span className="font-bold text-[var(--text-primary)] capitalize">{profileData?.data?.provider || "credentials"}</span>
              </div>
            </div>
          </Card>

          <Button variant="danger" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}
