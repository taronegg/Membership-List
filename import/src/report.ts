// Fehlerbericht des Imports. Abschnitt 10, Schritt 4: "Nicht auflösbare Namen
// in einen Fehlerbericht schreiben, nicht stillschweigend verwerfen."

export interface ImportFehler {
  schritt: string;
  zeile: number | null;
  meldung: string;
}

export class ImportReport {
  fehler: ImportFehler[] = [];
  hinweise: string[] = [];

  fehlerMelden(schritt: string, zeile: number | null, meldung: string): void {
    this.fehler.push({ schritt, zeile, meldung });
  }

  hinweisMelden(text: string): void {
    this.hinweise.push(text);
  }

  get hatFehler(): boolean {
    return this.fehler.length > 0;
  }

  print(): void {
    if (this.hinweise.length > 0) {
      console.log(`\n${this.hinweise.length} Hinweis(e):`);
      for (const h of this.hinweise) console.log(`  - ${h}`);
    }
    if (this.fehler.length > 0) {
      console.log(`\n${this.fehler.length} Fehler:`);
      for (const f of this.fehler) {
        console.log(`  [${f.schritt}]${f.zeile ? ` Zeile ${f.zeile}:` : ''} ${f.meldung}`);
      }
    } else {
      console.log('\nKeine Fehler.');
    }
  }
}
