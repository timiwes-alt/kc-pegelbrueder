# KC Pegelbrüder — Vereinsstatistiken

Webseite zur Verwaltung von Vereinsstatistiken des KC Pegelbrüder.  
Technologie: React + Vite + Supabase

---

## Einrichtung (einmalig, ~15 Minuten)

### 1. Supabase-Datenbank anlegen

1. Gehe auf [supabase.com](https://supabase.com) und erstelle ein kostenloses Konto
2. Erstelle ein neues Projekt (Namen frei wählen, Region: Central EU)
3. Öffne den **SQL-Editor** im Supabase-Dashboard
4. Kopiere den Inhalt von `schema.sql` und führe ihn aus → Tabellen werden angelegt

### 2. Credentials eintragen

1. Im Supabase-Dashboard: **Project Settings → API**
2. Kopiere `Project URL` und `anon public` Key
3. Erstelle eine Datei `.env` im Projektordner (Kopie von `.env.example`):

```
VITE_SUPABASE_URL=https://deinprojekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 3. App starten

```bash
npm install
npm run dev
```

Die Seite läuft dann unter `http://localhost:5173`

### 4. Deployment (optional, kostenlos)

Empfehlung: **Vercel** oder **Netlify**

```bash
npm run build
```

Den `dist/`-Ordner auf Vercel/Netlify deployen.  
Vergiss nicht, die Umgebungsvariablen (`VITE_SUPABASE_URL` etc.) auch dort einzutragen.

---

## Erste Schritte nach dem Start

1. **Verwaltung** → Kategorie „Strafen (€)" anlegen
2. **Mitglieder** → Alle 12 Mitglieder eintragen (mit Spitznamen)
3. **Eintragen** → Erste Strafen erfassen
4. **Rangliste** → Wer führt? 🏆

---

## Neue Statistik-Kategorie hinzufügen

Einfach unter **Verwaltung** eine neue Kategorie anlegen (z.B. „Neunen" mit Einheit „Mal").  
Sie erscheint sofort in der Rangliste — keine Code-Änderung nötig.

---

## Projektstruktur

```
src/
├── assets/          Bilder (Logo, Gruppenfoto)
├── components/      Nav-Komponente
├── lib/supabase.js  Datenbankzugriff (hier können neue Funktionen rein)
└── pages/
    ├── Home.jsx       Rangliste (Startseite)
    ├── Eintragen.jsx  Neue Einträge erfassen
    ├── Mitglieder.jsx Mitglieder verwalten
    └── Verwaltung.jsx Kategorien verwalten
```
