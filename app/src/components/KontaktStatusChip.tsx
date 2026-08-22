import { istFaellig, istBaldFaellig } from '@shared/berechnungen';

// Abschnitt 7.6: Chip rechts -- überfällig = rot/weiss, bald fällig = #f7d9d3,
// sonst die Kontaktart auf #eae7e7.

export function KontaktStatusChip({
  wiedervorlage,
  erledigtAm,
  artName,
}: {
  wiedervorlage: string | null;
  erledigtAm: string | null;
  artName: string;
}) {
  let bg = 'var(--chip-neutral-bg)';
  let fg = 'var(--chip-neutral-text)';
  let label = artName;

  if (istFaellig(wiedervorlage, erledigtAm)) {
    bg = 'var(--accent)';
    fg = 'var(--bg)';
    label = 'Überfällig';
  } else if (istBaldFaellig(wiedervorlage, erledigtAm)) {
    bg = 'var(--accent-tint-2)';
    fg = 'var(--accent-darkest)';
    label = 'Bald fällig';
  }

  return (
    <span className="chip" style={{ display: 'inline-block', background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}
