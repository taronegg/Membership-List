// Excel-Datumsserienzahlen, Basis 1899-12-30 (Abschnitt 4.1 / 10.3).
// Excel zählt Tage ab dieser Basis und hat einen bekannten Bug (behandelt 1900
// fälschlich als Schaltjahr) -- die Standard-Epoche 1899-12-30 statt
// 1899-12-31 gleicht genau diesen Bug für alle Daten ab März 1900 aus.

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Wandelt eine Excel-Serienzahl in ein ISO-Datum ('YYYY-MM-DD') um. */
export function excelSerialToIso(serial: number): string {
  const ms = EXCEL_EPOCH + Math.round(serial) * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Wandelt ein ISO-Datum zurück in eine Excel-Serienzahl (für Tests/Verifikation). */
export function isoToExcelSerial(iso: string): number {
  const ms = new Date(iso + 'T00:00:00Z').getTime();
  return Math.round((ms - EXCEL_EPOCH) / MS_PER_DAY);
}

/**
 * Liest ein Datumsfeld aus einer per SheetJS geparsten Zelle: akzeptiert eine
 * Excel-Serienzahl, ein bereits von SheetJS geparstes `Date`-Objekt (falls mit
 * `cellDates: true` gelesen wurde) oder eine ISO-artige Zeichenkette.
 * Leere/ungültige Werte ergeben `null`, statt eine Exception zu werfen --
 * der Import muss über unvollständige Altdaten hinweg weiterlaufen.
 */
export function parseExcelDateCell(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return excelSerialToIso(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && /^\d+(\.\d+)?$/.test(trimmed)) {
      return excelSerialToIso(asNumber);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  }
  return null;
}
