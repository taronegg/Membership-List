import type * as XLSX from 'xlsx';
import { attendanceOf } from '../../shared/berechnungen.js';
import { field, sheetToRows, str } from './xlsxUtil.js';
import type { AttendanceInsertRow } from './anwesenheit.js';
import type { ImportReport } from './report.js';

/**
 * Abschnitt 10, Schritt 7: "Auswertung ignorieren -- wird berechnet. Nach dem
 * Import einmal gegenrechnen: Die berechneten Quoten müssen den Excel-Werten
 * entsprechen. Das ist der beste Test, dass der Import korrekt ist."
 *
 * Nutzt dieselbe `attendanceOf`-Funktion, die auch die App verwendet (Abschnitt
 * 13, Schritt 5) -- damit prüft dieser Schritt nicht nur den Import, sondern
 * indirekt auch, dass die Berechnungslogik mit den echten Daten übereinstimmt.
 */
export function verifiziereGegenAuswertung(
  attendanceRows: AttendanceInsertRow[],
  auswertungSheet: XLSX.WorkSheet,
  personIdToName: Map<string, string>,
  report: ImportReport,
  toleranz = 0.005,
): void {
  const byPerson = new Map<string, AttendanceInsertRow[]>();
  for (const r of attendanceRows) {
    if (!byPerson.has(r.person_id)) byPerson.set(r.person_id, []);
    byPerson.get(r.person_id)!.push(r);
  }

  const nameToPersonId = new Map([...personIdToName].map(([id, name]) => [name.toLowerCase(), id]));

  const auswertungRows = sheetToRows(auswertungSheet);
  let geprueft = 0;
  let abweichungen = 0;

  for (const row of auswertungRows) {
    const name = str(field(row, 'Name'));
    if (!name) continue;

    const personId = nameToPersonId.get(name.toLowerCase());
    if (!personId) {
      report.fehlerMelden('Verifikation', null, `Auswertung: Person "${name}" nicht in den importierten Personen gefunden.`);
      continue;
    }

    const stats = attendanceOf(
      (byPerson.get(personId) ?? []).map((r) => ({ datum: r.datum, status: r.status })),
    );
    geprueft++;

    const meldeAbweichung = (feld: string, berechnet: unknown, excel: unknown) => {
      abweichungen++;
      report.fehlerMelden('Verifikation', null, `${name}: ${feld} berechnet ${berechnet}, Excel ${excel}.`);
    };

    const excelAnwesend = field(row, 'Anwesend');
    if (typeof excelAnwesend === 'number' && excelAnwesend !== stats.anwesend) {
      meldeAbweichung('Anwesend', stats.anwesend, excelAnwesend);
    }

    const excelAbwesend = field(row, 'Abwesend');
    if (typeof excelAbwesend === 'number' && excelAbwesend !== stats.abwesend) {
      meldeAbweichung('Abwesend', stats.abwesend, excelAbwesend);
    }

    const excelErfasst = field(row, 'Erfasst');
    if (typeof excelErfasst === 'number' && excelErfasst !== stats.erfasst) {
      meldeAbweichung('Erfasst', stats.erfasst, excelErfasst);
    }

    const excelQuoteRoh = field(row, 'Quote');
    if (typeof excelQuoteRoh === 'number' && stats.quote !== null) {
      const excelQuote = excelQuoteRoh > 1 ? excelQuoteRoh / 100 : excelQuoteRoh;
      if (Math.abs(excelQuote - stats.quote) > toleranz) {
        meldeAbweichung('Quote', `${(stats.quote * 100).toFixed(1)}%`, `${(excelQuote * 100).toFixed(1)}%`);
      }
    }

    const excelFolge = field(row, 'Abwesend in Folge');
    if (typeof excelFolge === 'number' && excelFolge !== stats.abwesendInFolge) {
      meldeAbweichung('Abwesend in Folge', stats.abwesendInFolge, excelFolge);
    }
  }

  report.hinweisMelden(`Verifikation: ${geprueft} Personen gegen Blatt "Auswertung" geprüft, ${abweichungen} Abweichung(en).`);
}
