import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LeaderRef, LookupItem } from '../lib/types';

export interface ContactListItem {
  id: string;
  personId: string;
  personName: string;
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
  person_id: string;
  datum: string | null;
  notiz: string | null;
  naechster_schritt: string | null;
  wiedervorlage: string | null;
  erledigt_am: string | null;
  verantwortlich_leader: LeaderRef | null;
  art: LookupItem | null;
  person: { vorname: string; nachname: string } | null;
}

/** Abschnitt 7.6: Kontakte (Tab) -- alle Kontakteinträge, unabhängig vom Personenstatus. */
export function useContactsList(): { contacts: ContactListItem[]; loading: boolean; reload: () => void } {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    supabase
      .from('contacts')
      .select(
        'id, person_id, datum, notiz, naechster_schritt, wiedervorlage, erledigt_am, ' +
          'verantwortlich_leader:leaders!verantwortlich(id, name), ' +
          'art:kontaktart_optionen(id, name, sortierung), ' +
          'person:people(vorname, nachname)',
      )
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as RawRow[];
        setContacts(
          rows.map((r) => ({
            id: r.id,
            personId: r.person_id,
            personName: r.person ? `${r.person.vorname} ${r.person.nachname}` : '—',
            datum: r.datum,
            verantwortlich: r.verantwortlich_leader,
            art: r.art,
            notiz: r.notiz,
            naechsterSchritt: r.naechster_schritt,
            wiedervorlage: r.wiedervorlage,
            erledigtAm: r.erledigt_am,
          })),
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  return { contacts, loading, reload: () => setVersion((v) => v + 1) };
}
