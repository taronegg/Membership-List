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
  /** 5.3: "Der Schwellwert 3 sollte pro Gemeinde konfigurierbar sein." */
  risikoSchwellwert: number;
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

const STANDARD_RISIKO_SCHWELLWERT = 3;

/**
 * Lädt alle pflegbaren Stammlisten (4.5) + das Leiter-Verzeichnis + den
 * Risiko-Schwellwert einmal beim Start. Kleine, selten wechselnde Tabellen --
 * ein Fetch pro Session reicht.
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
    risikoSchwellwert: STANDARD_RISIKO_SCHWELLWERT,
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
      const einstellungenResult = await supabase.from('gemeinde_einstellungen').select('risiko_schwellwert').single();

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
        risikoSchwellwert:
          (einstellungenResult.data as { risiko_schwellwert: number } | null)?.risiko_schwellwert ??
          STANDARD_RISIKO_SCHWELLWERT,
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
