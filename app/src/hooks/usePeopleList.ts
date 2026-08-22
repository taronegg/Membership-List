import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { attendanceOf } from '@shared/berechnungen';
import type { PersonListItem } from '../lib/types';

interface RawRow {
  id: string;
  vorname: string;
  nachname: string;
  zu_pruefen: boolean;
  geburtsdatum: string | null;
  status: { id: string; name: string; sortierung: number } | null;
  bacenta: { id: string; name: string; sortierung: number } | null;
  basonta: { id: string; name: string; sortierung: number } | null;
  zustaendig_leader: { id: string; name: string } | null;
}

/**
 * Lädt die Personenliste (7.2) inkl. der für die Zeile nötigen Meta-Angaben
 * und berechnet die Anwesenheitsquote (5.1) aus den zugehörigen
 * `attendance`-Zeilen. RLS (5.6) sorgt dafür, dass ein Leiter hier ohnehin nur
 * seine eigenen Personen sieht -- kein Client-Filter nötig.
 */
export function usePeopleList(): { people: PersonListItem[]; loading: boolean; reload: () => void } {
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const [peopleResult, attendanceResult] = await Promise.all([
        supabase
          .from('people')
          .select(
            'id, vorname, nachname, zu_pruefen, geburtsdatum, ' +
              'status:status_optionen(id, name, sortierung), ' +
              'bacenta:bacenta_optionen(id, name, sortierung), ' +
              'basonta:basonta_optionen(id, name, sortierung), ' +
              'zustaendig_leader:leaders!zustaendig(id, name)',
          ),
        supabase.from('attendance').select('person_id, datum, status'),
      ]);

      if (!active) return;

      const attendanceByPerson = new Map<string, { datum: string; status: 'anwesend' | 'abwesend' }[]>();
      for (const row of attendanceResult.data ?? []) {
        const list = attendanceByPerson.get(row.person_id) ?? [];
        list.push({ datum: row.datum, status: row.status });
        attendanceByPerson.set(row.person_id, list);
      }

      const rows = (peopleResult.data ?? []) as unknown as RawRow[];
      const items: PersonListItem[] = rows.map((row) => {
        const stats = attendanceOf(attendanceByPerson.get(row.id) ?? []);
        return {
          id: row.id,
          vorname: row.vorname,
          nachname: row.nachname,
          zuPruefen: row.zu_pruefen,
          geburtsdatum: row.geburtsdatum,
          status: row.status,
          bacenta: row.bacenta,
          basonta: row.basonta,
          zustaendig: row.zustaendig_leader,
          quote: stats.quote,
          abwesendInFolge: stats.abwesendInFolge,
        };
      });

      setPeople(items);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [version]);

  return { people, loading, reload: () => setVersion((v) => v + 1) };
}
