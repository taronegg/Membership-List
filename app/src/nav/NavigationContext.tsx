import { createContext, useContext, useState, type ReactNode } from 'react';

// Abschnitt 6 (Navigation) + 8 (Interaktionen):
// "Tab-Wechsel setzt den Screen-Stack zurück (screen = null)."
// "Zurück-Chevron führt vom Detail auf den Tab, vom Formular auf das Detail."

export type Tab = 'uebersicht' | 'personen' | 'anwesenheit' | 'kontakte' | 'profil';

export type PersonSubTab = 'profil' | 'anwesenheit' | 'kontakte';

export type Screen =
  | { type: 'personDetail'; personId: string; subTab: PersonSubTab }
  | { type: 'personForm'; mode: 'neu' }
  | { type: 'personForm'; mode: 'bearbeiten'; personId: string }
  | { type: 'kontaktForm'; personId: string };

interface NavState {
  tab: Tab;
  stack: Screen[];
  setTab: (tab: Tab) => void;
  push: (screen: Screen) => void;
  pop: () => void;
  setPersonSubTab: (subTab: PersonSubTab) => void;
  /** 8: "Leiter-Zeile antippen: wechselt in die Personenliste und setzt den Zuständigkeits-Filter." */
  geheZuPersonenGefiltertNachLeiter: (leaderId: string) => void;
  /** Von der Personenliste einmalig konsumiert, danach zurückgesetzt (siehe oben). */
  pendingPersonenLeiterFilter: string | null;
  consumePendingPersonenLeiterFilter: () => void;
}

const NavigationContext = createContext<NavState | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('uebersicht');
  const [stack, setStack] = useState<Screen[]>([]);
  const [pendingPersonenLeiterFilter, setPendingPersonenLeiterFilter] = useState<string | null>(null);

  function setTab(next: Tab) {
    setTabState(next);
    setStack([]);
  }

  function push(screen: Screen) {
    setStack((s) => [...s, screen]);
  }

  function pop() {
    setStack((s) => s.slice(0, -1));
  }

  function setPersonSubTab(subTab: PersonSubTab) {
    setStack((s) => {
      const top = s[s.length - 1];
      if (!top || top.type !== 'personDetail') return s;
      return [...s.slice(0, -1), { ...top, subTab }];
    });
  }

  function geheZuPersonenGefiltertNachLeiter(leaderId: string) {
    setPendingPersonenLeiterFilter(leaderId);
    setTab('personen');
  }

  return (
    <NavigationContext.Provider
      value={{
        tab,
        stack,
        setTab,
        push,
        pop,
        setPersonSubTab,
        geheZuPersonenGefiltertNachLeiter,
        pendingPersonenLeiterFilter,
        consumePendingPersonenLeiterFilter: () => setPendingPersonenLeiterFilter(null),
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavState {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation muss innerhalb von <NavigationProvider> verwendet werden.');
  return ctx;
}
