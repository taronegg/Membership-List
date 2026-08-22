import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createFakeSupabase } from './fakeSupabase';

// Abschnitt 13, Schritt 6 (Check-in inkl. Offline-Puffer) + Abschnitt 3
// ("Check-in muss lokal puffern ... harte Anforderung, keine Optimierung")
// + Abschnitt 7.5 ("Der Prototyp startet ohne Vorauswahl, damit niemand
// versehentlich alle als anwesend speichert").

const fixtures = {
  people: [
    { id: 'P001', vorname: 'Anna', nachname: 'Muster', status: { name: 'Member' } },
    { id: 'P002', vorname: 'Beat', nachname: 'Tester', status: { name: 'Besucher' } },
    // Ehemalig ist NICHT Teil der Check-in-Liste (5.5).
    { id: 'P003', vorname: 'Carla', nachname: 'Alt', status: { name: 'Ehemalig' } },
  ],
  attendance: [{ person_id: 'P001', datum: '2024-01-07', status: 'anwesend' }],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { useCheckin } = await import('../hooks/useCheckin');
const { outboxLesen, outboxEntfernen } = await import('../lib/offlineOutbox');

describe('useCheckin (7.5)', () => {
  beforeEach(async () => {
    fixtures.attendance = [{ person_id: 'P001', datum: '2024-01-07', status: 'anwesend' }];
    for (const batch of await outboxLesen()) await outboxEntfernen(batch.id);
  });

  it('lädt nur aktive Personen (5.5) und belegt vorhandene Anwesenheit vor, alles andere bleibt offen', async () => {
    const { result } = renderHook(() => useCheckin('2024-01-07'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.personen.map((p) => p.vorname)).toEqual(['Anna', 'Beat']);
    expect(result.current.auswahl['P001']).toBe('anwesend'); // vorbelegt aus bestehender Zeile
    expect(result.current.auswahl['P002']).toBeNull(); // keine Vorauswahl -- nicht "anwesend" per Default
    expect(result.current.zaehlung).toEqual({ anwesend: 1, abwesend: 0, offen: 1 });
  });

  it('speichert direkt, wenn online', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const { result } = renderHook(() => useCheckin('2024-02-04'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatus('P001', 'abwesend'));
    await act(async () => {
      await result.current.speichernJetzt();
    });

    expect(result.current.speichern).toBe('gespeichert');
    expect(fixtures.attendance).toContainEqual(
      expect.objectContaining({ person_id: 'P001', datum: '2024-02-04', status: 'abwesend' }),
    );
    expect(await outboxLesen()).toHaveLength(0);

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  it('puffert lokal statt zu speichern, wenn offline -- und wirft die Änderung nicht weg', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const vorherAttendanceLength = fixtures.attendance.length;
    const { result } = renderHook(() => useCheckin('2024-02-11'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatus('P002', 'anwesend'));
    await act(async () => {
      await result.current.speichernJetzt();
    });

    expect(result.current.speichern).toBe('offline');
    // Nichts wurde direkt in die "Datenbank" geschrieben...
    expect(fixtures.attendance).toHaveLength(vorherAttendanceLength);
    // ...aber die Änderung liegt jetzt im lokalen Puffer, bereit zum Nachsynchronisieren.
    const outbox = await outboxLesen();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].datum).toBe('2024-02-11');
    expect(outbox[0].eintraege).toContainEqual({ personId: 'P002', status: 'anwesend' });

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });
});
