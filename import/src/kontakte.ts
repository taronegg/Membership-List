import type { SupabaseClient } from '@supabase/supabase-js';
import type * as XLSX from 'xlsx';
import { field, sheetToRows, str, strOrNull } from './xlsxUtil.js';
import { parseExcelDateCell } from '../../shared/excelDatum.js';
import { resolveKanonischerName } from '../../shared/namen.js';
import type { ImportReport } from './report.js';

/**
 * Abschnitt 10, Schritt 4: Kontakte (Blatt "Kontakte"). Verknüpfung erfolgt im
 * Excel über den Namen -- auf person_id auflösen. Nicht auflösbare Namen in
 * den Fehlerbericht, nicht stillschweigend verwerfen (10). Fehlendes Datum
 * ist erlaubt (4.2: "Datum bitte nachtragen"-Altdaten).
 */
export async function importiereKontakte(
  supabase: SupabaseClient,
  sheet: XLSX.WorkSheet,
  personNameToId: Map<string, string>,
  kontaktartIdByName: Map<string, string>,
  leaderIdByName: Map<string, string>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<void> {
  const rows = sheetToRows(sheet);
  const personNamen = [...personNameToId.keys()];
  const leaderNamen = [...leaderIdByName.keys()];
  const toInsert: Record<string, unknown>[] = [];

  rows.forEach((row, i) => {
    const zeile = i + 2;
    const nameRoh = str(field(row, 'Name'));
    if (!nameRoh) {
      report.fehlerMelden('Kontakte', zeile, 'Spalte "Name" ist leer.');
      return;
    }

    const kanonischerName = resolveKanonischerName(nameRoh, personNamen);
    const personId = kanonischerName ? personNameToId.get(kanonischerName) : undefined;
    if (!personId) {
      report.fehlerMelden('Kontakte', zeile, `Person "${nameRoh}" nicht in den importierten Personen gefunden.`);
      return;
    }

    const artRoh = strOrNull(field(row, 'Art'));
    let artId: string | null = null;
    if (artRoh) {
      for (const [key, id] of kontaktartIdByName) {
        if (key.toLowerCase() === artRoh.toLowerCase()) artId = id;
      }
      if (!artId) {
        report.fehlerMelden('Kontakte', zeile, `Kontaktart "${artRoh}" nicht in den Stammlisten gefunden.`);
        return;
      }
    } else {
      report.fehlerMelden('Kontakte', zeile, 'Spalte "Art" ist leer (Pflichtfeld).');
      return;
    }

    const verantwortlichRoh = strOrNull(field(row, 'Verantwortlich'));
    const verantwortlichKanonisch = verantwortlichRoh
      ? resolveKanonischerName(verantwortlichRoh, leaderNamen)
      : null;
    const verantwortlichId = verantwortlichKanonisch
      ? leaderIdByName.get(verantwortlichKanonisch)
      : null;
    if (!verantwortlichId) {
      report.fehlerMelden('Kontakte', zeile, `Verantwortlich "${verantwortlichRoh}" nicht auflösbar.`);
      return;
    }

    const datum = parseExcelDateCell(field(row, 'Datum'));
    if (!datum) {
      report.hinweisMelden(`Kontakte Zeile ${zeile}: Datum fehlt (Altdaten-Vermerk "Datum bitte nachtragen").`);
    }

    toInsert.push({
      person_id: personId,
      datum,
      verantwortlich: verantwortlichId,
      art_id: artId,
      notiz: strOrNull(field(row, 'Notiz')) ?? strOrNull(field(row, 'Inhalt')),
      naechster_schritt: strOrNull(field(row, 'Nächster Schritt')),
      wiedervorlage: parseExcelDateCell(field(row, 'Wiedervorlage bis')) ?? parseExcelDateCell(field(row, 'Wiedervorlage')),
    });
  });

  report.hinweisMelden(`Kontakte: ${toInsert.length} von ${rows.length} Zeilen auflösbar.`);

  if (!applyChanges) return;

  const { error } = await supabase.from('contacts').insert(toInsert);
  if (error) report.fehlerMelden('Kontakte', null, error.message);
}
