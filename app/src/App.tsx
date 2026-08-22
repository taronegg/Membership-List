import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';
import { NavigationProvider } from './nav/NavigationContext';
import { AppShell } from './AppShell';

function Gate() {
  const { session, leader, loading, error, signOut } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;

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

  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
