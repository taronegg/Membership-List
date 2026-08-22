// Minimaler Fake für den Supabase-Client, nur für Komponenten-Tests.
// Liefert vorbereitete, bereits "verbundene" Fixture-Daten pro Tabelle
// zurück (so, wie PostgREST sie mit den Embeds aus den echten Hooks liefern
// würde) -- die Tests prüfen damit das Rendering/die Interaktionslogik der
// Screens, nicht die genaue Select-Query-Syntax (die ist gegen die reale
// Postgres-Struktur separat geprüft, siehe supabase/README.md).

type Row = Record<string, unknown>;

interface Fixtures {
  session?: { user: { id: string } } | null;
  [table: string]: Row[] | Row | null | undefined;
}

export function createFakeSupabase(fixtures: Fixtures) {
  function builderFor(table: string) {
    let rows = ((fixtures[table] as Row[] | undefined) ?? []).slice();

    const builder = {
      select(_cols: string) {
        return builder;
      },
      eq(col: string, val: unknown) {
        rows = rows.filter((r) => r[col] === val);
        return builder;
      },
      order(_col: string) {
        return builder;
      },
      single() {
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      then(resolve: (v: { data: Row[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
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
