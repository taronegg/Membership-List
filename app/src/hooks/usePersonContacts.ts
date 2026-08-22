import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { contactStatsOf, type ContactStats } from '@shared/berechnungen';
import type { LeaderRef, LookupItem } from '../lib/types';

export interface PersonContact {
  id: string;
  datum: string | null;
  verantwortlich: LeaderRef | null;
  art: LookupItem | null;
  notiz: string | null;
  naechsterSchritt: string | null;
  wiedervorlage: string | null;
  erledigtAm: string | null;
}

interface RawRow {
  id: string;
  datum: string | null;
  notiz: string | null;
  naechster_schritt: string | null;
  wiedervorlage: string | null;
  erledigt_am: string | null;
  verantwortlich_leader: LeaderRef | null;
  art: LookupItem | null;
}

const SELECT =
  'id, datum, notiz, naechster_schritt, wiedervorlage, erledigt_am, ' +
  'verantwortlich_leader:leaders!verantwortlich(id, name), ' +
  'art:kontaktart_optionen(id, name, sortierung)';

/** Abschnitt 7.3, Sub-Tab "Kontakte". */
export function usePersonContacts(personId: string | null): {
  contacts: PersonContact[];
  stats: ContactStats | null;
  loading: boolean;
  reload: () => void;
} {
  const [contacts, setContacts] = useState<PersonContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!personId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    supabase
      .from('contacts')
      .select(SELECT)
      .eq('person_id', personId)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as RawRow[];
        const mapped = rows
          .map((r) => ({
            id: r.id,
            datum: r.datum,
            verantwortlich: r.verantwortlich_leader,
            art: r.art,
            notiz: r.notiz,
            naechsterSchritt: r.naechster_schritt,
            wiedervorlage: r.wiedervorlage,
            erledigtAm: r.erledigt_am,
          }))
          // neueste zuerst; Einträge ohne Datum (4.2) ans Ende
          .sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''));
        setContacts(mapped);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [personId, version]);

  return {
    contacts,
    stats: contactStatsOf(contacts.map((c) => ({ datum: c.datum, art: c.art?.name ?? '' }))),
    loading,
    reload: () => setVersion((v) => v + 1),
  };
}
