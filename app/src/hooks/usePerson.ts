import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { contactStatsOf, type ContactStats } from '@shared/berechnungen';
import type { Person } from '../lib/types';

const SELECT =
  'id, vorname, nachname, telefon, geburtsdatum, adresse, richtung, erstkontakt, notizen, zu_pruefen, ' +
  'status:status_optionen(id, name, sortierung), ' +
  'bacenta:bacenta_optionen(id, name, sortierung), ' +
  'basonta:basonta_optionen(id, name, sortierung), ' +
  'bildung:bildung_optionen(id, name, sortierung), ' +
  'bildungsjahr:bildungsjahr_optionen(id, name, sortierung), ' +
  'wie_entdeckt:wie_entdeckt_optionen(id, name, sortierung), ' +
  'zustaendig_leader:leaders!zustaendig(id, name), ' +
  'besucher1_leader:leaders!besucher1(id, name), ' +
  'besucher2_leader:leaders!besucher2(id, name)';

interface RawPerson {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  geburtsdatum: string | null;
  adresse: string | null;
  richtung: string | null;
  erstkontakt: string | null;
  notizen: string | null;
  zu_pruefen: boolean;
  status: Person['status'];
  bacenta: Person['bacenta'];
  basonta: Person['basonta'];
  bildung: Person['bildung'];
  bildungsjahr: Person['bildungsjahr'];
  wie_entdeckt: Person['wieEntdeckt'];
  zustaendig_leader: Person['zustaendig'];
  besucher1_leader: Person['besucher1'];
  besucher2_leader: Person['besucher2'];
}

function toPerson(row: RawPerson): Person {
  return {
    id: row.id,
    vorname: row.vorname,
    nachname: row.nachname,
    status: row.status,
    zustaendig: row.zustaendig_leader,
    telefon: row.telefon,
    geburtsdatum: row.geburtsdatum,
    adresse: row.adresse,
    bacenta: row.bacenta,
    basonta: row.basonta,
    bildung: row.bildung,
    richtung: row.richtung,
    bildungsjahr: row.bildungsjahr,
    wieEntdeckt: row.wie_entdeckt,
    erstkontakt: row.erstkontakt,
    besucher1: row.besucher1_leader,
    besucher2: row.besucher2_leader,
    notizen: row.notizen,
    zuPruefen: row.zu_pruefen,
  };
}

export interface PersonDetail {
  person: Person | null;
  kontaktStats: ContactStats | null;
  loading: boolean;
  reload: () => void;
}

/** Lädt eine Person (7.3, Sub-Tab "Profil") inkl. abgeleiteter Kontaktkennzahlen (5.2). */
export function usePerson(id: string | null): PersonDetail {
  const [person, setPerson] = useState<Person | null>(null);
  const [kontaktStats, setKontaktStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) {
      setPerson(null);
      setKontaktStats(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function load() {
      const [personResult, contactsResult] = await Promise.all([
        supabase.from('people').select(SELECT).eq('id', id).single(),
        supabase.from('contacts').select('datum, art:kontaktart_optionen(name)').eq('person_id', id),
      ]);

      if (!active) return;

      setPerson(personResult.data ? toPerson(personResult.data as unknown as RawPerson) : null);

      type RawContactRow = { datum: string | null; art: { name: string } | { name: string }[] | null };
      const contactRows = (contactsResult.data ?? []) as unknown as RawContactRow[];
      setKontaktStats(
        contactStatsOf(
          contactRows.map((r) => ({
            datum: r.datum,
            art: (Array.isArray(r.art) ? r.art[0]?.name : r.art?.name) ?? '',
          })),
        ),
      );
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [id, version]);

  return { person, kontaktStats, loading, reload: () => setVersion((v) => v + 1) };
}
