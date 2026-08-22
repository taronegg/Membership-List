// Telefonnummern-Normalisierung (Abschnitt 4.1): Altdaten sind gemischt
// (`0783081703`, `+41782526620`) -- beim Import auf E.164 normalisieren,
// in der App formatiert anzeigen.

/**
 * Normalisiert eine Schweizer Telefonnummer auf E.164 (+41...).
 * Gibt `null` zurück, wenn die Eingabe leer ist, und die unveränderte
 * (nur von Trennzeichen befreite) Eingabe, wenn das Format nicht erkannt wird
 * -- der Import darf hier nicht hart fehlschlagen, sondern soll die
 * ursprüngliche Nummer behalten und im Fehlerbericht auftauchen.
 */
export function normalizePhoneCH(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/[\s./-]/g, '');
  if (trimmed === '') return null;

  if (/^\+41\d{9}$/.test(trimmed)) return trimmed;
  if (/^0041\d{9}$/.test(trimmed)) return '+41' + trimmed.slice(4);
  if (/^0\d{9}$/.test(trimmed)) return '+41' + trimmed.slice(1);

  return trimmed; // unbekanntes Format -- unverändert zurückgeben, Aufrufer meldet es
}

/** Formatiert eine E.164-Nummer für die Anzeige, z.B. "+41 78 308 17 03". */
export function formatPhoneCH(e164: string | null | undefined): string {
  if (!e164) return '—';
  const m = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (!m) return e164;
  return `+41 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}
