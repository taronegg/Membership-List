import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { istAktiv } from '@shared/berechnungen';
import { sendeCheckinBatch } from '../lib/attendanceSync';
import { outboxHinzufuegen, type CheckinEintrag } from '../lib/offlineOutbox';

export type CheckinStatus = 'anwesend' | 'abwesend' | null;
export type SpeicherZustand = 'idle' | 'speichert' | 'gespeichert' | 'offline';

export interface CheckinPerson {
  id: string;
  vorname: string;
  nachname: string;
}

/**
 * Verwaltet den Check-in für einen Sonntag (7.5). "Der Prototyp startet ohne
 * Vorauswahl, damit niemand versehentlich alle als anwesend speichert" --
 * neue, noch nicht erfasste Personen starten auf `null` ("–"). Bereits
 * gespeicherte Zeilen für dieses Datum werden vorbelegt, damit ein
 * nachträgliches Bearbeiten möglich ist, ohne den bisherigen Stand zu verlieren.
 */
export function useCheckin(datum: string) {
  const [personen, setPersonen] = useState<CheckinPerson[]>([]);
  const [auswahl, setAuswahl] = useState<Record<string, CheckinStatus>>({});
  const [loading, setLoading] = useState(true);
  const [speichern, setSpeichern] = useState<SpeicherZustand>('idle');

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function load() {
      const [peopleResult, attendanceResult] = await Promise.all([
        supabase.from('people').select('id, vorname, nachname, status:status_optionen(name)'),
        supabase.from('attendance').select('person_id, status').eq('datum', datum),
      ]);
      if (!active) return;

      type Row = { id: string; vorname: string; nachname: string; status: { name: string } | null };
      const aktive = ((peopleResult.data ?? []) as unknown as Row[])
        .filter((p) => istAktiv(p.status?.name ?? '')) // 5.5: Basis für die Check-in-Liste
        .map((p) => ({ id: p.id, vorname: p.vorname, nachname: p.nachname }))
        .sort((a, b) => `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`, 'de'));
      setPersonen(aktive);

      const vorbelegung: Record<string, CheckinStatus> = {};
      for (const p of aktive) vorbelegung[p.id] = null;
      for (const row of (attendanceResult.data ?? []) as { person_id: string; status: CheckinStatus }[]) {
        vorbelegung[row.person_id] = row.status;
      }
      setAuswahl(vorbelegung);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [datum]);

  function setStatus(personId: string, status: CheckinStatus) {
    setAuswahl((a) => ({ ...a, [personId]: status }));
  }

  async function speichernJetzt() {
    setSpeichern('speichert');
    const eintraege: CheckinEintrag[] = personen.map((p) => ({ personId: p.id, status: auswahl[p.id] ?? null }));

    async function inPuffer() {
      await outboxHinzufuegen(datum, eintraege);
      setSpeichern('offline');
      setTimeout(() => setSpeichern('idle'), 2000);
    }

    if (!navigator.onLine) {
      await inPuffer();
      return;
    }
    try {
      await sendeCheckinBatch(datum, eintraege);
      setSpeichern('gespeichert');
      setTimeout(() => setSpeichern('idle'), 2000);
    } catch {
      await inPuffer();
    }
  }

  const zaehlung = { anwesend: 0, abwesend: 0, offen: 0 };
  for (const p of personen) {
    const s = auswahl[p.id];
    if (s === 'anwesend') zaehlung.anwesend++;
    else if (s === 'abwesend') zaehlung.abwesend++;
    else zaehlung.offen++;
  }

  return { personen, auswahl, setStatus, loading, speichern, speichernJetzt, zaehlung };
}
