import { supabase } from './supabaseClient';
import type { CheckinEintrag } from './offlineOutbox';

/**
 * Schreibt einen Check-in-Batch nach `attendance`. Personen mit `status: null`
 * werden auf "nicht erfasst" zurückgesetzt, was laut 4.3 bedeutet: KEINE
 * Zeile -- die vorhandene Zeile (falls es eine gab) wird gelöscht, nicht auf
 * einen dritten Statuswert gesetzt.
 */
export async function sendeCheckinBatch(datum: string, eintraege: CheckinEintrag[]): Promise<void> {
  const zuSpeichern = eintraege.filter(
    (e): e is CheckinEintrag & { status: 'anwesend' | 'abwesend' } => e.status !== null,
  );
  const zuLoeschen = eintraege.filter((e) => e.status === null).map((e) => e.personId);

  if (zuSpeichern.length > 0) {
    const { error } = await supabase.from('attendance').upsert(
      zuSpeichern.map((e) => ({
        person_id: e.personId,
        datum,
        status: e.status,
        grund: e.grund ?? null,
      })),
      { onConflict: 'person_id,datum' },
    );
    if (error) throw error;
  }

  if (zuLoeschen.length > 0) {
    const { error } = await supabase.from('attendance').delete().eq('datum', datum).in('person_id', zuLoeschen);
    if (error) throw error;
  }
}
