import { Pool } from "pg";

/* ──────────────────────────────────────────────
   Foreign-key map used to resolve relation joins
   ────────────────────────────────────────────── */
const FK: Record<string, Record<string, string>> = {
  bookings: { services: "service_id", therapists: "therapist_id", customers: "customer_id", beds: "bed_id" },
  attendance: { therapists: "therapist_id" },
  payments: { bookings: "booking_id" },
  commissions: { therapists: "therapist_id" },
};
const REVERSE_FK: Record<string, Record<string, string>> = {
  bookings: { payments: "booking_id" },
};

interface Rel { table: string; cols: string; joinType: "LEFT" | "INNER"; fk: string; alias: string }
interface RevRel { table: string; cols: string; fk: string }

/* ──────────────────────────────────────────────
   PgClient  –  drop-in replacement for supabase.getClient()
   ────────────────────────────────────────────── */
export class PgClient {
  constructor(private pool: Pool) {}
  from(table: string) { return new PgQueryBuilder(this.pool, table); }
}

/* ──────────────────────────────────────────────
   PgQueryBuilder  –  Supabase-compatible chaining API
   ────────────────────────────────────────────── */
export class PgQueryBuilder {
  private pool: Pool;
  private tbl: string;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private cols = "*";
  private rels: Rel[] = [];
  private revRels: RevRel[] = [];
  private conds: string[] = [];
  private vals: unknown[] = [];
  private pi = 0; // param index
  private insData: unknown = null;
  private updData: Record<string, unknown> | null = null;
  private upsertConflict = "id";
  private ordSql: string | null = null;
  private limVal: number | null = null;
  private retCols: string | null = null;
  private _single = false;
  private _maybe = false;
  private _countExact = false;
  private _headOnly = false;

  constructor(pool: Pool, table: string) { this.pool = pool; this.tbl = table; }

  /* ── helpers ── */
  private p(v: unknown) { this.vals.push(v); return `$${++this.pi}`; }
  private tblAlias() { return this.tbl.charAt(0); }

  /* ── select ── */
  select(columns: string, opts?: { count?: string; head?: boolean }) {
    this.op = "select";
    if (opts?.count === "exact") this._countExact = true;
    if (opts?.head) this._headOnly = true;
    this.parseColumns(columns);
    return this;
  }

  private parseColumns(raw: string) {
    let base = raw;
    const re = /,?\s*(\w+)(?:!(\w+))?\(([^)]*)\)\s*/g;
    let m: RegExpExecArray | null;
    let ai = 0;
    while ((m = re.exec(raw)) !== null) {
      const [full, rel, mod, rc] = m;
      const inner = mod === "inner";
      const fkMap = FK[this.tbl];
      const revMap = REVERSE_FK[this.tbl];
      if (fkMap?.[rel]) {
        this.rels.push({ table: rel, cols: rc || "*", joinType: inner ? "INNER" : "LEFT", fk: fkMap[rel], alias: `_r${ai++}` });
      } else if (revMap?.[rel]) {
        this.revRels.push({ table: rel, cols: rc || "*", fk: revMap[rel] });
      }
      base = base.replace(full, "");
    }
    base = base.replace(/,\s*,/g, ",").replace(/^\s*,\s*/, "").replace(/\s*,\s*$/, "").trim();
    this.cols = base || "*";
  }

  /* ── insert / update / upsert ── */
  insert(data: unknown) { this.op = "insert"; this.insData = data; return this; }
  update(data: Record<string, unknown>) { this.op = "update"; this.updData = data; return this; }
  upsert(data: unknown[], opts?: { onConflict?: string }) {
    this.op = "upsert"; this.insData = data; this.upsertConflict = opts?.onConflict || "id"; return this;
  }
  delete() { this.op = "delete"; return this; }

  /* ── where conditions ── */
  eq(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} = ${this.p(value)}`); return this; }
  neq(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} != ${this.p(value)}`); return this; }
  gt(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} > ${this.p(value)}`); return this; }
  lt(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} < ${this.p(value)}`); return this; }
  gte(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} >= ${this.p(value)}`); return this; }
  lte(field: string, value: unknown) { this.conds.push(`${this.resolveField(field)} <= ${this.p(value)}`); return this; }
  in(field: string, values: unknown[]) {
    if (!values.length) { this.conds.push("FALSE"); return this; }
    const placeholders = values.map(v => this.p(v)).join(", ");
    this.conds.push(`${this.resolveField(field)} IN (${placeholders})`);
    return this;
  }

  not(field: string, operator: string, value: unknown) {
    const f = this.resolveField(field);
    if (operator === "in") {
      // value like '("cancelled","checkout")' → parse to array
      const items = String(value).replace(/[()]/g, "").split(",").map(s => s.trim().replace(/"/g, "'"));
      this.conds.push(`${f} NOT IN (${items.join(",")})`);
    } else if (operator === "eq") {
      this.conds.push(`${f} != ${this.p(value)}`);
    }
    return this;
  }

  or(expr: string) {
    // PostgREST syntax: "name.ilike.%q%,code.ilike.%q%,phone.ilike.%q%"
    const parts = expr.split(",").map(part => {
      const [field, op, ...rest] = part.trim().split(".");
      const val = rest.join(".");
      if (op === "ilike") return `${field} ILIKE ${this.p(val)}`;
      if (op === "eq") return `${field} = ${this.p(val)}`;
      return `${field} = ${this.p(val)}`;
    });
    this.conds.push(`(${parts.join(" OR ")})`);
    return this;
  }

  private resolveField(field: string): string {
    if (field.includes(".")) {
      const [tbl, col] = field.split(".");
      const rel = this.rels.find(r => r.table === tbl);
      return rel ? `${rel.alias}.${col}` : `${tbl}.${col}`;
    }
    return this.rels.length > 0 ? `${this.tbl}.${field}` : field;
  }

  /* ── modifiers ── */
  order(field: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? "DESC" : "ASC";
    const f = this.rels.length > 0 ? `${this.tbl}.${field}` : field;
    this.ordSql = `ORDER BY ${f} ${dir}`;
    return this;
  }
  limit(n: number) { this.limVal = n; return this; }

  /* ── terminal: select() after insert/update means RETURNING ── */
  // When called on insert/update, this sets RETURNING columns
  private chainSelect(columns?: string) {
    if (this.op === "insert" || this.op === "update") {
      this.retCols = columns || "*";
      // Also parse relations for RETURNING
      if (columns && columns.includes("(")) {
        this.parseColumns(columns);
        this.retCols = this.cols;
      }
    }
    return this;
  }

  /* ── execution terminals ── */
  single() { this._single = true; return this.exec(); }
  maybeSingle() { this._maybe = true; return this.exec(); }

  // Make it thenable so `await builder` works
  then<T1 = unknown, T2 = never>(
    resolve?: ((v: { data: unknown; error: unknown; count?: number }) => T1 | PromiseLike<T1>) | null,
    reject?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return this.exec().then(resolve, reject);
  }

  private async exec(): Promise<{ data: unknown; error: unknown; count?: number }> {
    try {
      if (this.op === "select") return await this.execSelect();
      if (this.op === "insert") return await this.execInsert();
      if (this.op === "update") return await this.execUpdate();
      if (this.op === "upsert") return await this.execUpsert();
      if (this.op === "delete") return await this.execDelete();
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /* ── SELECT execution ── */
  private async execSelect() {
    const where = this.conds.length ? `WHERE ${this.conds.join(" AND ")}` : "";

    // Count-only mode
    if (this._countExact && this._headOnly) {
      const sql = `SELECT COUNT(*) as cnt FROM ${this.tbl} ${where}`;
      const res = await this.pool.query(sql, this.vals);
      return { data: null, error: null, count: parseInt(res.rows[0].cnt) };
    }

    // Build SELECT with JOINs
    let selectParts: string[] = [];
    if (this.cols === "*") {
      selectParts.push(`row_to_json(${this.tbl}.*) as _main`);
    } else {
      selectParts.push(...this.cols.split(",").map(c => `${this.tbl}.${c.trim()}`));
    }

    const joins: string[] = [];
    for (const rel of this.rels) {
      joins.push(`${rel.joinType} JOIN ${rel.table} ${rel.alias} ON ${this.tbl}.${rel.fk} = ${rel.alias}.id`);
      selectParts.push(`row_to_json(${rel.alias}.*) as ${rel.table}`);
    }

    let selectClause: string;
    if (this.cols === "*" && this.rels.length > 0) {
      selectClause = `${this.tbl}.*, ${this.rels.map(r => `row_to_json(${r.alias}.*) as ${r.table}`).join(", ")}`;
    } else if (this.cols === "*") {
      selectClause = "*";
    } else if (this.rels.length > 0) {
      selectClause = `${this.cols.split(",").map(c => `${this.tbl}.${c.trim()}`).join(", ")}, ${this.rels.map(r => `row_to_json(${r.alias}.*) as ${r.table}`).join(", ")}`;
    } else {
      selectClause = this.cols;
    }

    const sql = [
      `SELECT ${selectClause}`,
      `FROM ${this.tbl}`,
      ...joins,
      where,
      this.ordSql || "",
      this.limVal ? `LIMIT ${this.limVal}` : "",
    ].filter(Boolean).join(" ");

    const res = await this.pool.query(sql, this.vals);
    let rows = res.rows;

    // Handle reverse relations (has_many)
    if (this.revRels.length > 0 && rows.length > 0) {
      for (const rr of this.revRels) {
        const ids = rows.map(r => r.id);
        const cols = rr.cols === "*" ? "*" : rr.cols;
        const subSql = `SELECT ${cols}, ${rr.fk} FROM ${rr.table} WHERE ${rr.fk} = ANY($1)`;
        const subRes = await this.pool.query(subSql, [ids]);
        for (const row of rows) {
          row[rr.table] = subRes.rows.filter(sr => sr[rr.fk] === row.id);
        }
      }
    }

    if (this._single) {
      return { data: rows[0] || null, error: rows[0] ? null : { message: "No rows found" } };
    }
    if (this._maybe) {
      return { data: rows[0] || null, error: null };
    }
    return { data: rows, error: null };
  }

  /* ── INSERT execution ── */
  private async execInsert() {
    const data = this.insData as Record<string, unknown>;
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const values = keys.map(k => data[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    let sql = `INSERT INTO ${this.tbl} (${keys.join(", ")}) VALUES (${placeholders.join(", ")})`;

    const hasReturn = this.retCols !== null;
    if (hasReturn) {
      const retSelect = this.retCols === "*" ? "*" : this.retCols!;
      // If there are relations to return, we need a CTE
      if (this.rels.length > 0) {
        const joins = this.rels.map(r => `LEFT JOIN ${r.table} ${r.alias} ON ins.${r.fk} = ${r.alias}.id`).join(" ");
        const relCols = this.rels.map(r => `row_to_json(${r.alias}.*) as ${r.table}`).join(", ");
        sql = `WITH ins AS (${sql} RETURNING *) SELECT ins.*, ${relCols} FROM ins ${joins}`;
      } else {
        sql += ` RETURNING ${retSelect}`;
      }
    }

    const res = await this.pool.query(sql, values);
    if (!hasReturn) return { data: null, error: null };
    const row = this._single ? (res.rows[0] || null) : res.rows;
    return { data: row, error: null };
  }

  /* ── UPDATE execution ── */
  private async execUpdate() {
    const data = this.updData!;
    const keys = Object.keys(data).filter(k => data[k] !== undefined);

    // Reindex params: update SET params come first, then WHERE params
    const allVals: unknown[] = [];
    const setParts = keys.map((k, i) => {
      allVals.push(data[k]);
      return `${k} = $${i + 1}`;
    });

    // Reindex WHERE conditions
    const offset = keys.length;
    const newConds = this.conds.map(c => {
      return c.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + offset}`);
    });

    allVals.push(...this.vals);
    const where = newConds.length ? `WHERE ${newConds.join(" AND ")}` : "";

    let sql = `UPDATE ${this.tbl} SET ${setParts.join(", ")} ${where}`;

    const hasReturn = this.retCols !== null;
    if (hasReturn) {
      if (this.rels.length > 0) {
        const joins = this.rels.map(r => `LEFT JOIN ${r.table} ${r.alias} ON upd.${r.fk} = ${r.alias}.id`).join(" ");
        const relCols = this.rels.map(r => `row_to_json(${r.alias}.*) as ${r.table}`).join(", ");
        sql = `WITH upd AS (${sql} RETURNING *) SELECT upd.*, ${relCols} FROM upd ${joins}`;
      } else {
        sql += ` RETURNING ${this.retCols}`;
      }
    }

    const res = await this.pool.query(sql, allVals);
    if (!hasReturn) return { data: null, error: null };
    const row = this._single ? (res.rows[0] || null) : res.rows;
    return { data: row, error: row ? null : { message: "No rows found" } };
  }

  /* ── DELETE execution ── */
  private async execDelete() {
    const where = this.conds.length ? `WHERE ${this.conds.join(" AND ")}` : "";
    const sql = `DELETE FROM ${this.tbl} ${where}`;
    await this.pool.query(sql, this.vals);
    return { data: null, error: null };
  }

  /* ── UPSERT execution ── */
  private async execUpsert() {
    const dataArr = this.insData as Record<string, unknown>[];
    if (!dataArr.length) return { data: null, error: null };

    const keys = Object.keys(dataArr[0]);
    const nonConflictKeys = keys.filter(k => k !== this.upsertConflict);
    const updateSet = nonConflictKeys.map(k => `${k} = EXCLUDED.${k}`).join(", ");

    let paramIdx = 0;
    const allVals: unknown[] = [];
    const rowPlaceholders = dataArr.map(row => {
      const ph = keys.map(k => {
        paramIdx++;
        allVals.push(row[k]);
        return `$${paramIdx}`;
      });
      return `(${ph.join(", ")})`;
    });

    const sql = `INSERT INTO ${this.tbl} (${keys.join(", ")}) VALUES ${rowPlaceholders.join(", ")} ON CONFLICT (${this.upsertConflict}) DO UPDATE SET ${updateSet}`;
    await this.pool.query(sql, allVals);
    return { data: null, error: null };
  }
}

/* ──────────────────────────────────────────────
   Intercept .select() after .insert() / .update()
   We override the prototype so chaining works naturally.
   ────────────────────────────────────────────── */
const origSelect = PgQueryBuilder.prototype.select;
PgQueryBuilder.prototype.select = function (columns?: string, opts?: { count?: string; head?: boolean }) {
  if ((this as any).op === "insert" || (this as any).op === "update") {
    (this as any).retCols = columns || "*";
    if (columns && columns.includes("(")) {
      (this as any).parseColumns(columns);
      (this as any).retCols = (this as any).cols;
    }
    return this;
  }
  return origSelect.call(this, columns || "*", opts);
};
