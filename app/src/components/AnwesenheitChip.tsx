// 7.3/7.5: Status-Chip mit dem Anwesenheits-Zustand als Text
// ("anwesend" / "abwesend" / "nicht erfasst").
export function AnwesenheitChip({ status }: { status: 'anwesend' | 'abwesend' | null }) {
  const bg = status === 'anwesend' ? 'var(--text)' : status === 'abwesend' ? 'var(--accent)' : 'var(--chip-neutral-bg)';
  const fg = status ? 'var(--bg)' : 'var(--chip-neutral-text)';
  return (
    <span className="chip" style={{ display: 'inline-block', background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {status ?? 'nicht erfasst'}
    </span>
  );
}
