import { useNavigation } from './nav/NavigationContext';
import { TabBar } from './components/TabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { PersonenListeScreen } from './screens/PersonenListeScreen';
import { PersonenDetailScreen } from './screens/PersonenDetailScreen';
import { PersonFormScreen } from './screens/PersonFormScreen';
import { ProfilTabScreen } from './screens/ProfilTabScreen';
import { AnwesenheitTabScreen } from './screens/AnwesenheitTabScreen';
import { KontakteTabScreen } from './screens/KontakteTabScreen';
import { KontaktFormScreen } from './screens/KontaktFormScreen';
import { EventFormScreen } from './screens/EventFormScreen';
import { UebersichtScreen } from './screens/UebersichtScreen';

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
      return screen.mode === 'neu' ? (
        <PersonFormScreen mode="neu" />
      ) : (
        <PersonFormScreen mode="bearbeiten" personId={screen.personId} />
      );
    case 'kontaktForm':
      return <KontaktFormScreen personId={screen.personId} />;
    case 'eventForm':
      return <EventFormScreen />;
  }
}

function TabScreen({ tab }: { tab: ReturnType<typeof useNavigation>['tab'] }) {
  switch (tab) {
    case 'uebersicht':
      return <UebersichtScreen />;
    case 'personen':
      return <PersonenListeScreen />;
    case 'anwesenheit':
      return <AnwesenheitTabScreen />;
    case 'kontakte':
      return <KontakteTabScreen />;
    case 'profil':
      return <ProfilTabScreen />;
  }
}
