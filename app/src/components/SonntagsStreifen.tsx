import type { AttendanceEntry } from '../lib/types';
import { formatDatumKurz } from '../lib/format';

// Abschnitt 7.3, Sub-Tab "Anwesenheit": die letzten 12 Sonntage als gleich
// breite Balken, 34px hoch, 3px Abstand. Anwesend dunkel, abwesend rot,
// nicht erfasst hell mit Rahmen -- unabhängig davon, ob für diesen Sonntag
// überhaupt eine `attendance`-Zeile existiert (4.3: "nicht erfasst" hat keine
// Zeile), müssen alle 12 Kalender-Sonntage angezeigt werden.

function letzte12Sonntage(heute: Date): string[] {
  const result: string[] = [];
  const cur = new Date(heute);
  cur.setUTCHours(0, 0, 0, 0);
  cur.setUTCDate(cur.getUTCDate() - cur.getUTCDay());
  for (let i = 0; i < 12; i++) {
    result.unshift(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() - 7);
  }
  return result;
}

export function SonntagsStreifen({ eintraege, heute = new Date() }: { eintraege: AttendanceEntry[]; heute?: Date }) {
  const sonntage = letzte12Sonntage(heute);
  const statusByDatum = new Map(eintraege.map((e) => [e.datum, e.status]));

  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        {sonntage.map((datum) => {
          const status = statusByDatum.get(datum);
          const bg = status === 'anwesend' ? 'var(--text)' : status === 'abwesend' ? 'var(--accent)' : 'var(--surface)';
          return (
            <div
              key={datum}
              title={datum}
              style={{
                flex: 1,
                height: 34,
                background: bg,
                border: status ? 'none' : '1px solid var(--divider)',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', margin: '6px 0 10px' }}>
        <span>{formatDatumKurz(sonntage[0])}</span>
        <span>{formatDatumKurz(sonntage[sonntage.length - 1])}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
        <LegendeEintrag farbe="var(--text)" label="Anwesend" />
        <LegendeEintrag farbe="var(--accent)" label="Abwesend" />
        <LegendeEintrag farbe="var(--surface)" label="Nicht erfasst" rand />
      </div>
    </div>
  );
}

function LegendeEintrag({ farbe, label, rand }: { farbe: string; label: string; rand?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, background: farbe, border: rand ? '1px solid var(--divider)' : 'none' }} />
      {label}
    </span>
  );
}
