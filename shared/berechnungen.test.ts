import { describe, it, expect } from 'vitest';
import {
  attendanceOf,
  contactStatsOf,
  istAktiv,
  istRisikoKontakt,
  istFaellig,
  istBaldFaellig,
} from './berechnungen';

// Abschnitt 13, Schritt 5: "Schreibe hier Tests; abwesend_in_folge und die
// Behandlung nicht erfasster Sonntage sind die fehleranfälligsten Stellen der
// ganzen App." Diese Datei ist entsprechend am dichtesten bei attendanceOf.

describe('attendanceOf (5.1)', () => {
  it('zählt anwesend/abwesend/erfasst korrekt', () => {
    const stats = attendanceOf([
      { datum: '2024-01-07', status: 'anwesend' },
      { datum: '2024-01-14', status: 'abwesend' },
      { datum: '2024-01-21', status: 'anwesend' },
    ]);
    expect(stats.anwesend).toBe(2);
    expect(stats.abwesend).toBe(1);
    expect(stats.erfasst).toBe(3);
  });

  it('quote ist null bei 0 erfassten Sonntagen, nicht 0 -- UI zeigt "—"', () => {
    expect(attendanceOf([]).quote).toBeNull();
  });

  it('quote ist anwesend/erfasst', () => {
    const stats = attendanceOf([
      { datum: '2024-01-07', status: 'anwesend' },
      { datum: '2024-01-14', status: 'abwesend' },
      { datum: '2024-01-21', status: 'abwesend' },
      { datum: '2024-01-28', status: 'abwesend' },
    ]);
    expect(stats.quote).toBeCloseTo(0.25);
  });

  it('nicht erfasste Sonntage (keine Zeile) zählen nicht in erfasst/quote', () => {
    // Zwischen den beiden Zeilen liegt ein nicht erfasster Sonntag (01-14),
    // der schlicht keine Zeile hat -- erfasst bleibt bei 2, nicht 3.
    const stats = attendanceOf([
      { datum: '2024-01-07', status: 'anwesend' },
      { datum: '2024-01-21', status: 'anwesend' },
    ]);
    expect(stats.erfasst).toBe(2);
    expect(stats.quote).toBe(1);
  });

  describe('abwesendInFolge', () => {
    it('zählt aufeinanderfolgende abwesend am Ende der chronologischen Reihe', () => {
      const stats = attendanceOf([
        { datum: '2024-01-07', status: 'anwesend' },
        { datum: '2024-01-14', status: 'abwesend' },
        { datum: '2024-01-21', status: 'abwesend' },
        { datum: '2024-01-28', status: 'abwesend' },
      ]);
      expect(stats.abwesendInFolge).toBe(3);
    });

    it('bricht beim ersten anwesend ab (von hinten gezählt)', () => {
      const stats = attendanceOf([
        { datum: '2024-01-07', status: 'abwesend' },
        { datum: '2024-01-14', status: 'anwesend' },
        { datum: '2024-01-21', status: 'abwesend' },
        { datum: '2024-01-28', status: 'abwesend' },
      ]);
      expect(stats.abwesendInFolge).toBe(2);
    });

    it('ist 0, wenn der letzte erfasste Sonntag anwesend war', () => {
      const stats = attendanceOf([
        { datum: '2024-01-07', status: 'abwesend' },
        { datum: '2024-01-14', status: 'abwesend' },
        { datum: '2024-01-21', status: 'anwesend' },
      ]);
      expect(stats.abwesendInFolge).toBe(0);
    });

    it('ist unabhängig von der Eingabereihenfolge (sortiert selbst chronologisch)', () => {
      const stats = attendanceOf([
        { datum: '2024-01-28', status: 'abwesend' },
        { datum: '2024-01-07', status: 'anwesend' },
        { datum: '2024-01-21', status: 'abwesend' },
        { datum: '2024-01-14', status: 'abwesend' },
      ]);
      expect(stats.abwesendInFolge).toBe(3);
    });

    it('nicht erfasste Sonntage (fehlende Zeilen) unterbrechen die Serie NICHT', () => {
      // Zwischen 01-07 und 01-28 fehlen zwei Sonntage (01-14, 01-21) komplett
      // -- sie existieren nicht als Zeilen und dürfen die Serie nicht brechen.
      const mitLuecke = attendanceOf([
        { datum: '2024-01-07', status: 'abwesend' },
        { datum: '2024-01-28', status: 'abwesend' },
      ]);
      expect(mitLuecke.abwesendInFolge).toBe(2);

      // Zur Kontrolle: ohne Lücke, dieselben zwei abwesend-Zeilen direkt
      // aufeinanderfolgend, liefert dasselbe Ergebnis.
      const ohneLuecke = attendanceOf([
        { datum: '2024-01-07', status: 'abwesend' },
        { datum: '2024-01-14', status: 'abwesend' },
      ]);
      expect(ohneLuecke.abwesendInFolge).toBe(2);
    });

    it('ist 0 bei komplett leerer Eingabe', () => {
      expect(attendanceOf([]).abwesendInFolge).toBe(0);
    });
  });

  describe('letzteAnwesenheit', () => {
    it('ist das grösste Datum mit Status anwesend', () => {
      const stats = attendanceOf([
        { datum: '2024-01-07', status: 'anwesend' },
        { datum: '2024-01-21', status: 'abwesend' },
        { datum: '2024-01-14', status: 'anwesend' },
      ]);
      expect(stats.letzteAnwesenheit).toBe('2024-01-14');
    });

    it('ist null, wenn nie anwesend erfasst wurde', () => {
      const stats = attendanceOf([{ datum: '2024-01-07', status: 'abwesend' }]);
      expect(stats.letzteAnwesenheit).toBeNull();
    });
  });
});

describe('contactStatsOf (5.2)', () => {
  it('zählt alle Kontakte, auch die ohne Datum', () => {
    const stats = contactStatsOf([
      { datum: '2024-01-05', art: 'Besuch' },
      { datum: null, art: 'Telefonat' },
    ]);
    expect(stats.kontakteTotal).toBe(2);
  });

  it('ignoriert Einträge ohne Datum bei letzterKontakt/tageSeitKontakt', () => {
    const heute = new Date('2024-02-01T00:00:00Z');
    const stats = contactStatsOf(
      [
        { datum: '2024-01-05', art: 'Besuch' },
        { datum: null, art: 'Telefonat' },
      ],
      heute,
    );
    expect(stats.letzterKontakt).toBe('2024-01-05');
    expect(stats.tageSeitKontakt).toBe(27);
  });

  it('letzterKontakt/tageSeitKontakt sind null ohne jeglichen datierten Kontakt', () => {
    const stats = contactStatsOf([{ datum: null, art: 'Telefonat' }]);
    expect(stats.letzterKontakt).toBeNull();
    expect(stats.tageSeitKontakt).toBeNull();
  });

  it('letzterBesuch/letzteBeratung filtern nach Art und nehmen das jeweils grösste Datum', () => {
    const stats = contactStatsOf([
      { datum: '2024-01-05', art: 'Besuch' },
      { datum: '2024-01-20', art: 'Besuch' },
      { datum: '2024-01-10', art: 'Beratung / Seelsorge' },
      { datum: '2024-01-25', art: 'Telefonat' },
    ]);
    expect(stats.letzterBesuch).toBe('2024-01-20');
    expect(stats.letzteBeratung).toBe('2024-01-10');
  });

  it('letzterBesuch ist null ohne Kontakte der Art "Besuch"', () => {
    const stats = contactStatsOf([{ datum: '2024-01-05', art: 'Telefonat' }]);
    expect(stats.letzterBesuch).toBeNull();
  });
});

describe('istAktiv (5.5)', () => {
  it.each(['Member', 'Besucher', 'Erstbesucher', 'Kontakt'])('%s ist aktiv', (status) => {
    expect(istAktiv(status)).toBe(true);
  });

  it('Ehemalig ist nicht aktiv', () => {
    expect(istAktiv('Ehemalig')).toBe(false);
  });
});

describe('istRisikoKontakt (5.3)', () => {
  it('ist true ab Schwellwert (Standard 3) bei aktivem Status', () => {
    expect(istRisikoKontakt('Member', 3)).toBe(true);
    expect(istRisikoKontakt('Member', 5)).toBe(true);
  });

  it('ist false unterhalb des Schwellwerts', () => {
    expect(istRisikoKontakt('Member', 2)).toBe(false);
  });

  it('Ehemalig ist NIE Risiko-Kontakt, unabhängig von abwesendInFolge', () => {
    expect(istRisikoKontakt('Ehemalig', 10)).toBe(false);
  });

  it('Schwellwert ist pro Gemeinde konfigurierbar', () => {
    expect(istRisikoKontakt('Member', 4, 5)).toBe(false);
    expect(istRisikoKontakt('Member', 5, 5)).toBe(true);
  });
});

describe('istFaellig / istBaldFaellig (5.4)', () => {
  const heute = new Date('2024-02-01T00:00:00Z');

  it('fällig, wenn wiedervorlage <= heute und nicht erledigt', () => {
    expect(istFaellig('2024-01-15', null, heute)).toBe(true);
    expect(istFaellig('2024-02-01', null, heute)).toBe(true);
  });

  it('nicht fällig, wenn erledigt_am gesetzt ist (Lücke 12.1)', () => {
    expect(istFaellig('2024-01-15', '2024-01-20', heute)).toBe(false);
  });

  it('nicht fällig ohne wiedervorlage-Datum', () => {
    expect(istFaellig(null, null, heute)).toBe(false);
  });

  it('nicht fällig, wenn das Datum in der Zukunft liegt', () => {
    expect(istFaellig('2024-03-01', null, heute)).toBe(false);
  });

  it('bald fällig innerhalb der Vorlauffrist (Standard +10 Tage)', () => {
    expect(istBaldFaellig('2024-02-05', null, heute)).toBe(true);
    expect(istBaldFaellig('2024-02-11', null, heute)).toBe(true);
    expect(istBaldFaellig('2024-02-12', null, heute)).toBe(false);
  });

  it('bereits überfällige Einträge sind NICHT "bald fällig" (andere Chip-Farbe)', () => {
    expect(istBaldFaellig('2024-01-15', null, heute)).toBe(false);
  });

  it('erledigte Einträge sind nie bald fällig', () => {
    expect(istBaldFaellig('2024-02-05', '2024-01-20', heute)).toBe(false);
  });
});
