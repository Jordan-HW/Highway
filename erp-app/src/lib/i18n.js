// Formate un code-barre pour affichage client : pad à gauche avec des zéros jusqu'à 13 caractères
// (les produits M&S ont souvent des UPC à 8 chiffres ; les clients FR attendent un EAN-13).
export function formatEan(val) {
  if (val == null) return ''
  const s = String(val).trim()
  if (!s) return ''
  if (!/^\d+$/.test(s)) return s
  return s.length < 13 ? s.padStart(13, '0') : s
}

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

export function displayCategorieNom(c, lang) {
  if (!c) return ''
  if (lang === 'fr') return c.nom_fr || c.nom || ''
  return c.nom || ''
}

// Tri par ordre (croissant) puis nom comme fallback
function catSort(a, b, lang) {
  const oa = a.ordre ?? 0
  const ob = b.ordre ?? 0
  if (oa !== ob) return oa - ob
  return displayCategorieNom(a, lang).localeCompare(displayCategorieNom(b, lang))
}

// Construit une liste ordonnée { cat, depth } à partir d'une liste plate
// avec parent_id (2 niveaux max : parents puis enfants).
export function buildCategoryTree(cats, lang) {
  const list = cats || []
  const parents = list.filter(c => !c.parent_id).sort((a, b) => catSort(a, b, lang))
  const out = []
  for (const p of parents) {
    out.push({ cat: p, depth: 0 })
    const children = list.filter(c => c.parent_id === p.id).sort((a, b) => catSort(a, b, lang))
    for (const child of children) out.push({ cat: child, depth: 1 })
  }
  // Familles orphelines (parent_id existe mais parent absent du filtre) : les afficher à plat
  for (const c of list) {
    if (c.parent_id && !parents.some(p => p.id === c.parent_id) && !out.some(x => x.cat.id === c.id)) {
      out.push({ cat: c, depth: 0 })
    }
  }
  return out
}

// Chemin complet d'une famille : "Parent › Enfant" si sous-famille, sinon "Nom"
export function displayCategoriePath(cat, allCats, lang) {
  if (!cat) return ''
  const self = displayCategorieNom(cat, lang)
  if (!cat.parent_id) return self
  const parent = (allCats || []).find(c => c.id === cat.parent_id)
  if (!parent) return self
  return `${displayCategorieNom(parent, lang)} › ${self}`
}

// Clé de tri composite respectant l'ordre famille (paramétré en marque) puis ordre sous-famille,
// avec le libellé produit comme tiebreaker alphabétique.
// Les produits sans famille sont renvoyés en fin de liste.
export function categorieSortKey(categorieId, allCats, libelle) {
  const pad = (n) => String(n ?? 0).padStart(6, '0')
  const lib = (libelle || '').trim().toLowerCase()
  if (!categorieId) return `999999_999999_${lib}`
  const cat = (allCats || []).find(c => c.id === categorieId)
  if (!cat) return `999999_999999_${lib}`
  if (cat.parent_id) {
    const parent = (allCats || []).find(c => c.id === cat.parent_id)
    return `${pad(parent?.ordre)}_${pad(cat.ordre)}_${lib}`
  }
  return `${pad(cat.ordre)}_000000_${lib}`
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
