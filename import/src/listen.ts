import * as XLSX from 'xlsx';
import { sheetToMatrix, str } from './xlsxUtil.js';

/**
 * Liest das versteckte Blatt "Listen" (10, Schritt 1): eine Kopfzeile pro
 * Dropdown-Liste (z.B. "Status", "Bacenta", "Verantwortliche", ...), darunter
 * die Werte. Layout ist im Bundle nicht exakt dokumentiert -- deshalb generisch:
 * jede nicht-leere Kopfzellen-Spalte wird zu einer Liste ihrer nicht-leeren
 * Werte darunter.
 */
export function leseListenBlatt(sheet: XLSX.WorkSheet): Record<string, string[]> {
  const rows = sheetToMatrix(sheet);
  if (rows.length === 0) return {};

  const header = rows[0].map((h) => str(h));
  const result: Record<string, string[]> = {};

  header.forEach((name, colIdx) => {
    if (!name) return;
    const werte: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const wert = str(rows[r]?.[colIdx]);
      if (wert !== '') werte.push(wert);
    }
    result[name] = werte;
  });

  return result;
}

/** Findet eine Listen-Spalte case-insensitiv, z.B. "verantwortliche" -> "Verantwortliche". */
export function findeListe(listen: Record<string, string[]>, name: string): string[] {
  const key = Object.keys(listen).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? listen[key] : [];
}
