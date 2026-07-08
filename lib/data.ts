// Business-scoped data access shared by every module. One thin layer over the
// db client (Supabase or local) so pages/actions never repeat business filters.

import { getDb } from "./db";
import type { TableMap, TableName } from "./types";

export async function all<T extends TableName>(
  table: T,
  businessId: string
): Promise<TableMap[T][]> {
  const db = getDb();
  const { data, error } = await db.from(table).select("*").eq("business_id", businessId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as TableMap[T][];
}

export async function byId<T extends TableName>(
  table: T,
  businessId: string,
  id: string
): Promise<TableMap[T] | null> {
  const db = getDb();
  const { data } = await db
    .from(table)
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  return (data as TableMap[T]) ?? null;
}

// ----- timezone-aware date helpers ------------------------------------------
// These compute boundaries relative to the business's configured timezone
// instead of the server's (UTC on Vercel). All callers that touch "today" or
// "this month" should use these with the business timezone from the session.

/**
 * Returns a UTC Date representing the start of "today" in the given timezone.
 * e.g. for Asia/Kolkata at 2026-07-08T23:30Z (which is 2026-07-09 05:00 IST),
 * this returns 2026-07-08T18:30Z (midnight IST on July 9).
 */
export const startOfTodayTz = (tz: string = "Asia/Kolkata") => {
  const now = new Date();
  // Get the current date string in the target timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const d = Number(parts.find((p) => p.type === "day")!.value);
  // Build a date at midnight in the target tz by computing the offset
  const midnight = new Date(Date.UTC(y, m, d));
  const offsetMs = midnight.getTime() - new Date(
    midnight.toLocaleString("en-US", { timeZone: tz })
  ).getTime();
  return new Date(midnight.getTime() + offsetMs);
};

export const startOfMonthTz = (tz: string = "Asia/Kolkata") => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const midnight = new Date(Date.UTC(y, m, 1));
  const offsetMs = midnight.getTime() - new Date(
    midnight.toLocaleString("en-US", { timeZone: tz })
  ).getTime();
  return new Date(midnight.getTime() + offsetMs);
};

export const monthsAgoTz = (n: number, tz: string = "Asia/Kolkata") => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const d = new Date(Date.UTC(y, m - n, 1));
  const offsetMs = d.getTime() - new Date(
    d.toLocaleString("en-US", { timeZone: tz })
  ).getTime();
  return new Date(d.getTime() + offsetMs);
};

// ----- legacy date helpers (UTC, kept for backward compat) ------------------
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};
export const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};
export const isSameDay = (a: string | Date, b: Date) => {
  const d = new Date(a);
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
};
export const monthKey = (d: string | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

export const formatDateTz = (d: string | Date, tz: string = "Asia/Kolkata") => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
};

export const formatMonthTz = (d: string | Date, tz: string = "Asia/Kolkata") => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).format(new Date(d));
};

export const prevMonthKeyTz = (tz: string = "Asia/Kolkata") => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return formatMonthTz(d, tz);
};

export const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0);


