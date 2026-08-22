import { useNavigation } from './nav/NavigationContext';
import { TabBar } from './components/TabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { PersonenListeScreen } from './screens/PersonenListeScreen';
import { PersonenDetailScreen } from './screens/PersonenDetailScreen';
import { PersonFormScreen } from './screens/PersonFormScreen';
import { ProfilTabScreen } from './screens/ProfilTabScreen';
import { AnwesenheitTabScreen } from './screens/AnwesenheitTabScreen';
import { PlatzhalterTabScreen } from './screens/PlatzhalterTabScreen';

// Abschnitt 6 (Navigation): Tab-Inhalt oder, wenn der Screen-Stack nicht leer
// ist, der oberste Detail-/Formular-Screen -- der die Tab-Bar ersetzt (8:
// "Tab-Wechsel setzt den Screen-Stack zurück").

export function AppShell() {
  const { tab, stack } = useNavigation();
  const top = stack[stack.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      <OfflineBanner />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {top ? <StackScreen screen={top} /> : <TabScreen tab={tab} />}
      </div>
      {!top && <TabBar />}
    </div>
  );
}

function StackScreen({ screen }: { screen: NonNullable<ReturnType<typeof useNavigation>['stack'][number]> }) {
  switch (screen.type) {
    case 'personDetail':
      return <PersonenDetailScreen personId={screen.personId} subTab={screen.subTab} />;
    case 'personForm':
      return <PersonFormScreen mode={screen.mode} />;
    case 'kontaktForm':
      return (
        <PlatzhalterTabScreen
          titel="Kontakt erfassen"
          hinweis="Folgt in Abschnitt 13, Schritt 7 (Kontakte + Wiedervorlage)."
        />
      );
  }
}

function TabScreen({ tab }: { tab: ReturnType<typeof useNavigation>['tab'] }) {
  switch (tab) {
    case 'uebersicht':
      return <PlatzhalterTabScreen titel="Übersicht" hinweis="Folgt in Abschnitt 13, Schritt 8 (aggregiert alles Vorherige)." />;
    case 'personen':
      return <PersonenListeScreen />;
    case 'anwesenheit':
      return <AnwesenheitTabScreen />;
    case 'kontakte':
      return <PlatzhalterTabScreen titel="Kontakte" hinweis="Folgt in Abschnitt 13, Schritt 7 (Kontakte + Wiedervorlage)." />;
    case 'profil':
      return <ProfilTabScreen />;
  }
}
