// Abschnitt 9.2: Status-Chip-Farben.
const STATUS_FARBEN: Record<string, { bg: string; text: string }> = {
  Member: { bg: '#eae7e7', text: '#444141' },
  Besucher: { bg: '#fff2ef', text: '#ae1800' },
  Erstbesucher: { bg: '#ec3013', text: '#f3f2f2' },
  Kontakt: { bg: '#f7d9d3', text: '#7c1405' },
  Ehemalig: { bg: '#eae7e7', text: '#7d7979' },
};

export function StatusChip({ status }: { status: string }) {
  const farben = STATUS_FARBEN[status] ?? { bg: 'var(--chip-neutral-bg)', text: 'var(--chip-neutral-text)' };
  return (
    <span
      className="chip"
      style={{
        display: 'inline-block',
        background: farben.bg,
        color: farben.text,
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

export function NeutralChip({ label }: { label: string }) {
  return (
    <span
      className="chip"
      style={{
        display: 'inline-block',
        background: 'var(--chip-neutral-bg)',
        color: 'var(--chip-neutral-text)',
        fontSize: 10,
        fontWeight: 700,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
