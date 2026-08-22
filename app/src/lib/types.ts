// Domänentypen, abgeleitet aus supabase/migrations/0001_schema.sql
// (design_handoff_kirchen_app/README.md Abschnitt 4).

export type Rolle = 'pfarrer' | 'leiter';

export interface AngemeldeterLeiter {
  id: string;
  name: string;
  email: string;
  rolle: Rolle;
}
