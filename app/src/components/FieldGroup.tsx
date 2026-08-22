import type { ReactNode } from 'react';

// Abschnitt 7.3: Feldgruppen im Sub-Tab "Profil" -- 10px-uppercase-Überschrift
// mit 2px-Unterlinie, Zeilen Label (11px grau, feste Breite 118px) : Wert (13px/600).

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          margin: '0 0 8px',
          paddingBottom: 6,
          borderBottom: '2px solid var(--divider)',
        }}
      >
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', padding: '6px 0', gap: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 118, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value ?? '—'}</span>
    </div>
  );
}
