// Minimaler Fake für den Supabase-Client, nur für Komponenten-/Hook-Tests.
// Unterstützt select/eq/in/order/single (lesen), sowie upsert/delete
// (schreiben) auf einem simplen In-Memory-"Tabellen"-Objekt -- genug, um die
// Query-Muster aus den echten Hooks (inkl. useCheckin/attendanceSync für den
// Offline-Puffer) ohne echtes Supabase-Projekt zu prüfen.

type Row = Record<string, unknown>;

interface Fixtures {
  session?: { user: { id: string } } | null;
  [table: string]: Row[] | Row | null | undefined;
}

type Filter = { col: string; op: 'eq' | 'in'; val: unknown };

export function createFakeSupabase(fixtures: Fixtures) {
  function currentRows(table: string): Row[] {
    return (fixtures[table] as Row[] | undefined) ?? [];
  }

  function applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter((r) =>
      filters.every((f) => (f.op === 'eq' ? r[f.col] === f.val : (f.val as unknown[]).includes(r[f.col]))),
    );
  }

  function builderFor(table: string) {
    const filters: Filter[] = [];
    let mode: 'select' | 'delete' = 'select';

    const builder = {
      select(_cols: string) {
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val });
        return builder;
      },
      in(col: string, vals: unknown[]) {
        filters.push({ col, op: 'in', val: vals });
        return builder;
      },
      order(_col: string) {
        return builder;
      },
      delete() {
        mode = 'delete';
        return builder;
      },
      upsert(input: Row | Row[], opts?: { onConflict?: string }) {
        const arr = Array.isArray(input) ? input : [input];
        const keys = (opts?.onConflict ?? 'id').split(',');
        const rows = currentRows(table);
        for (const row of arr) {
          const idx = rows.findIndex((r) => keys.every((k) => r[k] === row[k]));
          if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
          else rows.push({ ...row });
        }
        fixtures[table] = rows;
        return Promise.resolve({ error: null });
      },
      single() {
        const filtered = applyFilters(currentRows(table), filters);
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      then(resolve: (v: { data: Row[] | null; error: null }) => unknown, reject?: (e: unknown) => unknown) {
        if (mode === 'delete') {
          const bleibt = currentRows(table).filter((r) => applyFilters([r], filters).length === 0);
          fixtures[table] = bleibt;
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        const filtered = applyFilters(currentRows(table), filters);
        return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
      },
    };
    return builder;
  }

  return {
    from(table: string) {
      return builderFor(table);
    },
    auth: {
      getSession: () => Promise.resolve({ data: { session: fixtures.session ?? null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => {},
    },
  };
}
