// Abschnitt 3: "Die Anwesenheitserfassung passiert im Gottesdienst, wo WLAN
// oft fehlt. Check-in muss lokal puffern und später synchronisieren. Das ist
// eine harte Anforderung, keine Optimierung." Diese Datei ist der lokale
// Puffer: ein IndexedDB-Store, in den ein Speicherversuch geschrieben wird,
// wenn er nicht sofort an Supabase geht -- unabhängig davon, ob das am
// tatsächlichen Netzstatus liegt oder an einem fehlgeschlagenen Request.

const DB_NAME = 'kirchen-app';
const STORE = 'checkin-outbox';
const DB_VERSION = 1;

export interface CheckinEintrag {
  personId: string;
  status: 'anwesend' | 'abwesend' | null; // null = zurück auf "nicht erfasst" (Zeile löschen)
  grund?: string | null;
}

export interface CheckinBatch {
  id: number;
  datum: string; // ISO, der Sonntag
  eintraege: CheckinEintrag[];
  erstelltAm: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function outboxHinzufuegen(datum: string, eintraege: CheckinEintrag[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ datum, eintraege, erstelltAm: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function outboxLesen(): Promise<CheckinBatch[]> {
  const db = await openDb();
  const result = await new Promise<CheckinBatch[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as CheckinBatch[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function outboxEntfernen(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
