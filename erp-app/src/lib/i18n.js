export function displayLibelle(p, lang) {
  if (!p) return ''
  if (lang === 'fr') return p.libelle_fr || p.libelle || ''
  return p.libelle || ''
}

export function displayLibelleCourt(p, lang) {
  if (!p) return ''
  if (lang === 'fr') return p.libelle_court_fr || p.libelle_court || ''
  return p.libelle_court || ''
}

export function displayDescription(p, lang) {
  if (!p) return ''
  if (lang === 'fr') return p.description_fr || p.description || ''
  return p.description || ''
}

export function displayIngredients(p, lang) {
  if (!p) return ''
  if (lang === 'fr') return p.ingredients_fr || p.ingredients_vo || ''
  return p.ingredients_vo || ''
}

export function loadLang(key) {
  try {
    const v = localStorage.getItem(`highway_lang_${key}`)
    return v === 'fr' ? 'fr' : 'vo'
  } catch { return 'vo' }
}

export function saveLang(key, lang) {
  try { localStorage.setItem(`highway_lang_${key}`, lang) } catch {}
}

export async function translateToFr(text) {
  const t = (text || '').trim()
  if (!t) return ''
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(t)}`)
    const data = await res.json()
    return data[0].map(s => s[0]).join('')
  } catch {
    return ''
  }
}

export async function translateBatch(items, { concurrency = 3, delayMs = 150, onProgress } = {}) {
  const results = new Array(items.length)
  let done = 0
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await translateToFr(items[i])
      done++
      if (onProgress) onProgress(done, items.length)
      if (delayMs) await new Promise(r => setTimeout(r, delayMs))
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker)
  await Promise.all(workers)
  return results
}
