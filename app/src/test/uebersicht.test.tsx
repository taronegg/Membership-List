import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { createFakeSupabase } from './fakeSupabase';

// Abschnitt 13, Schritt 8 (Übersicht) -- prüft, dass die Aggregation über
// Personen/Kontakte/Anwesenheit korrekt zusammengeführt wird, inkl. der
// Ehemalig-Ausnahme bei Risiko (5.3) und der Leiter-Zeile-Navigation (8).

function diesenMonatTag(tag: number): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
}
function vor(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() - tage);
  return d.toISOString().slice(0, 10);
}

const fixtures = {
  session: { user: { id: 'auth-1' } },
  leaders: [
    { id: 'leader-1', name: 'Jenny', email: 'jenny@example.org', rolle: 'pfarrer', auth_user_id: 'auth-1' },
    { id: 'leader-2', name: 'Age', email: 'age@example.org', rolle: 'leiter', auth_user_id: null },
  ],
  status_optionen: [
    { id: 's-member', name: 'Member', sortierung: 1 },
    { id: 's-erst', name: 'Erstbesucher', sortierung: 2 },
    { id: 's-ehemalig', name: 'Ehemalig', sortierung: 3 },
  ],
  bacenta_optionen: [{ id: 'b-home', name: '@home', sortierung: 1 }],
  basonta_optionen: [],
  bildung_optionen: [],
  bildungsjahr_optionen: [],
  wie_entdeckt_optionen: [],
  kontaktart_optionen: [{ id: 'k-besuch', name: 'Besuch', sortierung: 1 }],
  gemeinde_einstellungen: [{ risiko_schwellwert: 3 }],
  people: [
    {
      id: 'P001', vorname: 'Anna', nachname: 'Muster', zu_pruefen: false, geburtsdatum: null,
      status: { id: 's-member', name: 'Member', sortierung: 1 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 }, basonta: null,
      zustaendig_leader: { id: 'leader-1', name: 'Jenny' },
    },
    {
      // Ehemalig mit langer Abwesenheits-Serie -- darf trotzdem NIE als Risiko zählen (5.3).
      id: 'P002', vorname: 'Beat', nachname: 'Tester', zu_pruefen: false, geburtsdatum: null,
      status: { id: 's-ehemalig', name: 'Ehemalig', sortierung: 3 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 }, basonta: null,
      zustaendig_leader: { id: 'leader-2', name: 'Age' },
    },
    {
      id: 'P003', vorname: 'Carla', nachname: 'Kind', zu_pruefen: false, geburtsdatum: diesenMonatTag(15),
      status: { id: 's-member', name: 'Member', sortierung: 1 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 }, basonta: null,
      zustaendig_leader: { id: 'leader-2', name: 'Age' },
    },
    {
      id: 'P004', vorname: 'Dora', nachname: 'Neu', zu_pruefen: true, geburtsdatum: null,
      status: { id: 's-erst', name: 'Erstbesucher', sortierung: 2 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 }, basonta: null,
      zustaendig_leader: { id: 'leader-1', name: 'Jenny' },
    },
  ],
  attendance: [
    { person_id: 'P001', datum: vor(21), status: 'abwesend' },
    { person_id: 'P001', datum: vor(14), status: 'abwesend' },
    { person_id: 'P001', datum: vor(7), status: 'abwesend' },
    { person_id: 'P002', datum: vor(21), status: 'abwesend' },
    { person_id: 'P002', datum: vor(14), status: 'abwesend' },
    { person_id: 'P002', datum: vor(7), status: 'abwesend' },
  ],
  contacts: [
    {
      id: 'c1', person_id: 'P004', datum: vor(10), notiz: 'Erstkontakt-Nachfassen', naechster_schritt: null,
      wiedervorlage: vor(1), erledigt_am: null,
      verantwortlich_leader: { id: 'leader-1', name: 'Jenny' },
      art: { id: 'k-besuch', name: 'Besuch', sortierung: 1 }, person: { vorname: 'Dora', nachname: 'Neu' },
    },
  ],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { AuthProvider } = await import('../auth/AuthContext');
const { NavigationProvider } = await import('../nav/NavigationContext');
const { AppShell } = await import('../AppShell');

describe('UebersichtScreen (7.1)', () => {
  it('aggregiert Kennzahlen, Risiko- und Wiedervorlage-Listen korrekt', async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </AuthProvider>,
    );

    expect(await screen.findByText('Guten Tag, Jenny')).toBeInTheDocument();

    // Kennzahlen-Raster (Kennzahl-Label "Personen" kommt auch in der Tab-Bar
    // vor -- das erste Vorkommen im Dokument ist die Kennzahl-Zelle).
    expect(screen.getAllByText('Personen')[0].nextSibling?.textContent).toBe('4');
    expect(screen.getByText('Risiko').nextSibling?.textContent).toBe('1');
    expect(screen.getByText('Wiedervorlage').nextSibling?.textContent).toBe('1');
    expect(screen.getByText('Zu prüfen').nextSibling?.textContent).toBe('1');
    expect(screen.getByText('Erstbesucher').nextSibling?.textContent).toBe('1');

    // Risiko-Kontakte: nur Anna (Member), NICHT Beat (Ehemalig, obwohl gleiche Serie).
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText('3× WEG')).toBeInTheDocument();
    expect(screen.queryByText('Beat Tester')).not.toBeInTheDocument();

    // Wiedervorlage fällig: Dora Neu.
    expect(screen.getByText('Dora Neu')).toBeInTheDocument();

    // Geburtstage im Monat: Carla.
    expect(screen.getByText('Carla Kind')).toBeInTheDocument();
    expect(screen.getByText('wird', { exact: false })).toBeInTheDocument();

    // Leiter-Übersicht (nur Pfarrer): Jenny hat 2 Personen (Anna + Dora), 1 davon Risiko.
    const jennyZeile = screen.getByText('Jenny').closest('button')!;
    expect(within(jennyZeile).getByText(/2 Personen/)).toBeInTheDocument();
    expect(within(jennyZeile).getByText('1 Risiko')).toBeInTheDocument();
  });

  it('Leiter-Zeile antippen wechselt zur Personenliste, gefiltert auf diesen Leiter (8)', async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <AppShell />
        </NavigationProvider>
      </AuthProvider>,
    );

    await screen.findByText('Guten Tag, Jenny');
    fireEvent.click(screen.getByText('Jenny'));

    await waitFor(() => expect(screen.getByText('2 von 4 Personen')).toBeInTheDocument());
    expect(screen.getByText('Dora Neu')).toBeInTheDocument();
    expect(screen.queryByText('Beat Tester')).not.toBeInTheDocument();
  });
});
