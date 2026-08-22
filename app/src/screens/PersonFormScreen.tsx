import { Header } from '../components/Header';
import { useNavigation } from '../nav/NavigationContext';

// Abschnitt 7.4 (Person anlegen/bearbeiten) ist in Abschnitt 13 kein eigener
// nummerierter Schritt -- diese Platzhalter-Seite hält die Navigation aus der
// Personenliste (7.2, "+"-Icon) und dem Personen-Detail (7.3, Stift-Icon)
// funktionsfähig, bis das Formular gebaut wird.

export function PersonFormScreen({ mode }: { mode: 'neu' | 'bearbeiten' }) {
  const { pop } = useNavigation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={mode === 'neu' ? 'Neue Person' : 'Person bearbeiten'} onBack={pop} />
      <p style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 13 }}>
        Das Formular aus Abschnitt 7.4 ist noch nicht gebaut.
      </p>
    </div>
  );
}
