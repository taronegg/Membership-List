import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { FakeSupabase } from './fakeSupabase.js';
import { leseListenBlatt } from '../src/listen.js';
import { importiereStammlisten, importiereLeiter } from '../src/stammdaten.js';
import { importierePersonen } from '../src/personen.js';
import { importiereKontakte } from '../src/kontakte.js';
import { importiereAnwesenheit } from '../src/anwesenheit.js';
import { importiereEvents } from '../src/events.js';
import { verifiziereGegenAuswertung } from '../src/verify.js';
import { ImportReport } from '../src/report.js';
import { isoToExcelSerial } from '../../shared/excelDatum.js';

// End-to-End-Test der Import-Pipeline gegen synthetische Workbooks, weil die
// echten ELK-Basel-Excel-Dateien diesem Auftrag nicht beilagen (siehe
// import/README.md). Deckt die Reihenfolge und Fallstricke aus Abschnitt 10 ab:
// Namens-Normalisierung, fehlende Kontakt-Daten, x/o/leer, Event-Gruppierung
// und die Verifikation gegen "Auswertung".

function sheetFromRows(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows);
}

function sheetFromMatrix(rows: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildWorkbooks() {
  const listenSheet = sheetFromMatrix([
    ['Status', 'Bacenta', 'Basonta', 'Bildung', 'Bildungsjahr', 'Wie entdeckt', 'Kontaktart', 'Verantwortliche'],
    ['Erstbesucher', '@home', 'Keine', 'Keine Angaben', 'Keine Angaben', 'Sonstiges', 'Besuch', 'Jenny'],
    ['Besucher', 'Keine', '', '', '', '', 'Beratung / Seelsorge', 'Age'],
    ['Member', '', '', '', '', '', 'Telefonat', ''],
    ['Ehemalig', '', '', '', '', '', '', ''],
    ['Kontakt', '', '', '', '', '', '', ''],
  ]);

  const personenSheet = sheetFromRows([
    {
      ID: 'P001',
      Vorname: 'Anna',
      Nachname: 'Muster',
      Status: 'Member',
      'Zuständige Person': 'jenny', // bewusst falsch grossgeschrieben (10, Schritt 2)
      Telefon: '0783081703',
      Geburtsdatum: isoToExcelSerial('2000-05-10'),
      Bacenta: '@home',
      'Zu prüfen': '',
    },
    {
      ID: 'P002',
      Vorname: 'Beat',
      Nachname: 'Tester',
      Status: 'Besucher',
      'Zuständige Person': 'Age',
      Telefon: '+41782526620',
      'Zu prüfen': 'x',
    },
  ]);

  const kontakteSheet = sheetFromRows([
    {
      Name: 'Anna Muster',
      Datum: isoToExcelSerial('2024-01-05'),
      Verantwortlich: 'Jenny',
      Art: 'Besuch',
      Notiz: 'Schön gewesen',
    },
    {
      Name: 'Beat Tester',
      Datum: '', // Altdaten ohne Datum (4.2)
      Verantwortlich: 'Age',
      Art: 'Telefonat',
      Notiz: 'Kurz telefoniert',
      'Nächster Schritt': 'Nachfassen',
      'Wiedervorlage bis': isoToExcelSerial('2024-02-01'),
    },
    {
      Name: 'Unbekannte Person',
      Datum: isoToExcelSerial('2024-01-06'),
      Verantwortlich: 'Jenny',
      Art: 'Besuch',
      Notiz: 'sollte einen Fehler auslösen',
    },
  ]);

  const anwesenheitSheet = sheetFromMatrix([
    ['ID', 'Name', isoToExcelSerial('2024-01-07'), isoToExcelSerial('2024-01-14'), isoToExcelSerial('2024-01-21')],
    ['P001', 'Anna Muster', 'x', 'o', ''],
    ['P002', 'Beat Tester', 'o', 'o', 'o'],
  ]);

  const eventsSheet = sheetFromRows([
    {
      Event: 'Jugendtreff',
      Datum: isoToExcelSerial('2024-01-10'),
      Person: 'Anna Muster',
      Verantwortlich: 'Jenny',
      Rolle: 'Team',
      Anwesend: 'x',
      Notiz: 'gut',
    },
    {
      Event: 'Jugendtreff',
      Datum: isoToExcelSerial('2024-01-10'),
      Person: 'Beat Tester',
      Verantwortlich: 'Jenny',
      Rolle: 'Gast',
      Anwesend: '',
    },
  ]);

  const auswertungSheet = sheetFromRows([
    { Name: 'Anna Muster', Anwesend: 1, Abwesend: 1, Erfasst: 2, Quote: 0.5, 'Abwesend in Folge': 0 },
    // Quote hier bewusst falsch (0.4 statt der tatsächlich berechneten 0), damit
    // der Test beweist, dass verify.ts die Abweichung tatsächlich findet.
    { Name: 'Beat Tester', Anwesend: 0, Abwesend: 3, Erfasst: 3, Quote: 0.4, 'Abwesend in Folge': 3 },
  ]);

  const personenWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(personenWb, personenSheet, 'Personen');
  XLSX.utils.book_append_sheet(personenWb, kontakteSheet, 'Kontakte');

  const anwesenheitWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(anwesenheitWb, anwesenheitSheet, 'Anwesenheit');
  XLSX.utils.book_append_sheet(anwesenheitWb, auswertungSheet, 'Auswertung');
  XLSX.utils.book_append_sheet(anwesenheitWb, eventsSheet, 'Events');
  XLSX.utils.book_append_sheet(anwesenheitWb, listenSheet, 'Listen');

  return { personenWb, anwesenheitWb };
}

describe('Import-Pipeline (Abschnitt 10)', () => {
  it('importiert Listen, Leiter, Personen, Kontakte, Anwesenheit und Events korrekt und verifiziert gegen Auswertung', async () => {
    const { personenWb, anwesenheitWb } = buildWorkbooks();
    const supabase = new FakeSupabase() as any;
    const report = new ImportReport();

    const listen = leseListenBlatt(anwesenheitWb.Sheets['Listen']);
    expect(listen['Verantwortliche']).toEqual(['Jenny', 'Age']);

    const leaderIdByName = await importiereLeiter(supabase, listen, report, true);
    expect([...leaderIdByName.keys()].sort()).toEqual(['Age', 'Jenny']);

    const idMaps = await importiereStammlisten(supabase, listen, report, true);
    expect([...idMaps['Status'].keys()].sort()).toEqual(
      ['Besucher', 'Erstbesucher', 'Ehemalig', 'Kontakt', 'Member'].sort(),
    );

    const personNameToId = await importierePersonen(
      supabase,
      personenWb.Sheets['Personen'],
      idMaps,
      leaderIdByName,
      report,
      true,
    );
    expect(personNameToId.size).toBe(2);
    expect(supabase.tables['people']).toHaveLength(2);

    // "jenny" (klein) muss auf den kanonischen Namen "Jenny" normalisiert worden sein.
    const anna = supabase.tables['people'].find((p: any) => p.nachname === 'Muster');
    expect(anna.zustaendig).toBe(leaderIdByName.get('Jenny'));
    // Telefon-Normalisierung auf E.164 (4.1).
    expect(anna.telefon).toBe('+41783081703');
    expect(anna.zu_pruefen).toBe(false);

    const beat = supabase.tables['people'].find((p: any) => p.nachname === 'Tester');
    expect(beat.zu_pruefen).toBe(true);
    expect(beat.telefon).toBe('+41782526620');

    await importiereKontakte(
      supabase,
      personenWb.Sheets['Kontakte'],
      personNameToId,
      idMaps['Kontaktart'],
      leaderIdByName,
      report,
      true,
    );
    // 2 auflösbare Kontakte, 1 Fehler für "Unbekannte Person" (10, Schritt 4).
    expect(supabase.tables['contacts']).toHaveLength(2);
    const beatKontakt = supabase.tables['contacts'].find((c: any) => c.person_id === personNameToId.get('Beat Tester'));
    expect(beatKontakt.datum).toBeNull(); // Altdaten ohne Datum bleiben erlaubt (4.2)
    expect(report.fehler.some((f) => f.meldung.includes('Unbekannte Person'))).toBe(true);

    const attendanceRows = await importiereAnwesenheit(
      supabase,
      anwesenheitWb.Sheets['Anwesenheit'],
      personNameToId,
      report,
      true,
    );
    // Anna: x, o, leer -> 2 Zeilen (die leere Zelle erzeugt KEINE Zeile, 4.3).
    const annaRows = attendanceRows.filter((r) => r.person_id === personNameToId.get('Anna Muster'));
    expect(annaRows).toHaveLength(2);
    expect(annaRows.map((r) => r.status).sort()).toEqual(['abwesend', 'anwesend']);
    // Beat: o, o, o -> 3 Zeilen, alle abwesend.
    const beatRows = attendanceRows.filter((r) => r.person_id === personNameToId.get('Beat Tester'));
    expect(beatRows).toHaveLength(3);
    expect(beatRows.every((r) => r.status === 'abwesend')).toBe(true);
    expect(supabase.tables['attendance']).toHaveLength(5);

    await importiereEvents(
      supabase,
      anwesenheitWb.Sheets['Events'],
      personNameToId,
      leaderIdByName,
      report,
      true,
    );
    // Beide Event-Zeilen haben (Event, Datum) gemeinsam -> genau 1 Session (4.4).
    expect(supabase.tables['event_sessions']).toHaveLength(1);
    expect(supabase.tables['event_attendance']).toHaveLength(2);

    const personIdToName = new Map([...personNameToId].map(([name, id]) => [id, name]));
    verifiziereGegenAuswertung(attendanceRows, anwesenheitWb.Sheets['Auswertung'], personIdToName, report);

    // Annas berechnete Quote (0.5) stimmt mit der Excel-Quote überein -> kein Fehler dafür.
    expect(report.fehler.some((f) => f.meldung.startsWith('Anna Muster: Quote'))).toBe(false);
    // Beats absichtlich falsche Excel-Quote (0.4 statt berechneter 0) MUSS auffallen.
    expect(report.fehler.some((f) => f.meldung.startsWith('Beat Tester: Quote'))).toBe(true);
  });
});
