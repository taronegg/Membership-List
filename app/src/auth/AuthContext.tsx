import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { AngemeldeterLeiter } from '../lib/types';

// Abschnitt 3 + 7.7: Die Rolle ergibt sich aus dem Login und ist in der App
// nicht umschaltbar -- der Rollen-Umschalter im Prototyp war ein reines
// Demo-Werkzeug (7.7, "Achtung").

interface AuthState {
  session: Session | null;
  leader: AngemeldeterLeiter | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [leader, setLeader] = useState<AngemeldeterLeiter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setLeader(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('leaders')
      .select('id, name, email, rolle')
      .eq('auth_user_id', session.user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError || !data) {
          setError(
            'Kein Leiter-Konto für diesen Login gefunden. Bitte die Gemeindeleitung kontaktieren, ' +
              'damit leaders.auth_user_id gesetzt wird (siehe supabase/README.md).',
          );
          setLeader(null);
        } else {
          setError(null);
          setLeader(data as AngemeldeterLeiter);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    return signInError ? signInError.message : null;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, leader, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  return ctx;
}
