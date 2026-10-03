const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" });
const numFmt = new Intl.NumberFormat("de-DE");

export function clock(iso: string | null | undefined): string {
  if (!iso) return "–";
  return timeFmt.format(new Date(iso));
}

export function relative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const diff = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (diff < 45) return "gerade eben";
  const min = Math.round(diff / 60);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.${min % 60 ? ` ${min % 60} Min.` : ""}`;
  const d = Math.floor(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

export function uptime(iso: string | null): string {
  if (!iso) return "";
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} Std. ${min % 60} Min.` : `${min} Min.`;
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Heute";
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return dayFmt.format(d);
}

export function viewers(n: number | null): string {
  return n == null ? "" : `${numFmt.format(n)} Zuschauer`;
}

export function percent(c: number): string {
  return `${Math.round(c * 100)} %`;
}

export function isStale(lastUpdated: string | null | undefined, pollSeconds: number): boolean {
  if (!lastUpdated) return true;
  const limit = Math.max(pollSeconds * 3, 180) * 1000;
  return Date.now() - new Date(lastUpdated).getTime() > limit;
}
