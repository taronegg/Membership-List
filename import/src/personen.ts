import type { SupabaseClient } from '@supabase/supabase-js';
import type * as XLSX from 'xlsx';
import { field, sheetToRows, str, strOrNull, boolCell } from './xlsxUtil.js';
import { parseExcelDateCell } from '../../shared/excelDatum.js';
import { normalizePhoneCH } from '../../shared/telefon.js';
import { resolveKanonischerName, normalizeFullName } from '../../shared/namen.js';
import type { IdMaps } from './stammdaten.js';
import type { ImportReport } from './report.js';

/**
 * Abschnitt 10, Schritt 3: Personen (Blatt "Personen", Zeilen 2-172).
 * Abgeleitete Spalten (Letzter Besuch, Letzte Beratung, Letzter Kontakt,
 * Tage seit Kontakt, Kontakte total, Name) werden übersprungen (4.1) --
 * sie werden zur Laufzeit aus contacts/attendance berechnet
 * (shared/berechnungen.ts), nicht importiert.
 *
 * Gibt eine Map "Vorname Nachname" -> DB-ID zurück. Kontakte/Anwesenheit/
 * Events verknüpfen im Excel über den Namen, nicht über die ID (10, Schritte
 * 4/5/6) -- deshalb ist der Name, nicht die Excel-ID, der stabile Schlüssel
 * für die nachgelagerten Importschritte. Bei Namensduplikaten wird die erste
 * gefundene Person verwendet und ein Hinweis gemeldet.
 */
export async function importierePersonen(
  supabase: SupabaseClient,
  sheet: XLSX.WorkSheet,
  idMaps: IdMaps,
  leaderIdByName: Map<string, string>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<Map<string, string>> {
  const rows = sheetToRows(sheet);
  const nameToDbId = new Map<string, string>();
  const leaderNamen = [...leaderIdByName.keys()];

  const resolveLeader = (
    schritt: string,
    zeile: number,
    roh: string | null,
    pflichtfeld: boolean,
  ): string | null => {
    if (!roh) {
      if (pflichtfeld) report.fehlerMelden(schritt, zeile, 'Zuständige Person fehlt (Pflichtfeld, 7.4).');
      return null;
    }
    const kanonisch = resolveKanonischerName(roh, leaderNamen);
    if (!kanonisch) {
      report.fehlerMelden(
        schritt,
        zeile,
        `Leiter-Name "${roh}" nicht in der Liste "Verantwortliche" gefunden.`,
      );
      return null;
    }
    return leaderIdByName.get(kanonisch) ?? null;
  };

  const resolveOption = (map: string, name: string | null): string | null => {
    if (!name) return null;
    const m = idMaps[map];
    if (!m) return null;
    for (const [key, id] of m) {
      if (key.toLowerCase() === name.toLowerCase()) return id;
    }
    return null;
  };

  const toInsert: Record<string, unknown>[] = [];

  rows.forEach((row, i) => {
    const zeile = i + 2; // Header ist Zeile 1
    const excelId = strOrNull(field(row, 'ID'));
    const vorname = str(field(row, 'Vorname'));
    const nachname = str(field(row, 'Nachname'));

    if (!vorname || !nachname) {
      report.fehlerMelden('Personen', zeile, 'Vorname und/oder Nachname fehlt (Pflichtfeld, 7.4).');
      return;
    }

    const zustaendigRoh = strOrNull(field(row, 'Zuständige Person'));
    const zustaendigId = resolveLeader('Personen', zeile, zustaendigRoh, true);
    if (!zustaendigId) return; // ohne zustaendig keine Zeile (Pflichtfeld, sonst fällt Person aus jeder Leiter-Sicht)

    const rawPhone = strOrNull(field(row, 'Telefon'));
    const telefon = normalizePhoneCH(rawPhone);
    if (rawPhone && telefon === rawPhone.replace(/[\s./-]/g, '')) {
      // unverändert zurückgegeben => Format nicht erkannt
      report.hinweisMelden(`Personen Zeile ${zeile}: Telefonformat "${rawPhone}" nicht erkannt, unverändert übernommen.`);
    }

    toInsert.push({
      _excelId: excelId,
      _fullName: normalizeFullName(vorname, nachname),
      vorname,
      nachname,
      status_id: resolveOption('Status', strOrNull(field(row, 'Status'))),
      zustaendig: zustaendigId,
      telefon,
      geburtsdatum: parseExcelDateCell(field(row, 'Geburtsdatum')),
      adresse: strOrNull(field(row, 'Adresse')),
      bacenta_id: resolveOption('Bacenta', strOrNull(field(row, 'Bacenta'))),
      basonta_id: resolveOption('Basonta', strOrNull(field(row, 'Basonta'))),
      bildung_id: resolveOption('Bildung', strOrNull(field(row, 'Bildung'))),
      richtung: strOrNull(field(row, 'Richtung')),
      bildungsjahr_id: resolveOption('Bildungsjahr', strOrNull(field(row, 'Bildungsjahr'))),
      wie_entdeckt_id: resolveOption('Wie entdeckt', strOrNull(field(row, 'Wie entdeckt'))),
      erstkontakt: parseExcelDateCell(field(row, 'Erstkontakt')),
      besucher1: resolveLeader('Personen', zeile, strOrNull(field(row, 'Besucher 1')), false),
      besucher2: resolveLeader('Personen', zeile, strOrNull(field(row, 'Besucher 2')), false),
      notizen: strOrNull(field(row, 'Notizen')),
      zu_pruefen: boolCell(field(row, 'Zu prüfen')),
    });
  });

  if (!applyChanges) {
    report.hinweisMelden(`Dry-run: ${toInsert.length} Personen würden importiert (0 tatsächlich geschrieben).`);
    // Ohne echten Schreibvorgang gibt es keine DB-IDs -- der Name selbst dient als
    // Platzhalter-Schlüssel, damit nachgelagerte Dry-run-Schritte trotzdem laufen.
    for (const p of toInsert) {
      const name = p._fullName as string;
      if (nameToDbId.has(name)) {
        report.hinweisMelden(`Personen: Name "${name}" kommt mehrfach vor -- Kontakte/Events werden der ersten Person zugeordnet.`);
        continue;
      }
      nameToDbId.set(name, name);
    }
    return nameToDbId;
  }

  for (const person of toInsert) {
    const { _excelId, _fullName, ...values } = person;
    const { data, error } = await supabase.from('people').insert(values).select('id').single();
    if (error) {
      report.fehlerMelden('Personen', null, `${values.vorname} ${values.nachname}: ${error.message}`);
      continue;
    }
    const name = _fullName as string;
    if (nameToDbId.has(name)) {
      report.hinweisMelden(`Personen: Name "${name}" kommt mehrfach vor -- Kontakte/Events werden der ersten Person zugeordnet.`);
      continue;
    }
    nameToDbId.set(name, data.id as string);
  }

  return nameToDbId;
}
