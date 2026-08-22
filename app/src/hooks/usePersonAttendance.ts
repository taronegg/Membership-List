import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { attendanceOf, type AttendanceStats } from '@shared/berechnungen';
import type { AttendanceEntry } from '../lib/types';

export interface PersonAttendance {
  eintraege: AttendanceEntry[]; // chronologisch aufsteigend
  stats: AttendanceStats | null;
  loading: boolean;
}

/** Für den Sub-Tab "Anwesenheit" im Personen-Detail (7.3). */
export function usePersonAttendance(personId: string | null): PersonAttendance {
  const [eintraege, setEintraege] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personId) {
      setEintraege([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    supabase
      .from('attendance')
      .select('id, person_id, datum, status, grund')
      .eq('person_id', personId)
      .order('datum')
      .then(({ data }) => {
        if (!active) return;
        const rows = ((data ?? []) as { id: string; person_id: string; datum: string; status: 'anwesend' | 'abwesend'; grund: string | null }[]).map(
          (r) => ({ id: r.id, personId: r.person_id, datum: r.datum, status: r.status, grund: r.grund }),
        );
        setEintraege(rows);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [personId]);

  return {
    eintraege,
    stats: personId ? attendanceOf(eintraege) : null,
    loading,
  };
}
