import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOutboxSync } from '../hooks/useOutboxSync';

// Abschnitt 8: "Fehlende Zustände ... Offline-Banner" -- im Prototyp nicht
// vorhanden, in der App nötig. Zeigt zusätzlich an, wenn noch ungesynchte
// Check-ins im lokalen Puffer liegen (Abschnitt 3: harte Anforderung).

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { pendingCount } = useOutboxSync();

  if (online && pendingCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'var(--accent-tint)',
        color: 'var(--accent-darkest)',
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      <WifiOff size={14} />
      {!online
        ? 'Offline — Änderungen werden lokal gespeichert und später synchronisiert.'
        : `${pendingCount} ungesynchte Änderung${pendingCount === 1 ? '' : 'en'} werden übertragen…`}
    </div>
  );
}
