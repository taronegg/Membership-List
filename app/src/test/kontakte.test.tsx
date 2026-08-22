import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createFakeSupabase } from './fakeSupabase';

// Abschnitt 13, Schritt 7 (Kontakte + Wiedervorlage) + Abschnitt 5.4/12.1.

function tageAb(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const fixtures = {
  contacts: [
    {
      id: 'c-ueberfaellig',
      person_id: 'P001',
      datum: tageAb(-20),
      notiz: 'Längst überfällig',
      naechster_schritt: null,
      wiedervorlage: tageAb(-5),
      erledigt_am: null,
      verantwortlich_leader: { id: 'leader-1', name: 'Jenny' },
      art: { id: 'k-besuch', name: 'Besuch', sortierung: 1 },
      person: { vorname: 'Anna', nachname: 'Muster' },
    },
    {
      id: 'c-erledigt',
      person_id: 'P002',
      datum: tageAb(-30),
      notiz: 'Schon erledigt',
      naechster_schritt: null,
      // wiedervorlage liegt in der Vergangenheit, ABER erledigt_am ist gesetzt (12.1) --
      // darf NICHT in "Fällig" auftauchen.
      wiedervorlage: tageAb(-10),
      erledigt_am: tageAb(-9),
      verantwortlich_leader: { id: 'leader-2', name: 'Age' },
      art: { id: 'k-tel', name: 'Telefonat', sortierung: 3 },
      person: { vorname: 'Beat', nachname: 'Tester' },
    },
    {
      id: 'c-offener-schritt',
      person_id: 'P002',
      datum: tageAb(-2),
      notiz: 'Noch was zu tun',
      naechster_schritt: 'Nochmals anrufen',
      wiedervorlage: null,
      erledigt_am: null,
      verantwortlich_leader: { id: 'leader-2', name: 'Age' },
      art: { id: 'k-tel', name: 'Telefonat', sortierung: 3 },
      person: { vorname: 'Beat', nachname: 'Tester' },
    },
  ],
};

vi.mock('../lib/supabaseClient', () => ({ supabase: createFakeSupabase(fixtures) }));

const { KontakteTabScreen } = await import('../screens/KontakteTabScreen');
const { NavigationProvider } = await import('../nav/NavigationContext');

function withProviders(children: ReactNode) {
  return <NavigationProvider>{children}</NavigationProvider>;
}

describe('KontakteTabScreen (7.6)', () => {
  it('zeigt im Sub-Tab "Fällig" nur überfällige, nicht erledigte Einträge', async () => {
    render(withProviders(<KontakteTabScreen />));

    expect(await screen.findByText('Anna Muster')).toBeInTheDocument();
    expect(screen.queryByText('Beat Tester')).not.toBeInTheDocument();
    expect(screen.getByText('1 Einträge')).toBeInTheDocument();
    expect(screen.getByText('Überfällig')).toBeInTheDocument();
  });

  it('zeigt im Sub-Tab "Offene Schritte" nur Einträge mit naechsterSchritt', async () => {
    render(withProviders(<KontakteTabScreen />));
    await screen.findByText('Anna Muster');

    fireEvent.click(screen.getByText('Offene Schritte'));
    expect(await screen.findByText('Beat Tester')).toBeInTheDocument();
    expect(screen.queryByText('Anna Muster')).not.toBeInTheDocument();
    expect(screen.getByText('Nochmals anrufen', { exact: false })).toBeInTheDocument();
  });

  it('zeigt im Sub-Tab "Alle" alle drei Einträge', async () => {
    render(withProviders(<KontakteTabScreen />));
    await screen.findByText('Anna Muster');

    fireEvent.click(screen.getByText('Alle'));
    await waitFor(() => expect(screen.getByText('3 Einträge')).toBeInTheDocument());
    expect(screen.getByText('Anna Muster')).toBeInTheDocument();
    expect(screen.getAllByText('Beat Tester')).toHaveLength(2);
  });

  it('"Erledigt" markiert die Wiedervorlage und der Eintrag verschwindet aus "Fällig" (Lücke 12.1)', async () => {
    render(withProviders(<KontakteTabScreen />));
    await screen.findByText('Anna Muster');

    fireEvent.click(screen.getByText('Erledigt'));

    await waitFor(() => expect(screen.queryByText('Anna Muster')).not.toBeInTheDocument());
    expect(screen.getByText('0 Einträge')).toBeInTheDocument();
    expect(fixtures.contacts.find((c) => c.id === 'c-ueberfaellig')?.erledigt_am).toBe(tageAb(0));
  });
});
