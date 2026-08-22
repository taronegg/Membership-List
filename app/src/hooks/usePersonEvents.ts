import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LeaderRef } from '../lib/types';

export interface PersonEvent {
  id: string;
  eventName: string;
  datum: string;
  verantwortlich: LeaderRef | null;
  rolle: string | null;
  anwesend: boolean;
  notiz: string | null;
}

interface RawRow {
  id: string;
  rolle: string | null;
  anwesend: boolean;
  notiz: string | null;
  event: { id: string; name: string; datum: string; verantwortlich_leader: LeaderRef | null } | null;
}

/** 7.3, Sub-Tab "Anwesenheit": Abschnitt "Events" -- pro Eintrag Name, Chip, Meta. */
export function usePersonEvents(personId: string | null): { events: PersonEvent[]; loading: boolean } {
  const [events, setEvents] = useState<PersonEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    supabase
      .from('event_attendance')
      .select(
        'id, rolle, anwesend, notiz, ' +
          'event:event_sessions(id, name, datum, verantwortlich_leader:leaders!verantwortlich(id, name))',
      )
      .eq('person_id', personId)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as RawRow[];
        setEvents(
          rows
            .filter((r): r is RawRow & { event: NonNullable<RawRow['event']> } => r.event !== null)
            .map((r) => ({
              id: r.id,
              eventName: r.event.name,
              datum: r.event.datum,
              verantwortlich: r.event.verantwortlich_leader,
              rolle: r.rolle,
              anwesend: r.anwesend,
              notiz: r.notiz,
            }))
            .sort((a, b) => b.datum.localeCompare(a.datum)),
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [personId]);

  return { events, loading };
}
