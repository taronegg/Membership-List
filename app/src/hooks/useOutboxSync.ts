import { useCallback, useEffect, useState } from 'react';
import { outboxLesen, outboxEntfernen } from '../lib/offlineOutbox';
import { sendeCheckinBatch } from '../lib/attendanceSync';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Versucht beim Start und bei jedem "online"-Event, den lokalen Check-in-
 * Puffer (Abschnitt 3: harte Anforderung, keine Optimierung) an Supabase zu
 * senden. Verarbeitet die Batches in Reihenfolge (ältester zuerst) und bricht
 * beim ersten Fehler ab, statt spätere Batches vorzuziehen -- sonst könnten
 * Änderungen an einem Sonntag die an einem anderen überholen.
 */
export function useOutboxSync(): { pendingCount: number; flush: () => Promise<void> } {
  const [pendingCount, setPendingCount] = useState(0);
  const online = useOnlineStatus();

  const flush = useCallback(async () => {
    const batches = await outboxLesen();
    for (const batch of batches) {
      try {
        await sendeCheckinBatch(batch.datum, batch.eintraege);
        await outboxEntfernen(batch.id);
      } catch {
        break; // vermutlich weiterhin offline -- Rest bleibt für den nächsten Versuch im Puffer
      }
    }
    setPendingCount((await outboxLesen()).length);
  }, []);

  useEffect(() => {
    void flush();
  }, [flush]);

  useEffect(() => {
    if (online) void flush();
  }, [online, flush]);

  return { pendingCount, flush };
}
