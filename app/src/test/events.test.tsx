import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createFakeSupabase } from './fakeSupabase';

// Abschnitt 13, Schritt 9 (Events) + Abschnitt 12, Lücke 2 ("Event anlegen"
// -- Events waren im Prototyp nur lesbar).

const fixtures = {
  status_optionen: [{ id: 's-member', name: 'Member', sortierung: 1 }],
  bacenta_optionen: [],
  basonta_optionen: [],
  bildung_optionen: [],
  bildungsjahr_optionen: [],
  wie_entdeckt_optionen: [],
  kontaktart_optionen: [],
  gemeinde_einstellungen: [{ risiko_schwellwert: 3 }],
  leaders: [{ id: 'leader-1', name: 'Jenny' }],
  people: [
    {
      id: 'P001', vorname: 'Anna', nachname: 'Muster', zu_pruefen: false, geburtsdatum: null,
      status: { id: 's-member', name: 'Member', sortierung: 1 }, bacenta: null, basonta: null,
      zustaendig_leader: { id: 'leader-1', name: 'Jenny' },
    },
  ],
  attendance: [],
  event_sessions: [
    { id: 'ev1', name: 'Jugendtreff', datum: '2024-01-10', verantwortlich_leader: { id: 'leader-1', name: 'Jenny' },
      teilnehmer: [{ id: 'ea1', person_id: 'P001', rolle: 'Team', anwesend: true, notiz: 'gut', person: { vorname: 'Anna', nachname: 'Muster' } }] },
  ],
  event_attendance: [],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { NavigationProvider } = await import('../nav/NavigationContext');
const { AnwesenheitTabScreen } = await import('../screens/AnwesenheitTabScreen');
const { EventFormScreen } = await import('../screens/EventFormScreen');

describe('Events (7.5 + Lücke 12.2)', () => {
  it('listet Event-Sessions und klappt Teilnehmer beim Antippen auf', async () => {
    render(
      <NavigationProvider>
        <AnwesenheitTabScreen />
      </NavigationProvider>,
    );

    fireEvent.click(screen.getByText('Events'));
    expect(await screen.findByText('Jugendtreff')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();

    // Vor dem Aufklappen ist die Teilnehmerin nicht sichtbar.
    expect(screen.queryByText('Anna Muster')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Jugendtreff'));
    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('Team · Jenny · gut')).toBeInTheDocument();
    expect(screen.getByText('anwesend')).toBeInTheDocument();
  });

  it('Event anlegen schreibt eine neue Session inkl. Teilnehmerliste', async () => {
    render(
      <NavigationProvider>
        <EventFormScreen />
      </NavigationProvider>,
    );

    // Warten, bis useLookups() die Leiter geladen hat -- sonst hat das
    // <select> noch keine <option value="leader-1"> und die Auswahl greift nicht.
    await screen.findByText('Jenny');

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Frauenfrühstück' } });
    fireEvent.change(screen.getByLabelText('Verantwortlich *'), { target: { value: 'leader-1' } });

    const teilnehmerCheckbox = await screen.findByLabelText('Anna Muster');
    fireEvent.click(teilnehmerCheckbox);
    fireEvent.click(screen.getByLabelText('Anwesend'));

    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => expect((fixtures.event_sessions as unknown[]).length).toBe(2));
    const neueSession = (fixtures.event_sessions as unknown as { name: string; verantwortlich: string }[]).find(
      (s) => s.name === 'Frauenfrühstück',
    );
    expect(neueSession?.verantwortlich).toBe('leader-1');

    const teilnahme = (fixtures.event_attendance as unknown as { person_id: string; anwesend: boolean }[])[0];
    expect(teilnahme.person_id).toBe('P001');
    expect(teilnahme.anwesend).toBe(true);
  });
});
