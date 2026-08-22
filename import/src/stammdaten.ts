import type { SupabaseClient } from '@supabase/supabase-js';
import { findeListe } from './listen.js';
import type { ImportReport } from './report.js';

/** Abbildung Listen-Spaltenname -> pflegbare Lookup-Tabelle (4.5). */
const LOOKUP_TABELLEN: Record<string, string> = {
  Status: 'status_optionen',
  Bacenta: 'bacenta_optionen',
  Basonta: 'basonta_optionen',
  Bildung: 'bildung_optionen',
  Bildungsjahr: 'bildungsjahr_optionen',
  'Wie entdeckt': 'wie_entdeckt_optionen',
  Kontaktart: 'kontaktart_optionen',
};

export type IdMaps = Record<string, Map<string, string>>;

/**
 * Abschnitt 10, Schritt 1: "Listen zuerst -> füllt die Enum-/Stammtabellen."
 * Schreibt jede erkannte Listen-Spalte in ihre Lookup-Tabelle (upsert per
 * `name`) und gibt für jede Liste eine Name->ID-Map zurück.
 */
export async function importiereStammlisten(
  supabase: SupabaseClient,
  listen: Record<string, string[]>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<IdMaps> {
  const idMaps: IdMaps = {};

  for (const [listenName, tabelle] of Object.entries(LOOKUP_TABELLEN)) {
    const werte = [...new Set(findeListe(listen, listenName))];
    if (werte.length === 0) {
      report.hinweisMelden(
        `Liste "${listenName}" im Blatt "Listen" nicht gefunden oder leer -- ` +
          `verwende die in der DB bereits vorhandenen Werte von ${tabelle}.`,
      );
    } else if (applyChanges) {
      const { error } = await supabase
        .from(tabelle)
        .upsert(
          werte.map((name, i) => ({ name, sortierung: i })),
          { onConflict: 'name' },
        );
      if (error) report.fehlerMelden('Stammlisten', null, `${tabelle}: ${error.message}`);
    }

    const { data, error } = await supabase.from(tabelle).select('id, name');
    if (error) {
      report.fehlerMelden('Stammlisten', null, `${tabelle} lesen: ${error.message}`);
      continue;
    }
    idMaps[listenName] = new Map((data ?? []).map((r) => [r.name as string, r.id as string]));
  }

  return idMaps;
}

/**
 * Abschnitt 10, Schritt 2: Leiter aus der Spalte "Verantwortliche" der Listen.
 * "Namen normalisieren -- ohne diesen Schritt bricht die
 * Zuständigkeits-Verknüpfung." Die kanonische Schreibweise kommt direkt aus
 * dem Blatt "Listen" (die Quelle der Wahrheit für Gross-/Kleinschreibung);
 * die Auflösung von Varianten wie "jenny" gegen diese Liste passiert beim
 * Import von `people`/`contacts`/`events` (siehe personen.ts).
 */
export async function importiereLeiter(
  supabase: SupabaseClient,
  listen: Record<string, string[]>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<Map<string, string>> {
  const namen = [...new Set(findeListe(listen, 'Verantwortliche'))];

  if (namen.length === 0) {
    report.hinweisMelden(
      'Liste "Verantwortliche" im Blatt "Listen" nicht gefunden -- verwende die in der DB bereits vorhandenen Leiter.',
    );
  } else if (applyChanges) {
    const { error } = await supabase.from('leaders').upsert(
      namen.map((name) => ({
        name,
        email: `${name
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')}@example.org`,
      })),
      { onConflict: 'name', ignoreDuplicates: true },
    );
    if (error) report.fehlerMelden('Leiter', null, error.message);
    else
      report.hinweisMelden(
        'Neu angelegte Leiter erhalten Platzhalter-E-Mails (vorname@example.org) und ' +
          'kein auth_user_id -- vor dem Produktivgang durch echte Logins ersetzen (siehe supabase/README.md).',
      );
  }

  const { data, error } = await supabase.from('leaders').select('id, name');
  if (error) {
    report.fehlerMelden('Leiter', null, `leaders lesen: ${error.message}`);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.name as string, r.id as string]));
}
