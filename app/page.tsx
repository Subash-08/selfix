"use client";

import { useState, useEffect } from "react";

const ACCENT = "#6c63ff";

const FEATURES = [
  {
    icon: "💰",
    title: "Money Tracking",
    desc: "Log income and expenses. Set budgets. See exactly where your money goes.",
  },
  {
    icon: "⚡",
    title: "Activity Timeline",
    desc: "Track every hour of your day. Spot gaps. Maximize your time.",
  },
  {
    icon: "🔁",
    title: "Habit Streaks",
    desc: "Build and break habits with daily tracking, streaks, and heatmaps.",
  },
  {
    icon: "🍅",
    title: "Focus Timer",
    desc: "Pomodoro-based focus sessions with streak tracking and daily analytics.",
  },
  {
    icon: "🎯",
    title: "Task Manager",
    desc: "Organize tasks by day, week, or custom date. Nothing falls through.",
  },
  {
    icon: "📊",
    title: "Analytics",
    desc: "Cross-module insights. See patterns across all areas of your life.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Create your account",
    desc: "Sign up free. No credit card. Ready in under 30 seconds.",
  },
  {
    num: "02",
    title: "Set up your trackers",
    desc: "Enable the modules you care about. Money, habits, focus, or all of them.",
  },
  {
    num: "03",
    title: "Build your streaks",
    desc: "Check in daily. Watch your consistency compound over time.",
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a", color: "#fff" }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: perspective(1000px) rotateX(8deg) translateY(0); }
          50% { transform: perspective(1000px) rotateX(8deg) translateY(-8px); }
        }
        @keyframes floatMobile {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .anim-in {
          opacity: 0;
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .float-card {
          animation: float 4s ease-in-out infinite;
        }
        @media (max-width: 767px) {
          .float-card {
            animation: floatMobile 4s ease-in-out infinite;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════
          SECTION 1: NAVBAR
          ══════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-shadow duration-300"
        style={{
          backgroundColor: "rgba(10,10,10,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="grid grid-cols-2 gap-[2px] w-7 h-7">
              <div className="rounded-[3px]" style={{ backgroundColor: ACCENT }} />
              <div className="rounded-[3px]" style={{ backgroundColor: ACCENT + "99" }} />
              <div className="rounded-[3px]" style={{ backgroundColor: ACCENT + "66" }} />
              <div className="rounded-[3px]" style={{ backgroundColor: ACCENT + "33" }} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">selfix</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-400 rounded-lg transition-colors duration-200 hover:text-white hover:bg-white/5"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
              style={{ backgroundColor: ACCENT }}
            >
              Get Started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-[5px] p-2"
            aria-label="Toggle menu"
          >
            <span
              className="block w-5 h-[2px] bg-zinc-400 transition-all duration-200"
              style={{
                transform: menuOpen ? "rotate(45deg) translateY(7px)" : "none",
              }}
            />
            <span
              className="block w-5 h-[2px] bg-zinc-400 transition-opacity duration-200"
              style={{ opacity: menuOpen ? 0 : 1 }}
            />
            <span
              className="block w-5 h-[2px] bg-zinc-400 transition-all duration-200"
              style={{
                transform: menuOpen ? "rotate(-45deg) translateY(-7px)" : "none",
              }}
            />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            className="md:hidden px-5 pb-5 flex flex-col gap-3"
            style={{ backgroundColor: "rgba(10,10,10,0.95)" }}
          >
            <a
              href="/login"
              className="w-full text-center py-3 text-sm font-medium text-zinc-400 rounded-xl border border-white/10 transition-colors hover:text-white hover:bg-white/5"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="w-full text-center py-3 text-sm font-bold text-white rounded-xl transition-all hover:brightness-110"
              style={{ backgroundColor: ACCENT }}
            >
              Get Started
            </a>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════
          SECTION 2: HERO
          ══════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-20 pb-16 overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div
            className="anim-in px-4 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              color: ACCENT,
              backgroundColor: ACCENT + "1A",
              border: `1px solid ${ACCENT}4D`,
              boxShadow: `0 0 20px ${ACCENT}33`,
              animationDelay: "0ms",
            }}
          >
            ✦ Personal development, redefined
          </div>

          {/* Heading */}
          <h1
            className="anim-in text-4xl md:text-[56px] font-extrabold leading-[1.1] tracking-tight"
            style={{ animationDelay: "100ms" }}
          >
            Track your life.
            <br />
            <span style={{ color: ACCENT }}>Own your growth.</span>
          </h1>

          {/* Subheading */}
          <p
            className="anim-in mt-6 text-base md:text-lg text-zinc-400 max-w-lg leading-relaxed"
            style={{ animationDelay: "200ms" }}
          >
            One app for your money, time, habits, and focus.
            <br className="hidden sm:block" />
            Built for people who take their growth seriously.
          </p>

          {/* CTA Buttons */}
          <div
            className="anim-in flex flex-col sm:flex-row items-center gap-3 mt-8"
            style={{ animationDelay: "300ms" }}
          >
            <a
              href="/signup"
              className="px-6 py-3 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
              style={{ backgroundColor: ACCENT }}
            >
              Start tracking free →
            </a>
            <a
              href="/login"
              className="px-6 py-3 text-sm font-medium text-zinc-400 rounded-xl border border-white/10 transition-all duration-200 hover:border-white/20 hover:text-white hover:bg-white/5"
            >
              Sign in to your account
            </a>
          </div>

          {/* Social proof */}
          <p
            className="anim-in mt-5 text-xs text-zinc-600"
            style={{ animationDelay: "400ms" }}
          >
            No credit card required &nbsp;·&nbsp; Free to get started
          </p>
        </div>

        {/* Dashboard preview card */}
        <div
          className="relative z-10 mt-16 md:mt-20 w-full max-w-2xl float-card"
          style={{ animationDelay: "500ms" }}
        >
          <div
            className="rounded-2xl p-5 md:p-6"
            style={{
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `0 40px 80px ${ACCENT}26`,
            }}
          >
            {/* Stat row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: "💰", label: "Expenses", value: "₹24,500", sub: "this month" },
                { icon: "🍅", label: "Focus", value: "6 sessions", sub: "today" },
                { icon: "🔥", label: "Streak", value: "12 days", sub: "habits" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                      {s.label}
                    </span>
                  </div>
                  <div className="text-sm md:text-base font-bold text-white">{s.value}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  Weekly Coverage
                </span>
                <span className="text-[10px] text-zinc-600">Mon – Sun</span>
              </div>
              <div className="flex items-end gap-2 h-16">
                {[65, 80, 45, 90, 70, 55, 85].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md transition-all" style={{
                    height: `${h}%`,
                    backgroundColor: i === 3 ? ACCENT : ACCENT + "40",
                  }} />
                ))}
              </div>
              <div className="flex gap-2 mt-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-zinc-600">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3: FEATURES GRID
          ══════════════════════════════════════════════ */}
      <section className="px-5 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-4">
              What you can track
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Everything in one place.
            </h2>
            <p className="mt-4 text-zinc-400 text-sm md:text-base max-w-md mx-auto">
              Built around the habits of people who ship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 transition-all duration-250 cursor-default"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#141414";
                  e.currentTarget.style.borderColor = ACCENT + "4D";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#111";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: ACCENT + "1A" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white mt-4">{f.title}</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4: HOW IT WORKS
          ══════════════════════════════════════════════ */}
      <section className="px-5 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 mb-4">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Start in seconds.
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-[1px]"
              style={{
                backgroundImage: `repeating-linear-gradient(to right, ${ACCENT}33 0, ${ACCENT}33 6px, transparent 6px, transparent 12px)`,
              }}
            />

            {STEPS.map((s) => (
              <div key={s.num} className="relative text-center md:text-left">
                <div
                  className="text-5xl font-black mb-4 leading-none"
                  style={{ color: ACCENT + "33" }}
                >
                  {s.num}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto md:mx-0">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5: STATS BAR
          ══════════════════════════════════════════════ */}
      <section
        className="py-12 md:py-16"
        style={{
          backgroundColor: "#111",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-4xl mx-auto px-5 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-0">
          {[
            { value: "24h", label: "Tracked per day" },
            { value: "All modules", label: "In one app" },
            { value: "Free to start", label: "No credit card" },
          ].map((stat, i, arr) => (
            <div key={stat.label} className="flex items-center">
              <div className="text-center px-8 md:px-12">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1 font-medium">
                  {stat.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div
                  className="hidden md:block w-[1px] h-10"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6: FINAL CTA
          ══════════════════════════════════════════════ */}
      <section className="px-5 py-24 md:py-32 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-[40px] font-extrabold text-white tracking-tight leading-tight">
            Ready to take control?
          </h2>
          <p className="mt-5 text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
            Join people who track their growth every day.
          </p>
          <div className="mt-10">
            <a
              href="/signup"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-xl transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
              style={{
                backgroundColor: ACCENT,
                boxShadow: `0 0 40px ${ACCENT}4D`,
              }}
            >
              Get started for free →
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7: FOOTER
          ══════════════════════════════════════════════ */}
      <footer
        className="px-5 py-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs text-zinc-600">© 2026 selfix</span>
          <span className="text-xs text-zinc-600">Made with focus 🍅</span>
        </div>
      </footer>
    </div>
  );
}
