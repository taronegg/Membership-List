export function initialen(vorname: string, nachname: string): string {
  return `${vorname[0] ?? ''}${nachname[0] ?? ''}`.toUpperCase();
}

export function InitialsBox({
  vorname,
  nachname,
  size = 34,
}: {
  vorname: string;
  nachname: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--text)',
        color: 'var(--bg)',
        fontWeight: 800,
        fontSize: size >= 56 ? 20 : 13,
      }}
    >
      {initialen(vorname, nachname)}
    </div>
  );
}
