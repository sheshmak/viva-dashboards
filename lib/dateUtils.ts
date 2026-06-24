// Shared date + Gantt-axis helpers used by the consolidated dashboard and the
// schedule page. All dates are "YYYY-MM-DD" strings unless noted.

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(s: string, n: number): string {
  const d = parseDate(s);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(s?: string): string {
  if (!s) return "—";
  return parseDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtYM(s?: string): string {
  if (!s) return "—";
  return parseDate(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function isWeekendDate(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export interface Tick {
  label: string;
  offset: number; // px from the timeline left edge
  key: string;
}

/** Single-row month ticks (legacy single header). */
export function monthTicks(start: string, end: string, ppd: number): Array<Tick & { isYear: boolean }> {
  const ticks: Array<Tick & { isYear: boolean }> = [];
  let cur = start.slice(0, 7) + "-01";
  while (cur <= end) {
    const d = parseDate(cur);
    ticks.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      offset: Math.max(0, daysBetween(start, cur)) * ppd,
      isYear: d.getMonth() === 0,
      key: cur,
    });
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    cur = d.toISOString().slice(0, 10);
  }
  return ticks;
}

/**
 * Two-row hierarchical header.
 *  - upper row = years (always)
 *  - lower row = months, or ISO weeks when zoomed in to "week".
 * Each tick carries a `width` so the renderer can draw labeled cells.
 */
export function buildHeaderTicks(
  start: string,
  end: string,
  ppd: number,
  zoom: "week" | "month" | "quarter" | "year" | "12months",
): { upper: Array<Tick & { width: number }>; lower: Array<Tick & { width: number }> } {
  const total = Math.max(1, daysBetween(start, end));

  // ── Upper: years ──────────────────────────────────────────────────────────
  const upper: Array<Tick & { width: number }> = [];
  {
    let curYear = parseDate(start).getFullYear();
    const endYear = parseDate(end).getFullYear();
    for (let y = curYear; y <= endYear; y++) {
      const segStart = `${y}-01-01` < start ? start : `${y}-01-01`;
      const segEnd = `${y}-12-31` > end ? end : `${y}-12-31`;
      const offset = Math.max(0, daysBetween(start, segStart)) * ppd;
      const width = Math.max(0, daysBetween(segStart, segEnd) + 1) * ppd;
      upper.push({ label: String(y), offset, width, key: `y${y}` });
    }
  }

  // ── Lower: months or weeks ────────────────────────────────────────────────
  const lower: Array<Tick & { width: number }> = [];
  if (zoom === "week") {
    // ISO-ish weeks: step every 7 days from the first Monday on/after start.
    let cur = start;
    const d0 = parseDate(start);
    const dow = (d0.getDay() + 6) % 7; // 0 = Monday
    cur = addDays(start, dow === 0 ? 0 : 7 - dow);
    while (cur <= end) {
      const offset = Math.max(0, daysBetween(start, cur)) * ppd;
      lower.push({
        label: parseDate(cur).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        offset,
        width: 7 * ppd,
        key: `w${cur}`,
      });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = start.slice(0, 7) + "-01";
    while (cur <= end) {
      const segStart = cur < start ? start : cur;
      const nextMonth = addMonths(cur, 1);
      const segEnd = nextMonth > end ? end : addDays(nextMonth, -1);
      const offset = Math.max(0, daysBetween(start, segStart)) * ppd;
      const width = Math.max(0, daysBetween(segStart, segEnd) + 1) * ppd;
      lower.push({
        label: parseDate(cur).toLocaleDateString("en-US", { month: "short" }),
        offset,
        width,
        key: `m${cur}`,
      });
      cur = nextMonth;
    }
  }

  void total;
  return { upper, lower };
}

/** Weekend shading bands (only worth computing at the "week" zoom). */
export function weekendBands(start: string, end: string, ppd: number): Array<{ offset: number; width: number }> {
  const bands: Array<{ offset: number; width: number }> = [];
  let cur = start;
  while (cur <= end) {
    if (isWeekendDate(parseDate(cur))) {
      bands.push({ offset: Math.max(0, daysBetween(start, cur)) * ppd, width: ppd });
    }
    cur = addDays(cur, 1);
  }
  return bands;
}
