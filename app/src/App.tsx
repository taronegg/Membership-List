import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';

function AuthedShell() {
  const { leader, error, signOut } = useAuth();

  if (error) {
    return (
      <div style={{ padding: 'var(--space-screen)', maxWidth: 480, margin: '0 auto' }}>
        <p style={{ color: 'var(--accent-darkest)' }}>{error}</p>
        <button onClick={() => void signOut()} style={{ marginTop: 12 }}>
          Abmelden
        </button>
      </div>
    );
  }

  if (!leader) return null;

  // Platzhalter -- die eigentliche Tab-Navigation (Abschnitt 6) und die
  // Screens (Abschnitt 7) folgen in den nächsten Schritten von Abschnitt 13.
  return (
    <div style={{ padding: 'var(--space-screen)' }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        Angemeldet als
      </p>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 20px' }}>
        {leader.name} ({leader.rolle === 'pfarrer' ? 'Pfarrer' : 'Leiter'})
      </h1>
      <button onClick={() => void signOut()}>Abmelden</button>
    </div>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;
  return <AuthedShell />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
