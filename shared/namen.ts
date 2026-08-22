// Namens-Normalisierung für den Import (Abschnitt 10, Schritt 2):
// "Im Excel inkonsistent gross/klein ("jenny" vs. "Jenny") -- beim Import
// normalisieren." Einfaches Gross-/Kleinschreiben reicht nicht für Namen wie
// "Noémie" oder "Chloé" -- deshalb Abgleich gegen die bekannte kanonische
// Liste statt reiner String-Transformation.

/**
 * Löst einen rohen Namen aus dem Excel gegen eine Liste kanonischer Namen auf
 * (case-insensitiv, Whitespace getrimmt). Gibt den kanonischen Namen zurück,
 * oder `null`, wenn kein Treffer existiert -- der Aufrufer muss das als Fehler
 * behandeln (Abschnitt 10: "Ohne diesen Schritt bricht die
 * Zuständigkeits-Verknüpfung").
 */
export function resolveKanonischerName(
  roh: string | null | undefined,
  kanonisch: readonly string[],
): string | null {
  if (!roh) return null;
  const trimmed = roh.trim();
  if (trimmed === '') return null;
  const treffer = kanonisch.find((n) => n.localeCompare(trimmed, 'de', { sensitivity: 'base' }) === 0);
  return treffer ?? null;
}

/** Normalisiert Whitespace in einem vollen Namen für den Personen-Namens-Lookup. */
export function normalizeFullName(vorname: string, nachname: string): string {
  return `${vorname} ${nachname}`.replace(/\s+/g, ' ').trim();
}
