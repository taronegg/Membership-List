import { supabase } from './supabaseClient';

/**
 * Abschnitt 12, Lücke 1: "Es gibt kein 'erledigt'. ... Vorschlag: erledigt_am
 * auf contacts, und die Fällig-Liste filtert darauf." Genau das setzt diese
 * Funktion um.
 */
export async function markiereWiedervorlageErledigt(contactId: string): Promise<void> {
  const heute = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('contacts').update({ erledigt_am: heute }).eq('id', contactId);
  if (error) throw error;
}
