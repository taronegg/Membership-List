import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Bewusst ein harter Fehler beim Start, nicht ein stilles Weiterlaufen ohne
  // Datenbankverbindung -- siehe app/.env.example.
  throw new Error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlen. Siehe app/.env.example.',
  );
}

export const supabase = createClient(url, anonKey);
