import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createFakeSupabase } from './fakeSupabase';

// Abschnitt 7.4 (Person anlegen/bearbeiten) + Abschnitt 8 (Navigation nach dem Speichern).

const fixtures = {
  status_optionen: [
    { id: 's-member', name: 'Member', sortierung: 1 },
    { id: 's-besucher', name: 'Besucher', sortierung: 2 },
  ],
  bacenta_optionen: [{ id: 'b-home', name: '@home', sortierung: 1 }],
  basonta_optionen: [],
  bildung_optionen: [],
  bildungsjahr_optionen: [],
  wie_entdeckt_optionen: [],
  kontaktart_optionen: [],
  gemeinde_einstellungen: [{ risiko_schwellwert: 3 }],
  leaders: [
    { id: 'leader-1', name: 'Jenny' },
    { id: 'leader-2', name: 'Age' },
  ],
  people: [
    {
      id: 'P001', vorname: 'Anna', nachname: 'Muster', telefon: '+41783081703', geburtsdatum: '2000-05-10',
      adresse: 'Teststrasse 1', richtung: null, erstkontakt: null, notizen: 'Alte Notiz', zu_pruefen: true,
      status: { id: 's-member', name: 'Member', sortierung: 1 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 }, basonta: null, bildung: null, bildungsjahr: null, wie_entdeckt: null,
      zustaendig_leader: { id: 'leader-1', name: 'Jenny' }, besucher1_leader: null, besucher2_leader: null,
    },
  ],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { NavigationProvider, useNavigation } = await import('../nav/NavigationContext');
const { PersonFormScreen } = await import('../screens/PersonFormScreen');

function TabProbe() {
  const { tab } = useNavigation();
  return <span data-testid="tab-probe">{tab}</span>;
}

describe('PersonFormScreen (7.4)', () => {
  it('blockiert das Speichern ohne Pflichtfelder (Vorname/Nachname/Status/Zuständig)', async () => {
    render(
      <NavigationProvider>
        <PersonFormScreen mode="neu" />
      </NavigationProvider>,
    );
    await screen.findAllByText('Jenny');

    fireEvent.click(screen.getByText('Speichern'));

    expect(await screen.findByText('Vorname ist ein Pflichtfeld.')).toBeInTheDocument();
    expect(screen.getByText('Nachname ist ein Pflichtfeld.')).toBeInTheDocument();
    expect(screen.getByText('Status ist ein Pflichtfeld.')).toBeInTheDocument();
    expect(screen.getByText('Zuständige Person ist ein Pflichtfeld.')).toBeInTheDocument();
    expect(fixtures.people).toHaveLength(1); // nichts wurde geschrieben
  });

  it('legt eine neue Person an, normalisiert das Telefon (E.164) und springt zum Personen-Tab (8)', async () => {
    render(
      <NavigationProvider>
        <TabProbe />
        <PersonFormScreen mode="neu" />
      </NavigationProvider>,
    );
    await screen.findAllByText('Jenny');

    fireEvent.change(screen.getByLabelText('Vorname *'), { target: { value: 'Carla' } });
    fireEvent.change(screen.getByLabelText('Nachname *'), { target: { value: 'Kind' } });
    fireEvent.change(screen.getByLabelText('Status *'), { target: { value: 's-besucher' } });
    fireEvent.change(screen.getByLabelText('Zuständige Person *'), { target: { value: 'leader-2' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '0791234567' } });

    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => expect(fixtures.people).toHaveLength(2));
    const neu = fixtures.people.find((p) => p.vorname === 'Carla')!;
    expect(neu.nachname).toBe('Kind');
    expect(neu.zu_pruefen).toBe(true); // 7.4: Vorbelegung true bei Neuanlage
    expect((neu as unknown as { telefon: string }).telefon).toBe('+41791234567');
    expect((neu as unknown as { status_id: string }).status_id).toBe('s-besucher');
    expect((neu as unknown as { zustaendig: string }).zustaendig).toBe('leader-2');

    await waitFor(() => expect(screen.getByTestId('tab-probe').textContent).toBe('personen'));
  });

  it('bearbeiten: befüllt das Formular mit den bestehenden Werten und schreibt Änderungen zurück', async () => {
    render(
      <NavigationProvider>
        <PersonFormScreen mode="bearbeiten" personId="P001" />
      </NavigationProvider>,
    );

    // usePerson() lädt asynchron; das Formular befüllt sich erst, nachdem die
    // Daten da sind -- deshalb auf den tatsächlichen Wert warten, nicht nur
    // auf die Existenz des Felds (das existiert schon vorher, noch leer).
    await waitFor(() => expect((screen.getByLabelText('Vorname *') as HTMLInputElement).value).toBe('Anna'));
    expect((screen.getByLabelText('Nachname *') as HTMLInputElement).value).toBe('Muster');
    expect((screen.getByLabelText('Zu prüfen markieren') as HTMLInputElement).checked).toBe(true);

    fireEvent.change(screen.getByLabelText('Nachname *'), { target: { value: 'Musterfrau' } });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => expect(fixtures.people[0].nachname).toBe('Musterfrau'));
  });
});
