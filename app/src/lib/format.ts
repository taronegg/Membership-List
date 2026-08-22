const MONATE_KURZ = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

const MONATE_LANG = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/** 7.1: Kicker "Wochentag, TT. Monat" über der Begrüssung. */
export function formatWochentagDatum(heute: Date = new Date()): string {
  return `${WOCHENTAGE[heute.getDay()]}, ${heute.getDate()}. ${MONATE_LANG[heute.getMonth()]}`;
}

/** Formatiert ein ISO-Datum als "TT. Mon" (z.B. für Wiedervorlage-Chips, 7.6). */
export function formatDatumKurz(iso: string | null): string {
  if (!iso) return '—';
  const [, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONATE_KURZ[m - 1]}`;
}

/** Formatiert ein ISO-Datum als "TT. Monat JJJJ" für Profil-Felder. */
export function formatDatumLang(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONATE_KURZ[m - 1]} ${y}`;
}

/** Letzter (oder heutiger) Sonntag als ISO-Datum -- Vorbelegung für den Check-in (7.5). */
export function letzterSonntag(heute: Date = new Date()): string {
  const d = new Date(heute);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

/** Alter in Jahren aus dem Geburtsdatum (7.3: "Geburtsdatum (+ Alter in Klammern)"). */
export function alterInJahren(geburtsdatum: string | null, heute: Date = new Date()): number | null {
  if (!geburtsdatum) return null;
  const [y, m, d] = geburtsdatum.split('-').map(Number);
  let alter = heute.getFullYear() - y;
  const vorGeburtstag = heute.getMonth() + 1 < m || (heute.getMonth() + 1 === m && heute.getDate() < d);
  if (vorGeburtstag) alter--;
  return alter;
}

/** 7.1: "Singular/Plural korrekt!" -- z.B. plural(1, 'Person', 'Personen') -> "1 Person". */
export function plural(n: number, singular: string, mehrzahl: string): string {
  return `${n} ${n === 1 ? singular : mehrzahl}`;
}
