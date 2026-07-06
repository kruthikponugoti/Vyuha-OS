// A local, in-memory stand-in for the Supabase client. Implements the subset
// of the PostgREST query builder Vyuha OS uses, so every module is written
// once against one API and runs identically in demo mode and against Supabase.
//
// Supported: from(t).select().eq/neq/gt/gte/lt/lte/ilike/in/or(simple)
//            .order().limit().range().single().maybeSingle()
//            .insert(rows).select(), .update(patch).eq(...), .delete().eq(...)

type Row = Record<string, any>;
export type LocalDatabase = Record<string, Row[]>;

type Filter = (r: Row) => boolean;

export interface QueryResult<T = any> {
  data: T | null;
  error: { message: string } | null;
  count?: number;
}

function makeId() {
  // Node 18+ / browsers
  return globalThis.crypto.randomUUID();
}

function like(value: any, pattern: string): boolean {
  if (value == null) return false;
  const re = new RegExp(
    "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$",
    "i"
  );
  return re.test(String(value));
}

export class LocalQueryBuilder<T = Row> implements PromiseLike<QueryResult<T>> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row[] | Row | null = null;
  private wantSingle = false;
  private wantMaybe = false;
  private wantCount = false;

  constructor(
    private db: LocalDatabase,
    private table: string,
    private onWrite: (table: string) => void
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    return this;
  }

  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.payload = rows;
    return this;
  }

  update(patch: Row) {
    this.mode = "update";
    this.payload = patch;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  gt(col: string, val: any) {
    this.filters.push((r) => r[col] > val);
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push((r) => r[col] >= val);
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push((r) => r[col] < val);
    return this;
  }
  lte(col: string, val: any) {
    this.filters.push((r) => r[col] <= val);
    return this;
  }
  ilike(col: string, pattern: string) {
    this.filters.push((r) => like(r[col], pattern));
    return this;
  }
  in(col: string, vals: any[]) {
    const set = new Set(vals);
    this.filters.push((r) => set.has(r[col]));
    return this;
  }
  /** Supports the simple form "col1.ilike.%q%,col2.ilike.%q%" used for search. */
  or(expr: string) {
    const parts = expr.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".");
      const val = rest.join(".");
      return { col, op, val };
    });
    this.filters.push((r) =>
      parts.some(({ col, op, val }) => {
        if (op === "ilike") return like(r[col], val);
        if (op === "eq") return String(r[col]) === val;
        return false;
      })
    );
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.offsetN = from;
    this.limitN = to - from + 1;
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantMaybe = true;
    return this;
  }

  private rows(): Row[] {
    if (!this.db[this.table]) this.db[this.table] = [];
    return this.db[this.table];
  }

  private matching(): Row[] {
    let out = this.rows().filter((r) => this.filters.every((f) => f(r)));
    for (const { col, asc } of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av < bv ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    return out;
  }

  private exec(): QueryResult<T> {
    try {
      if (this.mode === "insert") {
        const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
        const inserted = rows.map((r) => {
          const row = { ...r };
          if (!row.id) row.id = makeId();
          if (!("created_at" in row) || row.created_at == null)
            row.created_at = new Date().toISOString();
          this.rows().push(row);
          return row;
        });
        this.onWrite(this.table);
        const data = this.wantSingle || this.wantMaybe ? inserted[0] : inserted;
        return { data: data as T, error: null };
      }

      if (this.mode === "update") {
        const targets = this.matching();
        targets.forEach((r) => Object.assign(r, this.payload));
        this.onWrite(this.table);
        const data = this.wantSingle || this.wantMaybe ? targets[0] ?? null : targets;
        return { data: data as T, error: null };
      }

      if (this.mode === "delete") {
        const targets = new Set(this.matching().map((r) => r.id));
        this.db[this.table] = this.rows().filter((r) => !targets.has(r.id));
        this.onWrite(this.table);
        return { data: null, error: null };
      }

      // select
      let out = this.matching();
      const count = this.wantCount ? out.length : undefined;
      if (this.offsetN) out = out.slice(this.offsetN);
      if (this.limitN != null) out = out.slice(0, this.limitN);
      if (this.wantSingle) {
        if (out.length !== 1)
          return {
            data: null,
            error: { message: `single() expected 1 row, got ${out.length}` },
            count,
          };
        return { data: structuredClone(out[0]) as T, error: null, count };
      }
      if (this.wantMaybe) {
        return { data: (out[0] ? structuredClone(out[0]) : null) as T, error: null, count };
      }
      return { data: structuredClone(out) as T, error: null, count };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? "local db error" } };
    }
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }
}

export class LocalClient {
  constructor(
    private db: LocalDatabase,
    private onWrite: (table: string) => void = () => {}
  ) {}

  from(table: string) {
    return new LocalQueryBuilder(this.db, table, this.onWrite);
  }
}
