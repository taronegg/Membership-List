import { Home, Users, CalendarCheck, MessageSquare, User } from 'lucide-react';
import { useNavigation, type Tab } from '../nav/NavigationContext';

// Abschnitt 6: Fünf Tabs unten, Tab-Bar 2px Oberkante,
// padding-bottom: 20px für die Home-Indicator-Zone.

const TABS: { tab: Tab; label: string; Icon: typeof Home }[] = [
  { tab: 'uebersicht', label: 'Übersicht', Icon: Home },
  { tab: 'personen', label: 'Personen', Icon: Users },
  { tab: 'anwesenheit', label: 'Anwesenheit', Icon: CalendarCheck },
  { tab: 'kontakte', label: 'Kontakte', Icon: MessageSquare },
  { tab: 'profil', label: 'Profil', Icon: User },
];

export function TabBar() {
  const { tab, setTab } = useNavigation();

  return (
    <nav
      style={{
        display: 'flex',
        borderTop: '2px solid var(--divider)',
        background: 'var(--bg)',
        paddingBottom: 20,
        flexShrink: 0,
      }}
    >
      {TABS.map(({ tab: t, label, Icon }) => {
        const active = t === tab;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              minHeight: 44,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingTop: 8,
              background: 'transparent',
              border: 'none',
              color: active ? 'var(--text)' : 'var(--text-tertiary)',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
