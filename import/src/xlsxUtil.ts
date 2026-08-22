import * as XLSX from 'xlsx';

/** Findet ein Blatt case-insensitiv (Excel-Blattnamen werden gern leicht abweichend getippt). */
export function getSheet(workbook: XLSX.WorkBook, name: string): XLSX.WorkSheet {
  const key = workbook.SheetNames.find(
    (n) => n.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (!key) {
    throw new Error(
      `Blatt "${name}" nicht gefunden. Vorhandene Blätter: ${workbook.SheetNames.join(', ')}`,
    );
  }
  return workbook.Sheets[key];
}

/** Liest ein Blatt als Array von Objekten, Header aus Zeile 1, leere Zeilen übersprungen. */
export function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    blankrows: false,
  });
}

/** Liest ein Blatt als rohes 2D-Array (für die Anwesenheits-Kreuztabelle und die Listen). */
export function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
}

/** Liest ein Feld case-insensitiv anhand des Spaltennamens (Excel-Header variieren gern minimal). */
export function field(row: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(row).find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
  return key ? row[key] : undefined;
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function strOrNull(value: unknown): string | null {
  const s = str(value);
  return s === '' ? null : s;
}

export function boolCell(value: unknown): boolean {
  const s = str(value).toLowerCase();
  return s === 'x' || s === 'ja' || s === 'true' || s === 'wahr' || s === '1';
}

/**
 * Liest den Kommentar/Comment einer Zelle, falls die Bibliothek ihn geliefert
 * hat (10.5: "Zellkommentare als grund übernehmen, falls die
 * Import-Bibliothek sie liefert"). SheetJS liefert das je nach Version/Build
 * als `cell.c` (Array von {a: author, t: text}) -- daher defensiv lesen.
 */
export function cellComment(cell: XLSX.CellObject | undefined): string | null {
  const comments = (cell as unknown as { c?: { t?: string }[] } | undefined)?.c;
  if (!comments || comments.length === 0) return null;
  const text = comments
    .map((c) => c.t?.trim())
    .filter((t): t is string => !!t)
    .join(' / ');
  return text === '' ? null : text;
}
