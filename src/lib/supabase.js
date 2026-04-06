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

export async function createKategorie(name, einheit, beschreibung = null, reihenfolge = 99, gruppe = null) {
  const { data, error } = await supabase.from('statistik_kategorien').insert({ name, einheit, beschreibung, reihenfolge, gruppe }).select().single()
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

async function getKegelabendIdsBis(bisDatum) {
  const { data } = await supabase.from('kegelabende').select('id').lte('datum', bisDatum)
  return (data || []).map(a => a.id)
}

export async function getRanglisteDurchschnitt(kategorie_id, bisDatum = null) {
  const abendeIds = bisDatum ? await getKegelabendIdsBis(bisDatum) : null
  if (bisDatum && abendeIds.length === 0) return []

  let q1 = supabase.from('statistik_eintraege').select('wert, mitglieder(id, name, spitzname)').eq('kategorie_id', kategorie_id)
  let q2 = supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null)
  if (abendeIds) { q1 = q1.in('kegelabend_id', abendeIds); q2 = q2.in('kegelabend_id', abendeIds) }

  const [{ data: katEintraege, error: e1 }, { data: alleEintraege, error: e2 }] = await Promise.all([q1, q2])
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

export async function getRangliste(kategorie_id, bisDatum = null) {
  const abendeIds = bisDatum ? await getKegelabendIdsBis(bisDatum) : null
  if (bisDatum && abendeIds.length === 0) return []

  let query = supabase.from('statistik_eintraege').select('wert, mitglieder(id, name, spitzname)').eq('kategorie_id', kategorie_id)
  if (abendeIds) query = query.in('kegelabend_id', abendeIds)

  const { data, error } = await query
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

export async function getKategorieStatsProMitglied(kategorie_id) {
  const { data, error } = await supabase
    .from('statistik_eintraege')
    .select('wert, mitglied_id, kegelabend_id')
    .eq('kategorie_id', kategorie_id)
    .not('kegelabend_id', 'is', null)
  if (error) throw error
  if (!data || data.length === 0) return null

  const perMitglied = {}
  for (const e of data) {
    if (!perMitglied[e.mitglied_id]) perMitglied[e.mitglied_id] = { summe: 0, abende: new Set(), werte: [] }
    perMitglied[e.mitglied_id].summe += Number(e.wert)
    perMitglied[e.mitglied_id].abende.add(e.kegelabend_id)
    perMitglied[e.mitglied_id].werte.push(Number(e.wert))
  }

  const stats = Object.values(perMitglied)
  return {
    summeAvg: stats.reduce((s, m) => s + m.summe, 0) / stats.length,
    minAvg: stats.reduce((s, m) => s + Math.min(...m.werte), 0) / stats.length,
    maxAvg: stats.reduce((s, m) => s + Math.max(...m.werte), 0) / stats.length,
    abendeAvg: stats.reduce((s, m) => s + m.abende.size, 0) / stats.length,
  }
}

export async function getKategorieRohDaten(kategorie_id, bisDatum = null) {
  let q = supabase.from('statistik_eintraege').select('wert, kegelabend_id').eq('kategorie_id', kategorie_id)
  if (bisDatum) {
    const ids = await getKegelabendIdsBis(bisDatum)
    q = q.in('kegelabend_id', ids)
  }
  const { data, error } = await q
  if (error) throw error
  const totalSumme = data.reduce((s, e) => s + Number(e.wert), 0)
  const abendeSet = new Set(data.filter(e => e.kegelabend_id).map(e => e.kegelabend_id))
  return { totalSumme, anzahlAbende: abendeSet.size }
}

export async function getAnwesenheitDaten(bisDatum = null) {
  let abendeQuery = supabase.from('kegelabende').select('id, datum').order('datum', { ascending: true })
  if (bisDatum) abendeQuery = abendeQuery.lte('datum', bisDatum)

  const [{ data: abende }, { data: eintraegeAll }, { data: mitglieder }, { data: gastEintraegeAll }] = await Promise.all([
    abendeQuery,
    supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id').not('kegelabend_id', 'is', null),
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false).order('name'),
    supabase.from('gast_anwesenheit').select('mitglied_id, kegelabend_id'),
  ])
  const abendeArr = abende || []
  const abendeIdSet = new Set(abendeArr.map(a => a.id))
  const eintraege = (eintraegeAll || []).filter(e => abendeIdSet.has(e.kegelabend_id))
  const gastEintraege = (gastEintraegeAll || []).filter(e => abendeIdSet.has(e.kegelabend_id))
  const teilnahmen = new Set(eintraege.map(e => `${e.mitglied_id}:${e.kegelabend_id}`))
  const gaesteTeilnahmen = new Set(gastEintraege.map(e => `${e.mitglied_id}:${e.kegelabend_id}`))
  const mitgliederMitCount = (mitglieder || [])
    .map(m => {
      const count = abendeArr.filter(a => teilnahmen.has(`${m.id}:${a.id}`)).length
      let streak = 0, maxStreak = 0
      for (const a of abendeArr) {
        if (teilnahmen.has(`${m.id}:${a.id}`)) { streak++; maxStreak = Math.max(maxStreak, streak) }
        else streak = 0
      }
      const currentStreak = streak
      return { ...m, count, maxStreak, currentStreak }
    })
    .sort((a, b) => b.count - a.count || b.maxStreak - a.maxStreak || b.currentStreak - a.currentStreak || a.name.localeCompare(b.name))
  return { mitglieder: mitgliederMitCount, abende: abendeArr, teilnahmen, gaesteTeilnahmen }
}

export async function getRanglisteAnwesenheit(bisDatum = null) {
  let q1 = supabase.from('statistik_eintraege').select('mitglied_id, kegelabend_id, mitglieder(id, name, spitzname)').not('kegelabend_id', 'is', null)
  let q2 = supabase.from('kegelabende').select('id').order('datum', { ascending: true })
  if (bisDatum) {
    const ids = await getKegelabendIdsBis(bisDatum)
    q1 = q1.in('kegelabend_id', ids)
    q2 = q2.lte('datum', bisDatum)
  }
  const [{ data, error }, { data: abendeData }] = await Promise.all([q1, q2])
  if (error) throw error

  const aggregiert = {}
  for (const e of data) {
    const m = e.mitglieder
    if (!aggregiert[m.id]) aggregiert[m.id] = { id: m.id, name: m.name, spitzname: m.spitzname, abende: new Set() }
    aggregiert[m.id].abende.add(e.kegelabend_id)
  }
  const abendeArr = abendeData || []
  return Object.values(aggregiert)
    .map(m => {
      let streak = 0, maxStreak = 0
      for (const a of abendeArr) {
        if (m.abende.has(a.id)) { streak++; maxStreak = Math.max(maxStreak, streak) }
        else streak = 0
      }
      const currentStreak = streak
      return { id: m.id, name: m.name, spitzname: m.spitzname, gesamt: m.abende.size, eintraege: m.abende.size, maxStreak, currentStreak }
    })
    .sort((a, b) => b.gesamt - a.gesamt || b.maxStreak - a.maxStreak || b.currentStreak - a.currentStreak || a.name.localeCompare(b.name))
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

export async function updateKegelabendEhrentitel(id, updates) {
  const { error } = await supabase.from('kegelabende').update(updates).eq('id', id)
  if (error) throw error
}

export async function getPudelkoenigRangliste(bisDatum = null) {
  let query = supabase.from('kegelabende').select('pudelkoenig_id').not('pudelkoenig_id', 'is', null)
  if (bisDatum) query = query.lte('datum', bisDatum)
  const [{ data: abende }, { data: mitglieder }] = await Promise.all([
    query,
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false),
  ])
  if (!abende || !mitglieder) return []
  const counts = {}
  for (const a of abende) counts[a.pudelkoenig_id] = (counts[a.pudelkoenig_id] || 0) + 1
  return mitglieder.map(m => ({ ...m, gesamt: counts[m.id] || 0 })).sort((a, b) => b.gesamt - a.gesamt || a.name.localeCompare(b.name, 'de'))
}

export async function getKoenigRangliste(bisDatum = null) {
  let query = supabase.from('kegelabende').select('koenig_id').not('koenig_id', 'is', null)
  if (bisDatum) query = query.lte('datum', bisDatum)
  const [{ data: abende }, { data: mitglieder }] = await Promise.all([
    query,
    supabase.from('mitglieder').select('id, name, spitzname').eq('ist_gast', false),
  ])
  if (!abende || !mitglieder) return []
  const counts = {}
  for (const a of abende) counts[a.koenig_id] = (counts[a.koenig_id] || 0) + 1
  return mitglieder.map(m => ({ ...m, gesamt: counts[m.id] || 0 })).sort((a, b) => b.gesamt - a.gesamt || a.name.localeCompare(b.name, 'de'))
}

export async function getEhrentitelVerlauf(typ, bisDatum = null) {
  const col = typ === 'pudelkoenig' ? 'pudelkoenig_id' : 'koenig_id'
  let query = supabase.from('kegelabende').select(`id, datum, ${col}`).not(col, 'is', null).order('datum', { ascending: false })
  if (bisDatum) query = query.lte('datum', bisDatum)
  const { data, error } = await query
  if (error) throw error
  const ids = [...new Set(data.map(a => a[col]).filter(Boolean))]
  if (ids.length === 0) return []
  const { data: mitglieder } = await supabase.from('mitglieder').select('id, name, spitzname').in('id', ids)
  const map = Object.fromEntries((mitglieder || []).map(m => [m.id, m]))
  return data.map(a => ({ id: a.id, datum: a.datum, mitglied: map[a[col]] || null }))
}

export async function getMitgliedEhrentitelAbende(mitglied_id, typ) {
  const col = typ === 'pudelkoenig' ? 'pudelkoenig_id' : 'koenig_id'
  const { data, error } = await supabase
    .from('kegelabende')
    .select(`id, datum, ${col}`)
    .order('datum', { ascending: true })
  if (error || !data) return []
  return data.map(a => ({ id: a.id, datum: a.datum, gewonnen: a[col] === mitglied_id }))
}

export async function getMitgliedEhrentitel(mitglied_id) {
  const [{ count: pudel }, { count: koenig }] = await Promise.all([
    supabase.from('kegelabende').select('*', { count: 'exact', head: true }).eq('pudelkoenig_id', mitglied_id),
    supabase.from('kegelabende').select('*', { count: 'exact', head: true }).eq('koenig_id', mitglied_id),
  ])
  return { pudelkoenig: pudel ?? 0, koenig: koenig ?? 0 }
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

export async function getKategorieExtrema(kategorie_id, bisDatum = null) {
  let q = supabase
    .from('statistik_eintraege')
    .select('wert, mitglied_id, kegelabend_id, mitglieder(id, name, spitzname), kegelabende(id, datum)')
    .eq('kategorie_id', kategorie_id)
    .not('kegelabend_id', 'is', null)
  if (bisDatum) {
    const ids = await getKegelabendIdsBis(bisDatum)
    q = q.in('kegelabend_id', ids)
  }
  const { data, error } = await q
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

export async function getAbendHighlightsDB(kegelabendId) {
  const { data } = await supabase
    .from('abend_highlights')
    .select('highlights')
    .eq('kegelabend_id', kegelabendId)
    .maybeSingle()
  return data?.highlights || null
}

export async function saveAbendHighlightsDB(kegelabendId, highlights) {
  const { error } = await supabase
    .from('abend_highlights')
    .upsert({ kegelabend_id: kegelabendId, highlights }, { onConflict: 'kegelabend_id' })
  if (error) throw error
}

export async function getAlleAbendeDaten() {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('kegelabende').select('id, datum').lte('datum', today).order('datum', { ascending: true })
  return data || []
}

export async function getAbendeVorschau() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.from('kegelabende').select('id, datum').order('datum', { ascending: false })
  if (error) throw error
  const abende = data || []
  const vergangene = abende.filter(a => a.datum <= today)
  const zukuenftige = [...abende.filter(a => a.datum > today)].reverse()
  const letzterAbend = vergangene[0] || null
  const naechsterAbend = zukuenftige[0] || null

  let teilnehmerCount = 0
  if (letzterAbend) {
    const { data: eintraege } = await supabase
      .from('statistik_eintraege').select('mitglied_id').eq('kegelabend_id', letzterAbend.id)
    teilnehmerCount = new Set((eintraege || []).map(e => e.mitglied_id)).size
  }
  return {
    letzterAbend: letzterAbend ? { ...letzterAbend, teilnehmerCount } : null,
    naechsterAbend,
  }
}

export async function getAlleHistorischenDaten(bisDatum = null) {
  const [
    { data: alleEintraegeRaw, error: e1 },
    { data: kegelabendeFull, error: e2 },
  ] = await Promise.all([
    supabase.from('statistik_eintraege')
      .select(`wert, mitglied_id, kategorie_id, kegelabend_id,
        mitglieder(id, name, spitzname),
        statistik_kategorien(id, name, einheit),
        kegelabende(id, datum)`)
      .not('kegelabend_id', 'is', null),
    supabase.from('kegelabende').select('id, datum').order('datum', { ascending: true }),
  ])
  if (e1 || e2) throw e1 || e2

  // Auf das gewünschte Datum begrenzen (für vergangene Abende)
  const alleEintraege = bisDatum
    ? (alleEintraegeRaw || []).filter(e => e.kegelabende?.datum <= bisDatum)
    : (alleEintraegeRaw || [])
  const kegelabende = bisDatum
    ? (kegelabendeFull || []).filter(a => a.datum <= bisDatum)
    : (kegelabendeFull || [])

  const anzahlAbende = kegelabende.length

  // Saison-Grenzen: März bis Februar des Folgejahres
  // Bei vergangenen Abenden: Saison relativ zum Abend-Datum berechnen
  const referenz = bisDatum ? new Date(bisDatum) : new Date()
  const year = referenz.getFullYear()
  const month = referenz.getMonth() + 1
  const seasonStartYear = month >= 3 ? year : year - 1
  const saisonStart = `${seasonStartYear}-03-01`
  const saisonEnd = `${seasonStartYear + 1}-02-28`
  const saisonLabel = `${seasonStartYear}/${String(seasonStartYear + 1).slice(2)}`
  const prevSaisonStart = `${seasonStartYear - 1}-03-01`
  const prevSaisonEnd = `${seasonStartYear}-02-28`

  const perMitgliedKat = {}
  const perMitgliedAbende = {}
  const perKatAbend = {}
  const perKatPersonAbend = {}
  const saisonPerMitgliedKat = {}
  const saisonAbende = new Set()
  const prevSaisonPerMitgliedKat = {}
  const prevSaisonAbende = new Set()
  // { "name:kat": { abendId: summe } } – für Einzelabend-Bestleistungen
  const perMitgliedKatAbend = {}

  for (const e of (alleEintraege || [])) {
    const name = e.mitglieder.spitzname || e.mitglieder.name
    const kat = e.statistik_kategorien.name
    const einheit = e.statistik_kategorien.einheit
    const wert = Number(e.wert)
    const katId = e.kategorie_id
    const abendId = e.kegelabend_id
    const mitgliedId = e.mitglied_id
    const datum = e.kegelabende?.datum

    // All-time
    if (!perMitgliedKat[name]) perMitgliedKat[name] = {}
    if (!perMitgliedKat[name][kat]) perMitgliedKat[name][kat] = { gesamt: 0, abende: new Set(), einheit }
    perMitgliedKat[name][kat].gesamt += wert
    perMitgliedKat[name][kat].abende.add(abendId)

    if (!perMitgliedAbende[name]) perMitgliedAbende[name] = new Set()
    perMitgliedAbende[name].add(abendId)

    if (einheit === '€') {
      if (!perKatAbend[katId]) perKatAbend[katId] = { katName: kat, abende: {} }
      if (!perKatAbend[katId].abende[abendId]) perKatAbend[katId].abende[abendId] = { summe: 0, datum }
      perKatAbend[katId].abende[abendId].summe += wert

      const pk = `${mitgliedId}:${abendId}`
      if (!perKatPersonAbend[katId]) perKatPersonAbend[katId] = { katName: kat, eintraege: {} }
      if (!perKatPersonAbend[katId].eintraege[pk]) perKatPersonAbend[katId].eintraege[pk] = { summe: 0, name, datum }
      perKatPersonAbend[katId].eintraege[pk].summe += wert
    }

    // Einzelabend-Tracking (für persönliche Bestleistungen)
    const mka = `${name}:${kat}`
    if (!perMitgliedKatAbend[mka]) perMitgliedKatAbend[mka] = { einheit, abende: {} }
    if (!perMitgliedKatAbend[mka].abende[abendId]) perMitgliedKatAbend[mka].abende[abendId] = 0
    perMitgliedKatAbend[mka].abende[abendId] += wert

    // Aktuelle Saison
    if (datum && datum >= saisonStart && datum <= saisonEnd) {
      saisonAbende.add(abendId)
      if (!saisonPerMitgliedKat[name]) saisonPerMitgliedKat[name] = {}
      if (!saisonPerMitgliedKat[name][kat]) saisonPerMitgliedKat[name][kat] = { gesamt: 0, abende: new Set(), einheit }
      saisonPerMitgliedKat[name][kat].gesamt += wert
      saisonPerMitgliedKat[name][kat].abende.add(abendId)
    }

    // Vorherige Saison
    if (datum && datum >= prevSaisonStart && datum <= prevSaisonEnd) {
      prevSaisonAbende.add(abendId)
      if (!prevSaisonPerMitgliedKat[name]) prevSaisonPerMitgliedKat[name] = {}
      if (!prevSaisonPerMitgliedKat[name][kat]) prevSaisonPerMitgliedKat[name][kat] = { gesamt: 0, abende: new Set(), einheit }
      prevSaisonPerMitgliedKat[name][kat].gesamt += wert
      prevSaisonPerMitgliedKat[name][kat].abende.add(abendId)
    }
  }

  // All-time Ranglisten
  const gesamtRankings = {}
  for (const [name, kats] of Object.entries(perMitgliedKat)) {
    for (const [kat, { gesamt, abende, einheit }] of Object.entries(kats)) {
      if (!gesamtRankings[kat]) gesamtRankings[kat] = { einheit, rangliste: [] }
      const schnitt = gesamt / abende.size
      gesamtRankings[kat].rangliste.push({ name, gesamt, anzahlAbende: abende.size, schnitt })
    }
  }
  for (const r of Object.values(gesamtRankings)) {
    r.rangliste.sort((a, b) => b.gesamt - a.gesamt)
  }

  // Saison-Ranglisten
  const saisonRankings = {}
  for (const [name, kats] of Object.entries(saisonPerMitgliedKat)) {
    for (const [kat, { gesamt, abende, einheit }] of Object.entries(kats)) {
      if (!saisonRankings[kat]) saisonRankings[kat] = { einheit, rangliste: [] }
      const schnitt = gesamt / abende.size
      saisonRankings[kat].rangliste.push({ name, gesamt, anzahlAbende: abende.size, schnitt })
    }
  }
  for (const r of Object.values(saisonRankings)) {
    r.rangliste.sort((a, b) => b.gesamt - a.gesamt)
  }

  // € Rekorde
  const rekorde = {}
  for (const [, { katName, abende }] of Object.entries(perKatAbend)) {
    const list = Object.values(abende)
    if (list.length === 0) continue
    const min = list.reduce((m, e) => e.summe < m.summe ? e : m)
    const max = list.reduce((m, e) => e.summe > m.summe ? e : m)
    if (!rekorde[katName]) rekorde[katName] = {}
    rekorde[katName].guenstigsterAbendGesamt = { summe: min.summe, datum: min.datum }
    rekorde[katName].teuerterAbendGesamt = { summe: max.summe, datum: max.datum }
  }
  for (const [, { katName, eintraege }] of Object.entries(perKatPersonAbend)) {
    const list = Object.values(eintraege)
    if (list.length === 0) continue
    const min = list.reduce((m, e) => e.summe < m.summe ? e : m)
    const max = list.reduce((m, e) => e.summe > m.summe ? e : m)
    if (!rekorde[katName]) rekorde[katName] = {}
    rekorde[katName].guenstigstePerson = { name: min.name, summe: min.summe, datum: min.datum }
    rekorde[katName].teuertstePerson = { name: max.name, summe: max.summe, datum: max.datum }
  }

  // Vorherige Saison Ranglisten
  const prevSaisonRankings = {}
  for (const [name, kats] of Object.entries(prevSaisonPerMitgliedKat)) {
    for (const [kat, { gesamt, abende, einheit }] of Object.entries(kats)) {
      if (!prevSaisonRankings[kat]) prevSaisonRankings[kat] = { einheit, rangliste: [] }
      prevSaisonRankings[kat].rangliste.push({ name, gesamt, anzahlAbende: abende.size, schnitt: gesamt / abende.size })
    }
  }
  for (const r of Object.values(prevSaisonRankings)) {
    r.rangliste.sort((a, b) => b.gesamt - a.gesamt)
  }

  // Einzelabend-Bestleistungen: persönliches Max und All-Time Max pro Kategorie
  const einzelAbendRekorde = {}
  for (const [mka, { einheit, abende }] of Object.entries(perMitgliedKatAbend)) {
    const [name, ...katParts] = mka.split(':')
    const kat = katParts.join(':')
    const personMax = Math.max(...Object.values(abende))
    if (!einzelAbendRekorde[kat]) einzelAbendRekorde[kat] = { einheit, allTimeMax: null, perPerson: {} }
    einzelAbendRekorde[kat].perPerson[name] = personMax
    if (!einzelAbendRekorde[kat].allTimeMax || personMax > einzelAbendRekorde[kat].allTimeMax.wert) {
      einzelAbendRekorde[kat].allTimeMax = { name, wert: personMax }
    }
  }

  // Anwesenheit
  const anwesenheit = Object.entries(perMitgliedAbende)
    .map(([name, abende]) => ({ name, anzahl: abende.size }))
    .sort((a, b) => b.anzahl - a.anzahl)

  // ── Korrelationen ─────────────────────────────────────────
  const personen = Object.keys(perMitgliedAbende)

  // Paarweise Anwesenheitskorrelationen
  const paarweiseAnwesenheit = []
  for (let i = 0; i < personen.length; i++) {
    for (let j = i + 1; j < personen.length; j++) {
      const a = personen[i]
      const b = personen[j]
      const aSet = perMitgliedAbende[a]
      const bSet = perMitgliedAbende[b]
      if (aSet.size < 3 || bSet.size < 3) continue
      let zusammen = 0
      for (const id of aSet) { if (bSet.has(id)) zusammen++ }
      paarweiseAnwesenheit.push({
        a, b, zusammen,
        totalA: aSet.size, totalB: bSet.size,
        rateA: zusammen / aSet.size,  // Anteil von A's Abenden, bei denen B auch da war
        rateB: zusammen / bSet.size,  // Anteil von B's Abenden, bei denen A auch da war
      })
    }
  }
  const auffaelligeAnwesenheit = paarweiseAnwesenheit
    .filter(p => p.rateA >= 0.75 || p.rateA <= 0.2 || p.rateB >= 0.75 || p.rateB <= 0.2)
    .sort((x, y) => {
      const extremX = Math.max(x.rateA, x.rateB, 1 - x.rateA, 1 - x.rateB)
      const extremY = Math.max(y.rateA, y.rateB, 1 - y.rateA, 1 - y.rateB)
      return extremY - extremX
    })
    .slice(0, 8)

  // Performance-Korrelationen: Wie spielt Person A wenn Person B da/nicht da ist?
  const performanceKorrelationen = []
  for (const [mka, { einheit, abende: scoreAbende }] of Object.entries(perMitgliedKatAbend)) {
    const colonIdx = mka.indexOf(':')
    const name = mka.slice(0, colonIdx)
    const kat = mka.slice(colonIdx + 1)
    const personAbende = perMitgliedAbende[name]
    if (!personAbende || personAbende.size < 5) continue

    for (const anderePerson of personen) {
      if (anderePerson === name) continue
      const andereAbende = perMitgliedAbende[anderePerson]
      if (!andereAbende || andereAbende.size < 3) continue

      const scoresMit = [], scoresOhne = []
      for (const [abendId, score] of Object.entries(scoreAbende)) {
        if (andereAbende.has(abendId)) scoresMit.push(score)
        else scoresOhne.push(score)
      }
      if (scoresMit.length < 5 || scoresOhne.length < 5) continue

      const avgMit = scoresMit.reduce((s, v) => s + v, 0) / scoresMit.length
      const avgOhne = scoresOhne.reduce((s, v) => s + v, 0) / scoresOhne.length
      const base = Math.max(Math.abs(avgMit), Math.abs(avgOhne), 0.001)
      const delta = Math.abs(avgMit - avgOhne) / base

      if (delta >= 0.2) {
        performanceKorrelationen.push({
          name, kat, einheit, anderePerson,
          avgMit: Math.round(avgMit * 100) / 100,
          avgOhne: Math.round(avgOhne * 100) / 100,
          delta: Math.round(delta * 100),
          nMit: scoresMit.length,
          nOhne: scoresOhne.length,
          besserMit: einheit === '€' ? avgMit < avgOhne : avgMit > avgOhne,
        })
      }
    }
  }
  performanceKorrelationen.sort((a, b) => b.delta - a.delta)

  // Gruppen-Abendverlauf (€-Kategorien): sortierte Liste aller Abende mit Gesamt-Summe
  const abendVerlauf = {}
  for (const [, { katName, abende }] of Object.entries(perKatAbend)) {
    abendVerlauf[katName] = Object.values(abende)
      .sort((a, b) => a.datum.localeCompare(b.datum))
      .map(e => ({ datum: e.datum, summe: e.summe }))
  }

  return {
    anzahlAbende,
    gesamtRankings,
    rekorde,
    anwesenheit,
    einzelAbendRekorde,
    abendVerlauf,
    korrelationen: {
      anwesenheit: auffaelligeAnwesenheit,
      performance: performanceKorrelationen.slice(0, 10),
    },
    saison: {
      label: saisonLabel,
      anzahlAbende: saisonAbende.size,
      rankings: saisonRankings,
    },
    vorSaison: {
      label: `${seasonStartYear - 1}/${String(seasonStartYear).slice(2)}`,
      anzahlAbende: prevSaisonAbende.size,
      rankings: prevSaisonRankings,
    },
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