import { GoogleGenerativeAI } from '@google/generative-ai'

const SCHWELLEN = {
  '€': [10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000],
  default: [10, 25, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000],
}

function fmt(v, einheit) {
  return einheit === '€' ? `${Number(v).toFixed(2)} €` : `${Math.round(v)}`
}

function berechneMvpScores(saisonRankings) {
  const scores = {}
  for (const [, { einheit, rangliste }] of Object.entries(saisonRankings)) {
    const n = rangliste.length
    if (n === 0) continue
    rangliste.forEach((m, i) => {
      if (!scores[m.name]) scores[m.name] = { total: 0, count: 0 }
      // Für €: niedrigster Wert = bestes Ergebnis (höchster Index in desc-Liste = bester Score)
      // Für andere: höchster Wert = bestes Ergebnis (niedrigster Index = bester Score)
      const score = einheit === '€'
        ? i / Math.max(1, n - 1)
        : (n - 1 - i) / Math.max(1, n - 1)
      scores[m.name].total += score
      scores[m.name].count++
    })
  }
  return Object.entries(scores)
    .map(([name, { total, count }]) => ({ name, avgScore: total / Math.max(1, count) }))
    .sort((a, b) => b.avgScore - a.avgScore)
}

export async function generiereAbendHighlights(_kegelabendId, datum, statistiken, historischeDaten, kategorien = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey === 'DEIN-API-KEY') throw new Error('Kein API Key konfiguriert')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Aggregiere Stats dieses Abends
  const perMitglied = {}
  for (const e of statistiken) {
    const name = e.mitglieder.spitzname || e.mitglieder.name
    const kat = e.statistik_kategorien.name
    const einheit = e.statistik_kategorien.einheit
    if (!perMitglied[name]) perMitglied[name] = {}
    if (!perMitglied[name][kat]) perMitglied[name][kat] = { wert: 0, einheit }
    perMitglied[name][kat].wert += Number(e.wert)
  }

  const datumFormatiert = new Date(datum).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const teilnehmer = Object.keys(perMitglied).join(', ')

  let statsText = ''
  for (const [name, kats] of Object.entries(perMitglied)) {
    statsText += `  ${name}: ${Object.entries(kats).map(([k, { wert, einheit }]) => `${k}: ${wert} ${einheit}`).join(', ')}\n`
  }

  let historischText = ''

  // Gruppen-Gesamtwerte heute (Summe aller Mitglieder pro Kategorie)
  const gruppeHeute = {}
  for (const [, kats] of Object.entries(perMitglied)) {
    for (const [kat, { wert, einheit }] of Object.entries(kats)) {
      if (!gruppeHeute[kat]) gruppeHeute[kat] = { summe: 0, einheit }
      gruppeHeute[kat].summe += wert
    }
  }

  if (historischeDaten) {
    const { anzahlAbende, gesamtRankings, rekorde, anwesenheit, einzelAbendRekorde, abendVerlauf, korrelationen, saison, vorSaison } = historischeDaten

    // Meilensteine
    const meilensteine = []
    for (const [name, kats] of Object.entries(perMitglied)) {
      for (const [kat, { wert, einheit }] of Object.entries(kats)) {
        const gesamtNach = gesamtRankings[kat]?.rangliste.find(m => m.name === name)?.gesamt
        if (gesamtNach === undefined) continue
        const gesamtVor = gesamtNach - wert
        for (const t of (SCHWELLEN[einheit] ?? SCHWELLEN.default)) {
          if (gesamtVor < t && gesamtNach >= t) {
            const bereitsUeber = (gesamtRankings[kat]?.rangliste ?? [])
              .filter(m => m.name !== name && (m.gesamt - (perMitglied[m.name]?.[kat]?.wert ?? 0)) >= t)
            const kontext = bereitsUeber.length === 0
              ? '(als erster Spieler überhaupt!)'
              : `(${bereitsUeber.map(m => m.name).join(', ')} ha${bereitsUeber.length === 1 ? 't' : 'ben'} diese Marke bereits zuvor überschritten)`
            meilensteine.push(`${name} hat in "${kat}" die ${fmt(t, einheit)}-Marke geknackt ${kontext} (Gesamt: ${fmt(gesamtNach, einheit)})`)
          }
        }
      }
    }

    // Persönliche Bestleistungen
    const bestleistungen = []
    for (const [name, kats] of Object.entries(perMitglied)) {
      for (const [kat, { wert, einheit }] of Object.entries(kats)) {
        const bisherigMax = einzelAbendRekorde[kat]?.perPerson[name]
        const allTimeMax = einzelAbendRekorde[kat]?.allTimeMax
        if (bisherigMax !== undefined && wert >= bisherigMax) {
          if (allTimeMax?.name === name && wert >= allTimeMax.wert) {
            bestleistungen.push(`${name}: neuer All-Time-Einzelabend-Rekord in "${kat}": ${fmt(wert, einheit)}`)
          } else {
            bestleistungen.push(`${name}: persönliche Bestleistung an einem Abend in "${kat}": ${fmt(wert, einheit)}`)
          }
        }
      }
    }

    // Ranglistenveränderungen
    const aenderungen = []
    for (const [kat, { rangliste }] of Object.entries(gesamtRankings)) {
      const vorher = rangliste
        .map(m => ({ ...m, gesamt: m.gesamt - (perMitglied[m.name]?.[kat]?.wert ?? 0) }))
        .sort((a, b) => b.gesamt - a.gesamt)
      rangliste.forEach((m, i) => {
        const vi = vorher.findIndex(v => v.name === m.name)
        if (vi !== -1 && vi !== i) {
          aenderungen.push(`${m.name} in "${kat}": Platz ${vi + 1} → Platz ${i + 1} (${i < vi ? 'aufgestiegen' : 'abgestiegen'})`)
        }
      })
    }

    // Saison-über-Saison-Vergleich
    const saisonVergleiche = []
    if (saison.anzahlAbende > 0 && vorSaison.anzahlAbende > 0) {
      for (const [kat, { einheit, rangliste }] of Object.entries(saison.rankings)) {
        for (const { name, schnitt: neu, anzahlAbende: ab } of rangliste) {
          const prev = vorSaison.rankings[kat]?.rangliste.find(m => m.name === name)
          if (!prev || prev.anzahlAbende < 2 || ab < 2) continue
          const delta = (neu - prev.schnitt) / prev.schnitt
          if (Math.abs(delta) >= 0.25) {
            saisonVergleiche.push(
              `${name} in "${kat}": Ø ${fmt(neu, einheit)}/Abend diese Saison vs. ${fmt(prev.schnitt, einheit)}/Abend letzte Saison (${Math.round(Math.abs(delta) * 100)}% ${delta > 0 ? 'mehr' : 'weniger'})`
            )
          }
        }
      }
    }

    historischText += `\n--- KONTEXT (${anzahlAbende} Abende gesamt) ---\n`

    // Gruppen-Gesamtwerte heute + Verlauf
    if (Object.keys(gruppeHeute).length > 0) {
      historischText += '\nGruppen-Gesamtwerte heute (alle Mitglieder zusammen):\n'
      for (const [kat, { summe, einheit }] of Object.entries(gruppeHeute)) {
        historischText += `  ${kat}: ${fmt(summe, einheit)}`
        const verlauf = abendVerlauf?.[kat]
        if (verlauf && verlauf.length > 0) {
          const avgGesamt = verlauf.reduce((s, e) => s + e.summe, 0) / verlauf.length
          const abwPct = ((summe - avgGesamt) / avgGesamt * 100).toFixed(1)
          historischText += ` | Ø all-time: ${fmt(avgGesamt, einheit)} (heute ${abwPct > 0 ? '+' : ''}${abwPct}%)`
          const rekordMax = Math.max(...verlauf.map(e => e.summe))
          const rekordMin = Math.min(...verlauf.map(e => e.summe))
          if (summe >= rekordMax) historischText += ` ← TEUERSTER GRUPPENABEND ALLER ZEITEN`
          if (summe <= rekordMin) historischText += ` ← GÜNSTIGSTER GRUPPENABEND ALLER ZEITEN`
          // Streak: wie viele der letzten Abende lagen über/unter dem Schnitt
          const letzten = verlauf.slice(-10)
          let streakUnter = 0, streakUeber = 0
          for (let i = letzten.length - 1; i >= 0; i--) {
            if (letzten[i].summe < avgGesamt) streakUnter++; else break
          }
          for (let i = letzten.length - 1; i >= 0; i--) {
            if (letzten[i].summe > avgGesamt) streakUeber++; else break
          }
          if (streakUnter >= 2) historischText += ` | ${streakUnter} Abende in Folge unter Ø`
          if (streakUeber >= 2) historischText += ` | ${streakUeber} Abende in Folge über Ø`
          // Letzten 5 Abende als Verlauf
          const letzte5 = verlauf.slice(-5)
          historischText += `\n    Letzte ${letzte5.length} Abende: ${letzte5.map(e => `${e.datum.slice(5)}: ${fmt(e.summe, einheit)}`).join(', ')}`
        }
        historischText += '\n'
      }
    }

    if (meilensteine.length > 0) { historischText += '\nMeilensteine heute:\n'; meilensteine.forEach(m => { historischText += `  • ${m}\n` }) }
    if (bestleistungen.length > 0) { historischText += '\nNeue Bestleistungen:\n'; bestleistungen.forEach(m => { historischText += `  • ${m}\n` }) }
    if (aenderungen.length > 0) { historischText += '\nRanglistenveränderungen:\n'; aenderungen.forEach(a => { historischText += `  • ${a}\n` }) }
    if (saisonVergleiche.length > 0) { historischText += '\nSaison-Vergleiche:\n'; saisonVergleiche.forEach(s => { historischText += `  • ${s}\n` }) }

    historischText += '\nAll-Time Ranglisten:\n'
    for (const [kat, { einheit, rangliste }] of Object.entries(gesamtRankings)) {
      historischText += `  ${kat}: ` + rangliste.slice(0, 5).map((m, i) =>
        `${i + 1}. ${m.name} (${fmt(m.gesamt, einheit)} ges., Ø ${fmt(m.schnitt, einheit)}/Abend)`
      ).join(' | ') + '\n'
    }

    // Anteil am Gesamtvolumen (für LeBron-style Facts)
    historischText += '\nAnteil am Gesamtvolumen (all-time):\n'
    for (const [kat, { einheit, rangliste }] of Object.entries(gesamtRankings)) {
      const total = rangliste.reduce((s, m) => s + m.gesamt, 0)
      if (total === 0) continue
      historischText += `  ${kat}: ` + rangliste.map(m =>
        `${m.name}=${(m.gesamt / total * 100).toFixed(1)}% (${fmt(m.gesamt, einheit)} von ${fmt(total, einheit)})`
      ).join(', ') + '\n'
    }

    if (saison.anzahlAbende > 0) {
      historischText += `\nSaison ${saison.label} (${saison.anzahlAbende} Abende):\n`
      for (const [kat, { einheit, rangliste }] of Object.entries(saison.rankings)) {
        historischText += `  ${kat}: ` + rangliste.slice(0, 5).map((m, i) =>
          `${i + 1}. ${m.name} (${fmt(m.gesamt, einheit)} ges., Ø ${fmt(m.schnitt, einheit)}/Abend)`
        ).join(' | ') + '\n'
      }

      // MVP-Scores vorberechnet
      const mvpRanking = berechneMvpScores(saison.rankings)
      if (mvpRanking.length > 0) {
        historischText += `\nVorberechnetes MVP-Scoring Saison ${saison.label} (0–1, höher Score = besserer MVP-Kandidat; hohe Strafen sind bereits negativ eingerechnet):\n`
        mvpRanking.slice(0, 5).forEach((m, i) => {
          historischText += `  ${i + 1}. ${m.name}: ${m.avgScore.toFixed(3)}\n`
        })

        // Head-to-Head der Top-2 vorberechnen
        if (mvpRanking.length >= 2) {
          const p1 = mvpRanking[0].name
          const p2 = mvpRanking[1].name
          historischText += `\nHead-to-Head Top-MVP-Kandidaten: ${p1} vs ${p2}\n`
          for (const [kat, { einheit, rangliste }] of Object.entries(gesamtRankings)) {
            const m1 = rangliste.find(m => m.name === p1)
            const m2 = rangliste.find(m => m.name === p2)
            if (m1 && m2) historischText += `  ${kat} (all-time Ø): ${p1}=${fmt(m1.schnitt, einheit)}/Abend, ${p2}=${fmt(m2.schnitt, einheit)}/Abend | Gesamt: ${p1}=${fmt(m1.gesamt, einheit)}, ${p2}=${fmt(m2.gesamt, einheit)}\n`
          }
          for (const [kat, { einheit, rangliste }] of Object.entries(saison.rankings)) {
            const m1 = rangliste.find(m => m.name === p1)
            const m2 = rangliste.find(m => m.name === p2)
            if (m1 || m2) historischText += `  ${kat} (Saison Ø): ${p1}=${m1 ? fmt(m1.schnitt, einheit) + '/Abend' : 'n/a'}, ${p2}=${m2 ? fmt(m2.schnitt, einheit) + '/Abend' : 'n/a'}\n`
          }
        }
      }
    }

    if (Object.keys(rekorde).length > 0) {
      historischText += '\nAll-Time Rekorde:\n'
      for (const [kat, r] of Object.entries(rekorde)) {
        if (r.teuerterAbendGesamt) historischText += `  ${kat} – Teuerster Abend: ${r.teuerterAbendGesamt.summe.toFixed(2)} €\n`
        if (r.guenstigsterAbendGesamt) historischText += `  ${kat} – Günstigster Abend: ${r.guenstigsterAbendGesamt.summe.toFixed(2)} €\n`
        if (r.teuertstePerson) historischText += `  ${kat} – Teuerste Person: ${r.teuertstePerson.name} ${r.teuertstePerson.summe.toFixed(2)} €\n`
        if (r.guenstigstePerson) historischText += `  ${kat} – Günstigste Person: ${r.guenstigstePerson.name} ${r.guenstigstePerson.summe.toFixed(2)} €\n`
      }
    }

    historischText += '\nAnwesenheit gesamt: ' + anwesenheit.map(a => `${a.name}=${a.anzahl}`).join(', ') + '\n'

    // Korrelationen
    if (korrelationen) {
      const { anwesenheit: korrAnw, performance: korrPerf } = korrelationen
      if (korrAnw.length > 0) {
        historischText += '\nAnwesenheitskorrelationen (wer kommt wann zusammen):\n'
        for (const p of korrAnw) {
          historischText += `  ${p.a} & ${p.b}: zusammen ${p.zusammen}× | ${p.a} bei ${Math.round(p.rateA * 100)}% von ${p.b}s Abenden | ${p.b} bei ${Math.round(p.rateB * 100)}% von ${p.a}s Abenden (Gesamt: ${p.a}=${p.totalA}×, ${p.b}=${p.totalB}×)\n`
        }
      }
      if (korrPerf.length > 0) {
        historischText += '\nPerformance-Korrelationen (Ø wenn Person dabei vs. nicht dabei):\n'
        for (const k of korrPerf) {
          const fmtV = v => k.einheit === '€' ? `${v.toFixed(2)} €` : String(Math.round(v))
          historischText += `  ${k.name} in "${k.kat}": mit ${k.anderePerson}=${fmtV(k.avgMit)} (${k.nMit}×) vs. ohne ${k.anderePerson}=${fmtV(k.avgOhne)} (${k.nOhne}×) → ${k.delta}% Unterschied, ${k.besserMit ? 'besser' : 'schlechter'} mit ${k.anderePerson}\n`
        }
      }
    }
  }

  // Routemap für klickbare Links in Highlights
  const routeMap = {
    'Anwesenheit': '/rangliste/anwesenheit',
    'Pudelkönig': '/rangliste/pudelkoenig',
    'König': '/rangliste/koenig',
  }
  for (const k of kategorien) {
    routeMap[k.name] = `/rangliste/${k.id}`
  }
  const routeMapText = Object.entries(routeMap)
    .map(([name, route]) => `  "${name}" → "${route}"`)
    .join('\n')

  const prompt = `Du bist der kreative NBA-Statistik-Assistent des Kegelclubs KC Pegelbrüder.

Schreib sachlich, direkt und auf den Punkt. Keine Anreden, keine Ausrufe, keine floskelhaften Sätze.
Benutze Spitznamen statt Vornamen (z.B. Mabo, Leimi, Topi, Schimmel, Eule, Mochel, Degah, Zwadde, Flo, Jerry, Schraube).
Kurze klare Sätze mit konkreten Zahlen — der Witz steckt in den Fakten, nicht in der Formulierung.

Hier sind die Daten vom Kegelabend am ${datumFormatiert}:
Teilnehmer: ${teilnehmer}

Statistiken dieses Abends:
${statsText}${historischText}

Erstelle ein JSON-Array mit genau 12 Highlight-Objekten, nach Spektakularität sortiert (bestes zuerst).

Verfügbare Ranglisten-Links (exakt für "link"-Feld verwenden):
${routeMapText}

Verfügbare Typen:

1. Text: {"type":"text","content":"unterhaltsamer Satz mit konkreten Zahlen","link":"/rangliste/id"}
   → "link" optional, nur setzen wenn der Satz direkt auf eine der obigen Ranglisten verweist (z.B. "Platz 2 in der All-Time-Strafen-Liste").

2. MVP Race: {"type":"mvp_ladder","saison":"XX/XX","entries":[{"rank":1,"name":"...","reason":"kurze Begründung mit Zahlen"},{"rank":2,...},{"rank":3,...},{"rank":4,...},{"rank":5,...}]}
   → Genau 5 Einträge. Nutze die vorberechneten MVP-Scores und ergänze qualitative Begründungen.

3. Head-to-Head: {"type":"head_to_head","player1":"...","player2":"...","context":"z.B. 'Saison 25/26' oder 'Letzter Abend'","stats":[{"label":"Kategoriename","v1":1.23,"v2":4.56,"einheit":"€","lowerIsBetter":true},…]}
   → 3–5 Stats. v1/v2 müssen exakte Zahlen aus dem Kontext sein (keine erfundenen Werte!).
   → Die zwei Spieler müssen NICHT die MVP-Spitzenreiter sein. Wähle das interessanteste Duell: zwei Spieler mit extremen Unterschieden in einer Kategorie, unerwarteten Gegensätzen quer über mehrere Kategorien, oder einer auffälligen Rivalität in den Daten.

4. Anteilsstat: {"type":"share","content":"LeBron-style Satz","subject":"Name","share":0.34,"label":"z.B. von Gesamtstrafen aller Zeiten","link":"/rangliste/id"}
   → share muss ein Dezimalwert 0–1 sein, exakt aus dem Kontext. "link" optional wie bei Text.

5. Korrelation: {"type":"correlation","player1":"...","player2":"...","content":"unterhaltsamer Satz der die Korrelation beschreibt mit konkreten Zahlen"}
   → Nur wenn eine klare statistische Korrelation aus dem Kontext ersichtlich ist (Anwesenheit ODER Performance). Maximal 1–2 Einträge. Nie erfinden — nur aus den Korrelationsdaten.

Regeln:
- Genau 1 mvp_ladder (wenn Saisondaten vorhanden)
- Genau 1 head_to_head — wähle das statistisch interessanteste Duell, nicht zwingend die MVP-Spitzenreiter
- 1–2 share-Einträge für besonders interessante Anteile
- 0–2 correlation-Einträge (nur wenn Daten vorhanden und statistisch auffällig)
- Mindestens 2 text-Einträge über den GANZEN CLUB (nicht einzelne Personen): z.B. Gruppen-Gesamtwerte, Streaks, Rekorde, Ø-Veränderung — nutze die "Gruppen-Gesamtwerte heute" Daten
- Rest: text (Mix aus Einzel- und Gruppen-Facts)
- Nur Zahlen aus dem Kontext verwenden — niemals erfinden
- Antworte NUR mit validem JSON, kein Markdown, keine Erklärung`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()

  let highlights
  try {
    const cleaned = raw.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim()
    highlights = JSON.parse(cleaned)
    if (!Array.isArray(highlights)) throw new Error('not array')
    highlights = highlights.slice(0, 12).map((h, i) => ({ sichtbar: i < 3, ...h }))
  } catch {
    // Fallback: text lines
    highlights = raw.split('\n').filter(Boolean).slice(0, 12).map(line => ({ type: 'text', content: line, sichtbar: true }))
  }

  return highlights
}
