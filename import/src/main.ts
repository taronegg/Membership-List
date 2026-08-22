import 'dotenv/config';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { getSheet } from './xlsxUtil.js';
import { leseListenBlatt } from './listen.js';
import { importiereStammlisten, importiereLeiter } from './stammdaten.js';
import { importierePersonen } from './personen.js';
import { importiereKontakte } from './kontakte.js';
import { importiereAnwesenheit } from './anwesenheit.js';
import { importiereEvents } from './events.js';
import { verifiziereGegenAuswertung } from './verify.js';
import { ImportReport } from './report.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  return {
    personenPfad: get('--personen'),
    anwesenheitPfad: get('--anwesenheit'),
    apply: args.includes('--apply'),
  };
}

/**
 * Orchestriert den Import in der Reihenfolge aus Abschnitt 10:
 * Listen -> Leiter -> Personen -> Kontakte -> Anwesenheit -> Events -> Verifikation.
 *
 * Läuft standardmässig als Dry-Run (liest beide Excel-Dateien, meldet Fehler/
 * Hinweise, schreibt aber nichts in die DB). Erst `--apply` schreibt tatsächlich.
 * So lässt sich der Fehlerbericht (nicht auflösbare Namen, unbekannte
 * Zellwerte, fehlende Pflichtfelder) vor jedem echten Import prüfen.
 */
async function main() {
  const { personenPfad, anwesenheitPfad, apply } = parseArgs();
  if (!personenPfad || !anwesenheitPfad) {
    console.error(
      'Nutzung: npm run import -- --personen <1_ELK_Basel_Personen.xlsx> ' +
        '--anwesenheit <2_ELK_Basel_Anwesenheit.xlsx> [--apply]',
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (siehe .env.example).');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(apply ? 'Modus: APPLY (schreibt in die Datenbank)' : 'Modus: DRY-RUN (keine Schreibvorgänge -- --apply zum Anwenden)');

  const report = new ImportReport();

  const personenWb = XLSX.readFile(personenPfad);
  const anwesenheitWb = XLSX.readFile(anwesenheitPfad);

  // 1. Listen
  const listen = leseListenBlatt(getSheet(anwesenheitWb, 'Listen'));

  // 2. Leiter (aus Spalte "Verantwortliche" der Listen)
  const leaderIdByName = await importiereLeiter(supabase, listen, report, apply);
  const idMaps = await importiereStammlisten(supabase, listen, report, apply);

  // 3. Personen
  const personNameToId = await importierePersonen(
    supabase,
    getSheet(personenWb, 'Personen'),
    idMaps,
    leaderIdByName,
    report,
    apply,
  );

  // 4. Kontakte
  await importiereKontakte(
    supabase,
    getSheet(personenWb, 'Kontakte'),
    personNameToId,
    idMaps['Kontaktart'] ?? new Map(),
    leaderIdByName,
    report,
    apply,
  );

  // 5. Anwesenheit
  const attendanceRows = await importiereAnwesenheit(
    supabase,
    getSheet(anwesenheitWb, 'Anwesenheit'),
    personNameToId,
    report,
    apply,
  );

  // 6. Events
  await importiereEvents(
    supabase,
    getSheet(anwesenheitWb, 'Events'),
    personNameToId,
    leaderIdByName,
    report,
    apply,
  );

  // 7. Auswertung nicht importieren, sondern zur Verifikation nutzen
  const personIdToName = new Map([...personNameToId].map(([name, id]) => [id, name]));
  verifiziereGegenAuswertung(attendanceRows, getSheet(anwesenheitWb, 'Auswertung'), personIdToName, report);

  report.print();
  if (report.hatFehler) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
