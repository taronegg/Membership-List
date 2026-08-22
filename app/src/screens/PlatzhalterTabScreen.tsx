export function PlatzhalterTabScreen({ titel, hinweis }: { titel: string; hinweis: string }) {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>{titel}</h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{hinweis}</p>
    </div>
  );
}
