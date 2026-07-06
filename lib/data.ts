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

// ----- date helpers on ISO strings -----
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
export const sum = <T>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0);
