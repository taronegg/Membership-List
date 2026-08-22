import type { CheckinStatus } from '../hooks/useCheckin';

// Abschnitt 7.5: Dreifach-Umschalter x (aktiv dunkel) / o (aktiv rot) / – (aktiv
// #eae9e9), je 34px breit in einem gemeinsamen 1px-Rahmen.

const OPTIONEN: { value: CheckinStatus; label: string; aktivBg: string; aktivFg: string }[] = [
  { value: 'anwesend', label: 'x', aktivBg: 'var(--text)', aktivFg: 'var(--bg)' },
  { value: 'abwesend', label: 'o', aktivBg: 'var(--accent)', aktivFg: 'var(--bg)' },
  { value: null, label: '–', aktivBg: 'var(--surface)', aktivFg: 'var(--text)' },
];

export function CheckinToggle({
  value,
  onChange,
}: {
  value: CheckinStatus;
  onChange: (next: CheckinStatus) => void;
}) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--divider)' }}>
      {OPTIONEN.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              width: 34,
              minHeight: 44,
              border: 'none',
              borderRight: opt.label !== '–' ? '1px solid var(--divider)' : 'none',
              background: active ? opt.aktivBg : 'transparent',
              color: active ? opt.aktivFg : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
