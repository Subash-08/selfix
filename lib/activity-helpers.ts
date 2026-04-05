// ─── Activity Page Helper Functions & Types ────────────────────

export interface ActivityEntry {
  _id: string;
  name: string;
  category: string;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  durationMinutes: number;
  date: string;
}

export interface GapItem {
  type: "gap";
  startTime: string;
  endTime: string;
  durationMins: number;
  label: string;
}

export interface EntryItem {
  type: "entry";
  entry: ActivityEntry;
}

export type MergedListItem = EntryItem | GapItem;

export interface AnalyticsData {
  coverage: {
    days: Array<{ date: string; trackedMins: number; totalMins: number; pct: number; hasData: boolean }>;
    avgTrackedMins: number;
    fullyTrackedCount: number;
    bestDay: { date: string; trackedMins: number };
  };
  breakdown: Array<{ label: string; hours: number; pct: number }>;
  focus: {
    totalSessions: number;
    totalMins: number;
    avgPerDay: number;
    bestDay: { date: string; count: number };
    abandonedCount: number;
    days: Array<{ date: string; count: number; hitTarget: boolean }>;
  };
  streak: {
    current: number;
    longest: number;
    thisMonthDays: number;
    totalDays: number;
  };
}

// ─── Time Helpers ──────────────────────────────────────────────

/** Convert 24h "HH:MM" to "9:30 AM" */
export function formatTime(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Convert "9:30 AM" back to "09:30" */
export function to24h(time12: string): string {
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format minutes to "2h 30m" or "45m" */
export function formatDuration(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Calculate duration in minutes between two HH:MM strings */
export function calcDuration(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/** Check if two time ranges overlap */
export function hasOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Add minutes to a HH:MM time string, returns HH:MM */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Get current time as HH:MM */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Coverage bar color based on percentage */
export function coverageColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

// ─── Gap Detection ─────────────────────────────────────────────

export function detectGaps(entries: ActivityEntry[]): MergedListItem[] {
  if (!entries.length) return [];

  const sorted = [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const result: MergedListItem[] = [];

  // Gap before first entry
  if (sorted[0].startTime > "00:00") {
    const d = calcDuration("00:00", sorted[0].startTime);
    if (d > 0) result.push({ type: "gap", startTime: "00:00", endTime: sorted[0].startTime, durationMins: d, label: formatDuration(d) });
  }

  for (let i = 0; i < sorted.length; i++) {
    result.push({ type: "entry", entry: sorted[i] });

    if (i < sorted.length - 1 && sorted[i].endTime < sorted[i + 1].startTime) {
      const d = calcDuration(sorted[i].endTime, sorted[i + 1].startTime);
      if (d > 0) result.push({ type: "gap", startTime: sorted[i].endTime, endTime: sorted[i + 1].startTime, durationMins: d, label: formatDuration(d) });
    }
  }

  // Gap after last entry
  const last = sorted[sorted.length - 1];
  if (last.endTime < "23:59") {
    const d = calcDuration(last.endTime, "23:59");
    if (d > 0) result.push({ type: "gap", startTime: last.endTime, endTime: "23:59", durationMins: d, label: formatDuration(d) });
  }

  return result;
}

/** Find consecutive same-name entries */
export function findMergeable(entries: ActivityEntry[]): { ids: string[]; name: string; count: number } | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let i = 0; i < sorted.length; i++) {
    const ids = [sorted[i]._id];
    let j = i + 1;
    while (j < sorted.length && sorted[j].name === sorted[i].name && sorted[j - 1].endTime === sorted[j].startTime) {
      ids.push(sorted[j]._id);
      j++;
    }
    if (ids.length >= 2) {
      return { ids, name: sorted[i].name, count: ids.length };
    }
  }
  return null;
}

/** Get the latest endTime from entries, or current time if none */
export function getLastEndTime(entries: ActivityEntry[]): string {
  if (!entries.length) return nowHHMM();
  const sorted = [...entries].sort((a, b) => b.endTime.localeCompare(a.endTime));
  return sorted[0].endTime;
}

// ─── Analytics Colors ──────────────────────────────────────────
export const BREAKDOWN_COLORS = ["#6c63ff", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#6b7280"];

export const TIMER_STORAGE_KEY = "activeTimerSession";
