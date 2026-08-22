import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LeaderRef, LookupItem } from '../lib/types';

export interface Lookups {
  status: LookupItem[];
  bacenta: LookupItem[];
  basonta: LookupItem[];
  bildung: LookupItem[];
  bildungsjahr: LookupItem[];
  wieEntdeckt: LookupItem[];
  kontaktart: LookupItem[];
  leaders: LeaderRef[];
  loading: boolean;
}

const TABELLEN = {
  status: 'status_optionen',
  bacenta: 'bacenta_optionen',
  basonta: 'basonta_optionen',
  bildung: 'bildung_optionen',
  bildungsjahr: 'bildungsjahr_optionen',
  wieEntdeckt: 'wie_entdeckt_optionen',
  kontaktart: 'kontaktart_optionen',
} as const;

/**
 * Lädt alle pflegbaren Stammlisten (4.5) + das Leiter-Verzeichnis einmal beim
 * Start. Kleine, selten wechselnde Tabellen -- ein Fetch pro Session reicht.
 */
export function useLookups(): Lookups {
  const [state, setState] = useState<Lookups>({
    status: [],
    bacenta: [],
    basonta: [],
    bildung: [],
    bildungsjahr: [],
    wieEntdeckt: [],
    kontaktart: [],
    leaders: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      const entries = Object.entries(TABELLEN) as [keyof typeof TABELLEN, string][];
      const results = await Promise.all(
        entries.map(([, tabelle]) =>
          supabase.from(tabelle).select('id, name, sortierung').order('sortierung'),
        ),
      );
      const leadersResult = await supabase.from('leaders').select('id, name').order('name');

      if (!active) return;

      const next: Lookups = {
        status: [],
        bacenta: [],
        basonta: [],
        bildung: [],
        bildungsjahr: [],
        wieEntdeckt: [],
        kontaktart: [],
        leaders: (leadersResult.data as LeaderRef[]) ?? [],
        loading: false,
      };
      entries.forEach(([key], i) => {
        next[key] = (results[i].data as LookupItem[]) ?? [];
      });
      setState(next);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
