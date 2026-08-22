import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

// Abschnitt 6: Detail-/Formular-Screens ersetzen die Tab-Bar und zeigen
// stattdessen einen Zurück-Chevron links im Header.
// Header-Höhe: padding 10px 16px 12px, min-height 34px, 2px Unterkante.

export function Header({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 12px',
        minHeight: 34,
        borderBottom: '2px solid var(--divider)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Zurück"
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 44,
          minHeight: 44,
          marginLeft: -12,
          background: 'transparent',
          border: 'none',
          color: 'var(--text)',
        }}
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, flex: 1, textAlign: 'left', marginLeft: 4 }}>
        {title}
      </h1>
      {action}
    </header>
  );
}
