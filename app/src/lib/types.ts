// Domänentypen, abgeleitet aus supabase/migrations/0001_schema.sql
// (design_handoff_kirchen_app/README.md Abschnitt 4).

export type Rolle = 'pfarrer' | 'leiter';

export interface AngemeldeterLeiter {
  id: string;
  name: string;
  email: string;
  rolle: Rolle;
}

export interface LookupItem {
  id: string;
  name: string;
  sortierung: number;
}

export interface LeaderRef {
  id: string;
  name: string;
}

/** Eine Zeile aus `people`, mit den für die Anzeige nötigen Lookups aufgelöst. */
export interface Person {
  id: string;
  vorname: string;
  nachname: string;
  status: LookupItem | null;
  zustaendig: LeaderRef | null;
  telefon: string | null;
  geburtsdatum: string | null;
  adresse: string | null;
  bacenta: LookupItem | null;
  basonta: LookupItem | null;
  bildung: LookupItem | null;
  richtung: string | null;
  bildungsjahr: LookupItem | null;
  wieEntdeckt: LookupItem | null;
  erstkontakt: string | null;
  besucher1: LeaderRef | null;
  besucher2: LeaderRef | null;
  notizen: string | null;
  zuPruefen: boolean;
}

/** Zeile aus `contacts`, für Kontaktverlauf/-liste. */
export interface Contact {
  id: string;
  personId: string;
  datum: string | null;
  verantwortlich: LeaderRef | null;
  art: LookupItem | null;
  notiz: string | null;
  naechsterSchritt: string | null;
  wiedervorlage: string | null;
  erledigtAm: string | null;
}

/** Personenliste (7.2): reduzierter Satz + berechnete Quote (5.1). */
export interface PersonListItem {
  id: string;
  vorname: string;
  nachname: string;
  status: LookupItem | null;
  bacenta: LookupItem | null;
  basonta: LookupItem | null;
  zustaendig: LeaderRef | null;
  zuPruefen: boolean;
  quote: number | null;
}

/** Zeile aus `attendance`. */
export interface AttendanceEntry {
  id: string;
  personId: string;
  datum: string;
  status: 'anwesend' | 'abwesend';
  grund: string | null;
}
