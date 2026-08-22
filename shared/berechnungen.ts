// Berechnungslogik aus design_handoff_kirchen_app/README.md, Abschnitt 5.
//
// Diese Datei ist die einzige Quelle für diese Regeln. Sie wird sowohl von der
// App (app/src) als auch vom Import-Skript (import/src, für die
// Verifikation gegen das Blatt "Auswertung" nach Abschnitt 10, Schritt 7)
// verwendet -- absichtlich, damit es nur eine Implementierung von
// "abwesend_in_folge" & Co. gibt statt zwei, die auseinanderlaufen können.
//
// Vollständige Tests: shared/berechnungen.test.ts (siehe Abschnitt 13, Schritt 5:
// "Schreibe hier Tests; abwesend_in_folge und die Behandlung nicht erfasster
// Sonntage sind die fehleranfälligsten Stellen der ganzen App.")

export type AnwesenheitStatus = 'anwesend' | 'abwesend';

export interface AttendanceRow {
  datum: string; // ISO 'YYYY-MM-DD', ein Sonntag
  status: AnwesenheitStatus;
}

export interface AttendanceStats {
  anwesend: number;
  abwesend: number;
  /** anwesend + abwesend. Nicht erfasste Sonntage zählen NICHT mit (5.1). */
  erfasst: number;
  /** anwesend / erfasst, oder null wenn erfasst === 0. In der UI "—" zeigen, nicht 0%. */
  quote: number | null;
  /**
   * Anzahl aufeinanderfolgender `abwesend` am Ende der chronologischen Reihe.
   * Bricht beim ersten `anwesend` ab. Nicht erfasste Sonntage brechen die Serie
   * NICHT ab -- sie werden übersprungen (5.1).
   */
  abwesendInFolge: number;
  /** Grösstes Datum mit Status `anwesend`, sonst null. */
  letzteAnwesenheit: string | null;
}

/**
 * Berechnet die Anwesenheitskennzahlen einer Person aus ihren `attendance`-Zeilen.
 *
 * Wichtig für `abwesendInFolge`: die Eingabe enthält per Definition nur erfasste
 * Sonntage (attendance hat keine Zeile für "nicht erfasst"). Ein nicht erfasster
 * Sonntag existiert für diese Funktion schlicht nicht -- er "überspringt" sich
 * von selbst, weil dazwischen kein Bruch der Serie durch eine `anwesend`-Zeile
 * entsteht. Die Reihenfolge der Eingabe ist beliebig, die Funktion sortiert
 * selbst chronologisch.
 */
export function attendanceOf(rows: AttendanceRow[]): AttendanceStats {
  const sorted = [...rows].sort((a, b) => a.datum.localeCompare(b.datum));

  const anwesend = sorted.filter((r) => r.status === 'anwesend').length;
  const abwesend = sorted.filter((r) => r.status === 'abwesend').length;
  const erfasst = anwesend + abwesend;
  const quote = erfasst > 0 ? anwesend / erfasst : null;

  let abwesendInFolge = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status === 'abwesend') {
      abwesendInFolge++;
    } else {
      break;
    }
  }

  let letzteAnwesenheit: string | null = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status === 'anwesend') {
      letzteAnwesenheit = sorted[i].datum;
      break;
    }
  }

  return { anwesend, abwesend, erfasst, quote, abwesendInFolge, letzteAnwesenheit };
}

export interface ContactRow {
  datum: string | null; // nullable: Altdaten ohne Datum (4.2)
  art: string;
}

export interface ContactStats {
  kontakteTotal: number;
  letzterKontakt: string | null;
  tageSeitKontakt: number | null;
  letzterBesuch: string | null;
  letzteBeratung: string | null;
}

const BESUCH = 'Besuch';
const BERATUNG = 'Beratung / Seelsorge';

/** Kontaktkennzahlen einer Person aus ihren `contacts`-Zeilen (5.2). */
export function contactStatsOf(rows: ContactRow[], heute: Date = new Date()): ContactStats {
  const mitDatum = rows.filter((r): r is { datum: string; art: string } => r.datum !== null);

  const maxDatum = (art?: string): string | null => {
    const kandidaten = art ? mitDatum.filter((r) => r.art === art) : mitDatum;
    if (kandidaten.length === 0) return null;
    return kandidaten.reduce((max, r) => (r.datum > max ? r.datum : max), kandidaten[0].datum);
  };

  const letzterKontakt = maxDatum();
  const tageSeitKontakt = letzterKontakt
    ? Math.floor((heute.getTime() - new Date(letzterKontakt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    kontakteTotal: rows.length,
    letzterKontakt,
    tageSeitKontakt,
    letzterBesuch: maxDatum(BESUCH),
    letzteBeratung: maxDatum(BERATUNG),
  };
}

export const AKTIVE_STATUS = ['Member', 'Besucher', 'Erstbesucher', 'Kontakt'] as const;
export type AktiverStatus = (typeof AKTIVE_STATUS)[number];

/** 5.5: Basis für Ø-Quote, Risiko-Zählung und Check-in-Liste. */
export function istAktiv(status: string): boolean {
  return (AKTIVE_STATUS as readonly string[]).includes(status);
}

/**
 * 5.3: Risiko-Kontakt, wenn abwesendInFolge >= Schwellwert (Standard 3, pro
 * Gemeinde konfigurierbar über `gemeinde_einstellungen.risiko_schwellwert`)
 * UND der Status eine aktive Person ist. `Ehemalig` ist immer ausgeschlossen,
 * weil `istAktiv('Ehemalig') === false`.
 */
export function istRisikoKontakt(
  status: string,
  abwesendInFolge: number,
  schwellwert = 3,
): boolean {
  return abwesendInFolge >= schwellwert && istAktiv(status);
}

/**
 * 5.4: Ein Kontakteintrag ist fällig, wenn `wiedervorlage` gesetzt, nicht
 * erledigt (Lücke 12.1, gelöst über `erledigt_am`) und <= heute ist.
 */
export function istFaellig(
  wiedervorlage: string | null,
  erledigtAm: string | null,
  heute: Date = new Date(),
): boolean {
  if (!wiedervorlage || erledigtAm) return false;
  return wiedervorlage <= isoDate(heute);
}

/** 5.4: "bald fällig" für den andersfarbigen Chip in der Home-Liste (+10 Tage Standard). */
export function istBaldFaellig(
  wiedervorlage: string | null,
  erledigtAm: string | null,
  heute: Date = new Date(),
  vorlaufTage = 10,
): boolean {
  if (!wiedervorlage || erledigtAm) return false;
  if (wiedervorlage <= isoDate(heute)) return false; // dann ist es bereits überfällig, nicht "bald"
  const grenze = new Date(heute);
  grenze.setDate(grenze.getDate() + vorlaufTage);
  return wiedervorlage <= isoDate(grenze);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
