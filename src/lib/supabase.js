import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://DEIN-PROJEKT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'DEIN-ANON-KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Mitglieder ───────────────────────────────────────────────

export async function getMitglieder() {
  const { data, error } = await supabase.from('mitglieder').select('*').order('name')
  if (error) throw error
  return data
}

export async function getGaeste() {
  const { data, error } = await supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', true).order('name')
  if (error) throw error
  return data || []
}

export async function getGastAnwesenheit(kegelabendId) {
  const { data, error } = await supabase.from('gast_anwesenheit').select('mitglied_id').eq('kegelabend_id', kegelabendId)
  if (error) throw error
  return new Set((data || []).map(r => r.mitglied_id))
}

export async function saveGastAnwesenheit(kegelabendId, gastIds) {
  await supabase.from('gast_anwesenheit').delete().eq('kegelabend_id', kegelabendId)
  if (gastIds.length > 0) {
    const { error } = await supabase.from('gast_anwesenheit').insert(
      gastIds.map(id => ({ kegelabend_id: kegelabendId, mitglied_id: id }))
    )
    if (error) throw error
  }
}

export async function getMitglied(id) {
  const { data, error } = await supabase.from('mitglieder').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createMitglied(name, spitzname = null, ist_gast = false) {
  const { data, error } = await supabase.from('mitglieder').insert({ name, spitzname, ist_gast }).select().single()
  if (error) throw error
  return data
}

export async function deleteMitglied(id) {
  const { error } = await supabase.from('mitglieder').delete().eq('id', id)
  if (error) throw error
}

// ── Statistik-Kategorien ─────────────────────────────────────

export async function getKategorien() {
  const { data, error } = await supabase.from('statistik_kategorien').select('*').order('reihenfolge')
  if (error) throw error
  return data
}

export async function getKategorie(id) {
  const { data, error } = await supabase.from('statistik_kategorien').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createKategorie(name, einheit, beschreibung = null, reihenfolge = 99) {
  const { data, error } = await supabase.from('statistik_kategorien').insert({ name, einheit, beschreibung, reihenfolge }).select().single()
  if (error) throw error
  return data
}

// ── Statistik-Einträge ───────────────────────────────────────

export async function getStatistiken() {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select(`*, mitglieder ( id, name, spitzname ), statistik_kategorien ( id, name, einheit ), kegelabende ( id, datum )`)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

export async function addStatistikEintrag(mitglied_id, kategorie_id, wert, notiz = null, kegelabend_id = null) {
  const { data, error } = await supabase.from('statistik_eintraege').insert({ mitglied_id, kategorie_id, wert, notiz, kegelabend_id }).select().single()
  if (error) throw error
  return data
}

export async function deleteStatistikEintrag(id) {
  const { error } = await supabase.from('statistik_eintraege').delete().eq('id', id)
  if (error) throw error
}

// ── Aggregierte Ranglisten ───────────────────────────────────

export async function getRanglisteDurchschnitt(kategorie_id) {
  const [{ data: katEintraege, error: e1 }, { data: alleEintraege, error: e2 }] = await Promise.all([
    supabase.from('statistik_eintraege').select('wert, mitglieder(id, name, spitzname)').eq('kategorie_id', kategorie_id),
    supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null),
  ])
  if (e1 || e2) throw e1 || e2

  // Besuchte Abende pro Person
  const anwesenheit = {}
  for (const e of alleEintraege) {
    if (!anwesenheit[e.mitglied_id]) anwesenheit[e.mitglied_id] = new Set()
    anwesenheit[e.mitglied_id].add(e.kegelabend_id)
  }

  const aggregiert = {}
  for (const e of katEintraege) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, gesamt: 0, eintraege: 0 }
    aggregiert[m.id].gesamt += Number(e.wert)
    aggregiert[m.id].eintraege++
  }

  return Object.values(aggregiert).map(m => ({
    ...m,
    gesamt: m.gesamt / Math.max(1, anwesenheit[m.id]?.size ?? 0),
  })).sort((a, b) => b.gesamt - a.gesamt)
}

export async function getRangliste(kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select(`wert, mitglieder ( id, name, spitzname )`)
    .eq('kategorie_id', kategorie_id)
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, gesamt: 0, eintraege: 0 }
    aggregiert[m.id].gesamt += Number(e.wert)
    aggregiert[m.id].eintraege++
  }
  return Object.values(aggregiert).sort((a, b) => b.gesamt - a.gesamt)
}

export async function getRanglisteKegelabend(kegelabend_id, kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select(`wert, mitglieder ( id, name, spitzname )`)
    .eq('kegelabend_id', kegelabend_id)
    .eq('kategorie_id', kategorie_id)
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, gesamt: 0, eintraege: 0 }
    aggregiert[m.id].gesamt += Number(e.wert)
    aggregiert[m.id].eintraege++
  }
  return Object.values(aggregiert).sort((a, b) => b.gesamt - a.gesamt)
}

// ── Mitglied-Statistiken ─────────────────────────────────────

export async function getStatistikenFuerMitglied(mitglied_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select(`wert, statistik_kategorien ( id, name, einheit, beschreibung )`)
    .eq('mitglied_id', mitglied_id)
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const k = e.statistik_kategorien
    if (!aggregiert[k.id]) aggregiert[k.id] = { id: k.id, name: k.name, einheit: k.einheit, beschreibung: k.beschreibung, gesamt: 0, eintraege: 0 }
    aggregiert[k.id].gesamt += Number(e.wert)
    aggregiert[k.id].eintraege++
  }
  return Object.values(aggregiert)
}

// ── Streaks ──────────────────────────────────────────────────

export async function getMitgliedAnwesenheit(mitglied_id) {
  const [{ data: abende }, { data: eintraege }] = await Promise.all([
    supabase.from('kegelabende').select('id, datum').order('datum', { ascending: true }),
    supabase.from('statistik_eintraege').select('kegelabend_id').eq('mitglied_id', mitglied_id).not('kegelabend_id', 'is', null),
  ])
  if (!abende || !eintraege) return { abende: [], teilnahmen: new Set() }
  return { abende, teilnahmen: new Set(eintraege.map(e => e.kegelabend_id)) }
}

export async function getTeilnahmeMatrix() {
  const [{ data: eintraege, error: e1 }, { data: mitglieder, error: e2 }] = await Promise.all([
    supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null),
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false).order('name'),
  ])
  if (e1 || e2) throw e1 || e2
  return {
    mitglieder,
    teilnahmen: new Set(eintraege.map(e => `${e.mitglied_id}:${e.kegelabend_id}`)),
  }
}

export async function getMitgliederMitStreaks() {
  const [{ data: abende, error: e1 }, { data: eintraege, error: e2 }, { data: mitglieder, error: e3 }] = await Promise.all([
    supabase.from('kegelabende').select('id').order('datum', { ascending: true }),
    supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null),
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false),
  ])
  if (e1 || e2 || e3) throw e1 || e2 || e3
  const teilnahmen = new Set(eintraege.map(e => `${e.mitglied_id}:${e.kegelabend_id}`))
  return mitglieder.map(m => {
    let streak = 0
    for (let i = abende.length - 1; i >= 0; i--) {
      if (teilnahmen.has(`${m.id}:${abende[i].id}`)) streak++
      else break
    }
    return { ...m, streak }
  }).filter(m => m.streak > 0).sort((a, b) => b.streak - a.streak)
}

export async function getMitgliedStreak(mitglied_id) {
  const [{ data: abende }, { data: eintraege }] = await Promise.all([
    supabase.from('kegelabende').select('id').order('datum', { ascending: true }),
    supabase.from('statistik_eintraege').select('kegelabend_id').eq('mitglied_id', mitglied_id).not('kegelabend_id', 'is', null),
  ])
  if (!abende || !eintraege) return 0
  const teilnahmen = new Set(eintraege.map(e => e.kegelabend_id))
  let streak = 0
  for (let i = abende.length - 1; i >= 0; i--) {
    if (teilnahmen.has(abende[i].id)) streak++
    else break
  }
  return streak
}

export async function getKategorieRohDaten(kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, kegelabend_id')
    .eq('kategorie_id', kategorie_id)
  if (error) throw error
  const totalSumme = data.reduce((s, e) => s + Number(e.wert), 0)
  const abendeSet = new Set(data.filter(e => e.kegelabend_id).map(e => e.kegelabend_id))
  return { totalSumme, anzahlAbende: abendeSet.size }
}

export async function getAnwesenheitDaten() {
  const [{ data: abende }, { data: eintraege }, { data: mitglieder }, { data: gastEintraege }] = await Promise.all([
    supabase.from('kegelabende').select('id, datum').order('datum', { ascending: true }),
    supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null),
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false).order('name'),
    supabase.from('gast_anwesenheit').select('mitglied_id, kegelabend_id'),
  ])
  const teilnahmen = new Set((eintraege || []).map(e => `${e.mitglied_id}:${e.kegelabend_id}`))
  const gaesteTeilnahmen = new Set((gastEintraege || []).map(e => `${e.mitglied_id}:${e.kegelabend_id}`))
  const mitgliederMitCount = (mitglieder || [])
    .map(m => ({ ...m, count: (abende || []).filter(a => teilnahmen.has(`${m.id}:${a.id}`)).length }))
    .sort((a, b) => b.count - a.count)
  return { mitglieder: mitgliederMitCount, abende: abende || [], teilnahmen, gaesteTeilnahmen }
}

export async function getRanglisteAnwesenheit() {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('mitglied_id, kegelabend_id, mitglieder(id, name, spitzname)')
    .not('kegelabend_id', 'is', null)
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, abende: new Set() }
    aggregiert[m.id].abende.add(e.kegelabend_id)
  }
  return Object.values(aggregiert)
    .map(m => ({ id: m.id, name: m.name, spitzname: m.spitzname, gesamt: m.abende.size, eintraege: m.abende.size }))
    .sort((a, b) => b.gesamt - a.gesamt)
}

export async function getRanglisteStrafen() {
  const { data: kats, error: e1 } = await supabase
    .from('statistik_kategorien')
    .select('id')
    .eq('einheit', '€')
  if (e1) throw e1
  if (!kats || kats.length === 0) return []

  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, mitglieder(id, name, spitzname)')
    .in('kategorie_id', kats.map(k => k.id))
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, gesamt: 0, eintraege: 0 }
    aggregiert[m.id].gesamt += Number(e.wert)
    aggregiert[m.id].eintraege++
  }
  return Object.values(aggregiert).sort((a, b) => b.gesamt - a.gesamt)
}

// ── Kegelabend-Fotos ─────────────────────────────────────────

const FOTO_BUCKET = 'kegelabend-fotos'

export async function uploadKegelabendFoto(kegelabendId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${kegelabendId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(FOTO_BUCKET).upload(path, file)
  if (error) throw error
  return {
    path,
    url: supabase.storage.from(FOTO_BUCKET).getPublicUrl(path).data.publicUrl,
  }
}

export async function getKegelabendFotos(kegelabendId) {
  const { data, error } = await supabase.storage
    .from(FOTO_BUCKET)
    .list(kegelabendId, { sortBy: { column: 'created_at', order: 'asc' } })
  if (error || !data) return []
  return data
    .filter(f => f.name !== '.emptyFolderPlaceholder')
    .map(f => ({
      name: f.name,
      path: `${kegelabendId}/${f.name}`,
      url: supabase.storage.from(FOTO_BUCKET).getPublicUrl(`${kegelabendId}/${f.name}`).data.publicUrl,
    }))
}

export async function deleteKegelabendFoto(path) {
  const { error } = await supabase.storage.from(FOTO_BUCKET).remove([path])
  if (error) throw error
}

// ── Kegelabende ──────────────────────────────────────────────

export async function getKegelabende() {
  const { data, error } = await supabase.from('kegelabende').select('*').order('datum', { ascending: false })
  if (error) throw error
  return data
}

export async function getKegelabend(id) {
  const { data, error } = await supabase.from('kegelabende').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createKegelabend(datum) {
  const { data, error } = await supabase.from('kegelabende').insert({ datum }).select().single()
  if (error) throw error
  return data
}

export async function deleteKegelabend(id) {
  const { error } = await supabase.from('kegelabende').delete().eq('id', id)
  if (error) throw error
}

export async function getStatistikenKegelabend(kegelabend_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select(`wert, mitglieder ( id, name, spitzname ), statistik_kategorien ( id, name, einheit )`)
    .eq('kegelabend_id', kegelabend_id)
  if (error) throw error
  return data
}

export async function getEintraegeProMitglied(mitglied_id, kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, notiz, kegelabend_id, kegelabende(id, datum)')
    .eq('mitglied_id', mitglied_id)
    .eq('kategorie_id', kategorie_id)
  if (error) throw error

  // Gruppiere nach Kegelabend, summiere Werte
  const proAbend = {}
  for (const e of data) {
    const key = e.kegelabend_id || '__kein_abend'
    if (!proAbend[key]) proAbend[key] = { kegelabend_id: e.kegelabend_id, datum: e.kegelabende?.datum || null, summe: 0, eintraege: 0 }
    proAbend[key].summe += Number(e.wert)
    proAbend[key].eintraege++
  }
  return Object.values(proAbend).sort((a, b) => {
    if (!a.datum) return 1
    if (!b.datum) return -1
    return new Date(b.datum) - new Date(a.datum)
  })
}

export async function getMitgliedRekorde(mitglied_id) {
  const [{ data: kats }, { data: eintraege, error }, anwesenheitDaten] = await Promise.all([
    supabase.from('statistik_kategorien').select('id, name').eq('einheit', '€'),
    supabase.from('statistik_eintraege').select('wert, mitglied_id, kategorie_id, kegelabend_id').not('kegelabend_id', 'is', null),
    getAnwesenheitDaten(),
  ])
  if (error) throw error

  const rekorde = []

  if (kats && kats.length > 0 && eintraege) {
    const proKatPersonAbend = {}
    for (const e of eintraege) {
      const key = `${e.kategorie_id}:${e.mitglied_id}:${e.kegelabend_id}`
      if (!proKatPersonAbend[key]) proKatPersonAbend[key] = { kategorie_id: e.kategorie_id, mitglied_id: e.mitglied_id, kegelabend_id: e.kegelabend_id, summe: 0 }
      proKatPersonAbend[key].summe += Number(e.wert)
    }
    for (const kat of kats) {
      const entries = Object.values(proKatPersonAbend).filter(e => e.kategorie_id === kat.id)
      if (entries.length === 0) continue
      const min = entries.reduce((m, e) => e.summe < m.summe ? e : m)
      const max = entries.reduce((m, e) => e.summe > m.summe ? e : m)
      if (min.mitglied_id === mitglied_id) rekorde.push({ label: 'Günstigster Abend', kategorie: kat.name, href: `/kegelabend/${min.kegelabend_id}`, emoji: '⭐️' })
      if (max.mitglied_id === mitglied_id) rekorde.push({ label: 'Teuerster Abend', kategorie: kat.name, href: `/kegelabend/${max.kegelabend_id}`, emoji: '💀' })
    }
  }

  const { mitglieder, abende, teilnahmen } = anwesenheitDaten
  if (mitglieder.length > 1 && abende.length > 0) {
    let longestStreak = { mitglied: null, length: 0 }
    for (const m of mitglieder) {
      let streak = 0, maxStreak = 0
      for (const a of abende) {
        if (teilnahmen.has(`${m.id}:${a.id}`)) { streak++; maxStreak = Math.max(maxStreak, streak) }
        else { streak = 0 }
      }
      if (maxStreak > longestStreak.length) longestStreak = { mitglied: m, length: maxStreak }
    }
    if (longestStreak.mitglied?.id === mitglied_id) rekorde.push({ label: 'Längste Anwesenheitsstreak', kategorie: 'Anwesenheit', href: '/rangliste/anwesenheit', emoji: '🔥' })
  }

  return rekorde
}

export async function getAbendsRekorde(kegelabend_id) {
  const { data: kats } = await supabase.from('statistik_kategorien').select('id, name').eq('einheit', '€')
  if (!kats || kats.length === 0) return []

  const { data: eintraege, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, mitglied_id, kategorie_id, kegelabend_id, mitglieder(id, name, spitzname)')
    .in('kategorie_id', kats.map(k => k.id))
    .not('kegelabend_id', 'is', null)
  if (error) throw error

  const proPersonAbend = {}
  const proAbend = {}
  for (const e of eintraege) {
    const pk = `${e.kategorie_id}:${e.mitglied_id}:${e.kegelabend_id}`
    if (!proPersonAbend[pk]) proPersonAbend[pk] = { kategorie_id: e.kategorie_id, mitglied_id: e.mitglied_id, name: e.mitglieder.name, spitzname: e.mitglieder.spitzname, kegelabend_id: e.kegelabend_id, summe: 0 }
    proPersonAbend[pk].summe += Number(e.wert)

    const ak = `${e.kategorie_id}:${e.kegelabend_id}`
    if (!proAbend[ak]) proAbend[ak] = { kategorie_id: e.kategorie_id, kegelabend_id: e.kegelabend_id, summe: 0 }
    proAbend[ak].summe += Number(e.wert)
  }

  const badges = []
  for (const kat of kats) {
    const pEntries = Object.values(proPersonAbend).filter(e => e.kategorie_id === kat.id)
    if (pEntries.length > 0) {
      const min = pEntries.reduce((m, e) => e.summe < m.summe ? e : m)
      const max = pEntries.reduce((m, e) => e.summe > m.summe ? e : m)
      if (min.kegelabend_id === kegelabend_id) badges.push({ emoji: '⭐️', label: `Günstigster Abend · Person: ${min.spitzname || min.name}`, mitglied_id: min.mitglied_id })
      if (max.kegelabend_id === kegelabend_id) badges.push({ emoji: '💀', label: `Teuerster Abend · Person: ${max.spitzname || max.name}`, mitglied_id: max.mitglied_id })
    }
    const aEntries = Object.values(proAbend).filter(e => e.kategorie_id === kat.id)
    if (aEntries.length > 0) {
      const minA = aEntries.reduce((m, e) => e.summe < m.summe ? e : m)
      const maxA = aEntries.reduce((m, e) => e.summe > m.summe ? e : m)
      if (minA.kegelabend_id === kegelabend_id) badges.push({ emoji: '⭐️', label: 'Günstigster Abend · Gesamt' })
      if (maxA.kegelabend_id === kegelabend_id) badges.push({ emoji: '💀', label: 'Teuerster Abend · Gesamt' })
    }
  }
  return badges
}

export async function getKategorieExtrema(kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, mitglied_id, kegelabend_id, mitglieder(id, name, spitzname), kegelabende(id, datum)')
    .eq('kategorie_id', kategorie_id)
    .not('kegelabend_id', 'is', null)
  if (error) throw error
  if (!data || data.length === 0) return null

  const proPersonAbend = {}
  for (const e of data) {
    const key = `${e.mitglied_id}:${e.kegelabend_id}`
    if (!proPersonAbend[key]) proPersonAbend[key] = {
      mitglied_id: e.mitglied_id, name: e.mitglieder.name, spitzname: e.mitglieder.spitzname,
      kegelabend_id: e.kegelabend_id, datum: e.kegelabende?.datum, summe: 0,
    }
    proPersonAbend[key].summe += Number(e.wert)
  }
  const personAbendListe = Object.values(proPersonAbend)

  const proAbend = {}
  for (const e of data) {
    if (!proAbend[e.kegelabend_id]) proAbend[e.kegelabend_id] = {
      kegelabend_id: e.kegelabend_id, datum: e.kegelabende?.datum, summe: 0,
    }
    proAbend[e.kegelabend_id].summe += Number(e.wert)
  }
  const abendListe = Object.values(proAbend)

  return {
    guenstigstePerson: personAbendListe.reduce((min, e) => e.summe < min.summe ? e : min),
    teuertstePerson: personAbendListe.reduce((max, e) => e.summe > max.summe ? e : max),
    guenstigsterAbend: abendListe.reduce((min, e) => e.summe < min.summe ? e : min),
    teuerterAbend: abendListe.reduce((max, e) => e.summe > max.summe ? e : max),
  }
}

// ── Sitzordnung ───────────────────────────────────────────────

export async function getSitzordnung(kegelabend_id) {
  const { data, error } = await supabase
    .from('sitzordnung')
    .select('*')
    .eq('kegelabend_id', kegelabend_id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveSitzordnung(kegelabend_id, sitzplaetze) {
  const { data, error } = await supabase
    .from('sitzordnung')
    .upsert({ kegelabend_id, sitzplaetze }, { onConflict: 'kegelabend_id' })
    .select()
    .single()
  if (error) throw error
  return data
}