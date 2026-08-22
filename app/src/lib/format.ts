const MONATE_KURZ = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

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

/** Alter in Jahren aus dem Geburtsdatum (7.3: "Geburtsdatum (+ Alter in Klammern)"). */
export function alterInJahren(geburtsdatum: string | null, heute: Date = new Date()): number | null {
  if (!geburtsdatum) return null;
  const [y, m, d] = geburtsdatum.split('-').map(Number);
  let alter = heute.getFullYear() - y;
  const vorGeburtstag = heute.getMonth() + 1 < m || (heute.getMonth() + 1 === m && heute.getDate() < d);
  if (vorGeburtstag) alter--;
  return alter;
}
