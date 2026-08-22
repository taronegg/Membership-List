// Minimaler In-Memory-Ersatz für den Supabase-Client, nur für Tests.
// Implementiert genau die Aufrufmuster, die import/src/*.ts tatsächlich nutzt
// (from().select(), from().upsert(), from().insert(), from().insert().select().single()),
// damit der komplette Import-Pipeline-Code ohne echtes Supabase-Projekt/Netzwerk
// geprüft werden kann.

type Row = Record<string, unknown>;

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  private counters: Record<string, number> = {};

  private nextId(table: string): string {
    this.counters[table] = (this.counters[table] ?? 0) + 1;
    return `${table}-${this.counters[table]}`;
  }

  from(table: string) {
    if (!this.tables[table]) this.tables[table] = [];
    const rows = this.tables[table];
    const nextId = (t: string) => this.nextId(t);

    return {
      select(_cols: string) {
        return Promise.resolve({ data: rows, error: null });
      },
      upsert(input: Row | Row[], opts?: { onConflict?: string }) {
        const arr = Array.isArray(input) ? input : [input];
        const key = opts?.onConflict ?? 'id';
        for (const row of arr) {
          const existingIdx = rows.findIndex((r) => r[key] === row[key]);
          if (existingIdx >= 0) rows[existingIdx] = { ...rows[existingIdx], ...row };
          else rows.push({ id: nextId(table), ...row });
        }
        return Promise.resolve({ error: null });
      },
      insert(input: Row | Row[]) {
        const arr = Array.isArray(input) ? input : [input];
        const inserted = arr.map((row) => ({ id: (row.id as string) ?? nextId(table), ...row }));
        rows.push(...inserted);
        return {
          select(_cols: string) {
            return {
              single() {
                return Promise.resolve({ data: inserted[0] ?? null, error: null });
              },
            };
          },
          then(resolve: (v: { error: null }) => unknown, reject?: (e: unknown) => unknown) {
            return Promise.resolve({ error: null }).then(resolve, reject);
          },
        };
      },
    };
  }
}
