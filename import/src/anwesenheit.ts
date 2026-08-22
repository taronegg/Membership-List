import type { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { sheetToMatrix, str, cellComment } from './xlsxUtil.js';
import { excelSerialToIso, parseExcelDateCell } from '../../shared/excelDatum.js';
import { resolveKanonischerName } from '../../shared/namen.js';
import type { ImportReport } from './report.js';

export interface AttendanceInsertRow {
  person_id: string;
  datum: string;
  status: 'anwesend' | 'abwesend';
  grund: string | null;
}

/**
 * Abschnitt 10, Schritt 5: Anwesenheit (Blatt "Anwesenheit"). Kreuztabelle
 * auflösen: Kopfzeile ab Spalte C enthält die Sonntage als Serienzahlen, pro
 * Zelle x -> anwesend, o -> abwesend, leer -> KEINE Zeile (4.3 -- nicht erfasst
 * ist ausdrücklich kein dritter Status mit eigener Zeile). Gibt die
 * aufgelösten Zeilen zurück, damit `verify.ts` sie unabhängig vom
 * --apply-Flag gegen das Blatt "Auswertung" gegenrechnen kann.
 */
export async function importiereAnwesenheit(
  supabase: SupabaseClient,
  sheet: XLSX.WorkSheet,
  personNameToId: Map<string, string>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<AttendanceInsertRow[]> {
  const matrix = sheetToMatrix(sheet);
  if (matrix.length < 2) {
    report.fehlerMelden('Anwesenheit', null, 'Blatt "Anwesenheit" enthält keine Datenzeilen.');
    return [];
  }

  const header = matrix[0];
  const idCol = 0;
  const nameCol = 1;
  let dateStartCol = 2; // "Kopfzeile ab Spalte C enthält die Sonntage" (4.3)
  if (typeof header[dateStartCol] !== 'number') {
    const found = header.findIndex((h, i) => i >= 2 && typeof h === 'number');
    if (found >= 0) dateStartCol = found;
  }

  const dateColumns: { col: number; iso: string }[] = [];
  for (let c = dateStartCol; c < header.length; c++) {
    const h = header[c];
    if (typeof h === 'number') {
      dateColumns.push({ col: c, iso: excelSerialToIso(h) });
    } else {
      const iso = parseExcelDateCell(h);
      if (iso) dateColumns.push({ col: c, iso });
    }
  }

  if (dateColumns.length === 0) {
    report.fehlerMelden(
      'Anwesenheit',
      null,
      'Keine Sonntags-Spalten in der Kopfzeile ab Spalte C gefunden -- Layout prüfen.',
    );
    return [];
  }

  const personNamen = [...personNameToId.keys()];
  const rows: AttendanceInsertRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const zeile = r + 1;
    const excelId = str(row[idCol]);
    const nameRoh = str(row[nameCol]);
    const kanonisch = resolveKanonischerName(nameRoh, personNamen);
    const personId = kanonisch ? personNameToId.get(kanonisch) : undefined;
    if (!personId) {
      report.fehlerMelden(
        'Anwesenheit',
        zeile,
        `Person "${nameRoh || excelId}" nicht in den importierten Personen gefunden.`,
      );
      continue;
    }

    for (const { col, iso } of dateColumns) {
      const raw = str(row[col]).toLowerCase();
      if (raw === '') continue; // nicht erfasst -> keine Zeile (4.3)

      let status: 'anwesend' | 'abwesend' | null = null;
      if (raw === 'x') status = 'anwesend';
      else if (raw === 'o') status = 'abwesend';
      if (!status) {
        report.fehlerMelden(
          'Anwesenheit',
          zeile,
          `Unbekannter Zellwert "${row[col]}" am ${iso} -- erwartet x/o/leer.`,
        );
        continue;
      }

      const cellAddr = XLSX.utils.encode_cell({ r, c: col });
      const grund = status === 'abwesend' ? cellComment(sheet[cellAddr]) : null;

      rows.push({ person_id: personId, datum: iso, status, grund });
    }
  }

  report.hinweisMelden(
    `Anwesenheit: ${rows.length} Zeilen aus ${dateColumns.length} Sonntagen für ${matrix.length - 1} Personen aufgelöst.`,
  );

  if (!applyChanges) return rows;

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('attendance').insert(rows.slice(i, i + BATCH));
    if (error) report.fehlerMelden('Anwesenheit', null, error.message);
  }

  return rows;
}
