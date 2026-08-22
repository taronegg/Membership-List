import type { SupabaseClient } from '@supabase/supabase-js';
import type * as XLSX from 'xlsx';
import { field, sheetToRows, str, strOrNull, boolCell } from './xlsxUtil.js';
import { parseExcelDateCell } from '../../shared/excelDatum.js';
import { resolveKanonischerName } from '../../shared/namen.js';
import type { ImportReport } from './report.js';

interface Teilnehmer {
  personId: string;
  rolle: string | null;
  anwesend: boolean;
  notiz: string | null;
}

interface Session {
  event: string;
  datum: string;
  verantwortlich: string | null;
  teilnehmer: Teilnehmer[];
}

/**
 * Abschnitt 10, Schritt 6: Events (Blatt "Events") -> event_sessions +
 * event_attendance. Abschnitt 4.4: "Eine Event-Session ist im Prototyp die
 * Gruppierung (event, datum)" -- diese Gruppierung wird hier zu echten
 * event_sessions-Zeilen.
 */
export async function importiereEvents(
  supabase: SupabaseClient,
  sheet: XLSX.WorkSheet,
  personNameToId: Map<string, string>,
  leaderIdByName: Map<string, string>,
  report: ImportReport,
  applyChanges: boolean,
): Promise<void> {
  const rows = sheetToRows(sheet);
  const personNamen = [...personNameToId.keys()];
  const leaderNamen = [...leaderIdByName.keys()];
  const sessions = new Map<string, Session>();

  rows.forEach((row, i) => {
    const zeile = i + 2;
    const eventName = str(field(row, 'Event'));
    const datum = parseExcelDateCell(field(row, 'Datum'));
    if (!eventName || !datum) {
      report.fehlerMelden('Events', zeile, 'Event-Name oder Datum fehlt.');
      return;
    }

    const personRoh = str(field(row, 'Person'));
    const kanonisch = resolveKanonischerName(personRoh, personNamen);
    const personId = kanonisch ? personNameToId.get(kanonisch) : undefined;
    if (!personId) {
      report.fehlerMelden('Events', zeile, `Person "${personRoh}" nicht gefunden.`);
      return;
    }

    const verantwortlichRoh = strOrNull(field(row, 'Verantwortlich'));
    const verantwortlichKanonisch = verantwortlichRoh
      ? resolveKanonischerName(verantwortlichRoh, leaderNamen)
      : null;
    const verantwortlichId = verantwortlichKanonisch
      ? (leaderIdByName.get(verantwortlichKanonisch) ?? null)
      : null;

    const key = `${eventName.toLowerCase()}__${datum}`;
    if (!sessions.has(key)) {
      sessions.set(key, { event: eventName, datum, verantwortlich: verantwortlichId, teilnehmer: [] });
    }
    sessions.get(key)!.teilnehmer.push({
      personId,
      rolle: strOrNull(field(row, 'Rolle')) ?? strOrNull(field(row, 'Gruppe')),
      anwesend: boolCell(field(row, 'Anwesend')),
      notiz: strOrNull(field(row, 'Notiz')),
    });
  });

  report.hinweisMelden(`Events: ${sessions.size} Event-Sessions aus ${rows.length} Zeilen gebildet.`);

  if (!applyChanges) return;

  for (const session of sessions.values()) {
    const { data, error } = await supabase
      .from('event_sessions')
      .insert({ name: session.event, datum: session.datum, verantwortlich: session.verantwortlich })
      .select('id')
      .single();
    if (error) {
      report.fehlerMelden('Events', null, `${session.event} (${session.datum}): ${error.message}`);
      continue;
    }

    const attendanceRows = session.teilnehmer.map((t) => ({
      event_session_id: data.id,
      person_id: t.personId,
      rolle: t.rolle,
      anwesend: t.anwesend,
      notiz: t.notiz,
    }));
    const { error: attError } = await supabase.from('event_attendance').insert(attendanceRows);
    if (attError) {
      report.fehlerMelden('Events', null, `${session.event} (${session.datum}) Teilnehmer: ${attError.message}`);
    }
  }
}
