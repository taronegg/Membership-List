import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LeaderRef } from '../lib/types';

export interface EventTeilnehmer {
  id: string;
  personId: string;
  personName: string;
  rolle: string | null;
  anwesend: boolean;
  notiz: string | null;
}

export interface EventSession {
  id: string;
  name: string;
  datum: string;
  verantwortlich: LeaderRef | null;
  teilnehmer: EventTeilnehmer[];
}

interface RawTeilnehmer {
  id: string;
  person_id: string;
  rolle: string | null;
  anwesend: boolean;
  notiz: string | null;
  person: { vorname: string; nachname: string } | null;
}

interface RawSession {
  id: string;
  name: string;
  datum: string;
  verantwortlich_leader: LeaderRef | null;
  teilnehmer: RawTeilnehmer[];
}

/** Abschnitt 7.5, Sub-Tab "Events": Liste der Event-Sessions inkl. Teilnehmer. */
export function useEventSessions(): { sessions: EventSession[]; loading: boolean; reload: () => void } {
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    supabase
      .from('event_sessions')
      .select(
        'id, name, datum, ' +
          'verantwortlich_leader:leaders!verantwortlich(id, name), ' +
          'teilnehmer:event_attendance(id, person_id, rolle, anwesend, notiz, person:people(vorname, nachname))',
      )
      .order('datum', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as RawSession[];
        setSessions(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            datum: r.datum,
            verantwortlich: r.verantwortlich_leader,
            teilnehmer: (r.teilnehmer ?? []).map((t) => ({
              id: t.id,
              personId: t.person_id,
              personName: t.person ? `${t.person.vorname} ${t.person.nachname}` : '—',
              rolle: t.rolle,
              anwesend: t.anwesend,
              notiz: t.notiz,
            })),
          })),
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  return { sessions, loading, reload: () => setVersion((v) => v + 1) };
}
