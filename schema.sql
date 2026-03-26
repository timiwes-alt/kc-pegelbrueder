-- ============================================================
-- KC Pegelbrüder — Datenbankschema
-- Ausführen im Supabase SQL-Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Mitglieder ───────────────────────────────────────────────
CREATE TABLE mitglieder (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  spitzname  TEXT,
  ist_gast   BOOLEAN NOT NULL DEFAULT FALSE,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Statistik-Kategorien ─────────────────────────────────────
-- Erweiterbar: neue Kategorien einfach hinzufügen
CREATE TABLE statistik_kategorien (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  einheit      TEXT NOT NULL,        -- z.B. '€', 'Neunen', 'Punkte'
  beschreibung TEXT,
  reihenfolge  INT NOT NULL DEFAULT 99,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Statistik-Einträge ───────────────────────────────────────
CREATE TABLE statistik_eintraege (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mitglied_id  UUID NOT NULL REFERENCES mitglieder(id) ON DELETE CASCADE,
  kategorie_id UUID NOT NULL REFERENCES statistik_kategorien(id) ON DELETE CASCADE,
  wert         NUMERIC NOT NULL CHECK (wert >= 0),
  notiz        TEXT,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Ranglisten-Abfragen
CREATE INDEX idx_eintraege_kategorie ON statistik_eintraege(kategorie_id);
CREATE INDEX idx_eintraege_mitglied  ON statistik_eintraege(mitglied_id);

-- ── Row Level Security (optional, für spätere Authentifizierung)
ALTER TABLE mitglieder          ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistik_kategorien ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistik_eintraege  ENABLE ROW LEVEL SECURITY;

-- Erstmal öffentlich lesbar & schreibbar (für den Start ohne Login)
CREATE POLICY "Alle lesen"    ON mitglieder          FOR SELECT USING (true);
CREATE POLICY "Alle schreiben" ON mitglieder         FOR ALL    USING (true);
CREATE POLICY "Alle lesen"    ON statistik_kategorien FOR SELECT USING (true);
CREATE POLICY "Alle schreiben" ON statistik_kategorien FOR ALL  USING (true);
CREATE POLICY "Alle lesen"    ON statistik_eintraege  FOR SELECT USING (true);
CREATE POLICY "Alle schreiben" ON statistik_eintraege FOR ALL   USING (true);

-- ── Beispiel-Daten (optional, zum Testen) ───────────────────
-- Kommentiere diese Zeilen aus wenn du echte Daten nutzt

INSERT INTO statistik_kategorien (name, einheit, beschreibung, reihenfolge) VALUES
  ('Strafen', '€', 'Bezahlte Strafen in Euro', 1);

-- Mitglieder (Platzhalter, durch echte Namen ersetzen)
INSERT INTO mitglieder (name, spitzname) VALUES
  ('Max Mustermann', 'Maxi'),
  ('Klaus Herrmann', NULL),
  ('Tom Schneider', 'Schneiderzahn');
