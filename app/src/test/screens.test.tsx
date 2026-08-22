import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createFakeSupabase } from './fakeSupabase';

// Komponenten-Tests für die Kern-Screens aus Abschnitt 13, Schritt 4
// (Personenliste + Personen-Detail, Sub-Tab "Profil"), gegen einen Fake-
// Supabase-Client statt eines echten Projekts (siehe fakeSupabase.ts).

const fixtures = {
  session: { user: { id: 'auth-1' } },
  leaders: [
    { id: 'leader-1', name: 'Jenny', email: 'jenny@example.org', rolle: 'leiter', auth_user_id: 'auth-1' },
    { id: 'leader-2', name: 'Age', email: 'age@example.org', rolle: 'leiter', auth_user_id: null },
  ],
  status_optionen: [
    { id: 's-member', name: 'Member', sortierung: 1 },
    { id: 's-besucher', name: 'Besucher', sortierung: 2 },
  ],
  bacenta_optionen: [{ id: 'b-home', name: '@home', sortierung: 1 }],
  basonta_optionen: [],
  bildung_optionen: [],
  bildungsjahr_optionen: [],
  wie_entdeckt_optionen: [],
  kontaktart_optionen: [{ id: 'k-besuch', name: 'Besuch', sortierung: 1 }],
  people: [
    {
      id: 'P001',
      vorname: 'Anna',
      nachname: 'Muster',
      telefon: '+41783081703',
      geburtsdatum: '2000-05-10',
      adresse: 'Teststrasse 1',
      richtung: null,
      erstkontakt: null,
      notizen: 'Eine Testnotiz.',
      zu_pruefen: true,
      status: { id: 's-member', name: 'Member', sortierung: 1 },
      bacenta: { id: 'b-home', name: '@home', sortierung: 1 },
      basonta: null,
      bildung: null,
      bildungsjahr: null,
      wie_entdeckt: null,
      zustaendig_leader: { id: 'leader-1', name: 'Jenny' },
      besucher1_leader: null,
      besucher2_leader: null,
    },
  ],
  attendance: [
    { person_id: 'P001', datum: '2024-01-07', status: 'anwesend' },
    { person_id: 'P001', datum: '2024-01-14', status: 'abwesend' },
  ],
  contacts: [{ person_id: 'P001', datum: '2024-01-05', art: { name: 'Besuch' } }],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { AuthProvider } = await import('../auth/AuthContext');
const { NavigationProvider } = await import('../nav/NavigationContext');
const { PersonenListeScreen } = await import('../screens/PersonenListeScreen');
const { PersonenDetailScreen } = await import('../screens/PersonenDetailScreen');

function withProviders(children: ReactNode) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}

describe('PersonenListeScreen (7.2)', () => {
  it('zeigt die Person mit Meta-Zeile, Status-Chip und Warndreieck (zu_pruefen)', async () => {
    render(withProviders(<PersonenListeScreen />));

    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getByText(/@home · Jenny · 50%/)).toBeInTheDocument();
    expect(screen.getAllByText('Member').length).toBeGreaterThan(0);
    expect(screen.getByText('1 von 1 Personen')).toBeInTheDocument();
  });

  it('filtert per Suche auf Name/Bacenta/Basonta', async () => {
    render(withProviders(<PersonenListeScreen />));
    await screen.findByText('Anna Muster');

    fireEvent.change(screen.getByPlaceholderText(/Suche nach Name/), { target: { value: 'zzz-nichts' } });
    expect(screen.getByText('Keine Personen gefunden.')).toBeInTheDocument();
    expect(screen.getByText('0 von 1 Personen')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Suche nach Name/), { target: { value: 'home' } });
    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();
  });
});

describe('PersonenDetailScreen, Sub-Tab Profil (7.3)', () => {
  it('zeigt Stammdaten, abgeleitete Kontaktkennzahlen und den Zu-prüfen-Banner', async () => {
    render(withProviders(<PersonenDetailScreen personId="P001" subTab="profil" />));

    expect(await screen.findByRole('heading', { level: 2, name: 'Anna Muster' })).toBeInTheDocument();
    expect(screen.getByText('Zu prüfen — Angaben unvollständig oder unbestätigt')).toBeInTheDocument();

    // Telefon-Anzeigeformatierung (4.1: "beim Import auf E.164 normalisieren, formatiert anzeigen").
    expect(screen.getByText('+41 78 308 17 03')).toBeInTheDocument();

    // Abgeleitete Kontaktkennzahlen (5.2) aus der contacts-Fixture, nicht editierbar angezeigt.
    expect(screen.getByText('1')).toBeInTheDocument(); // Kontakte total
    expect(screen.getByText('Eine Testnotiz.')).toBeInTheDocument();
  });
});
