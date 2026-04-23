import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Upload, X, ChevronRight, AlertTriangle, CheckCircle, RefreshCw, FileSpreadsheet, Languages } from 'lucide-react'
import * as XLSX from 'xlsx'
import { translateToFr } from '../lib/i18n'

// ─── Champs disponibles dans Highway ─────────────────────────────────────────
const HW_FIELDS = [
  { key: '__ignore__',          label: '— Ignorer cette colonne —', group: '' },
  { key: 'ean13',               label: 'EAN / Code barre * (clé)',  group: 'Général' },
  { key: 'libelle',             label: 'Libellé (VO)',              group: 'Général' },
  { key: 'libelle_fr',          label: 'Libellé (FR)',              group: 'Général' },
  { key: 'libelle_court',       label: 'Libellé court (VO)',        group: 'Général' },
  { key: 'libelle_court_fr',    label: 'Libellé court (FR)',        group: 'Général' },
  { key: 'marque',              label: 'Marque (texte)',             group: 'Général' },
  { key: 'ref_marque',          label: 'Référence marque',          group: 'Général' },
  { key: 'description',         label: 'Description (VO)',          group: 'Général' },
  { key: 'description_fr',      label: 'Description (FR)',          group: 'Général' },
  { key: 'statut',              label: 'Statut',                    group: 'Général' },
  { key: 'photo_url',           label: 'URL Photo',                 group: 'Général' },
  { key: 'conditionnement',     label: 'Conditionnement',           group: 'Colisage' },
  { key: 'unite_vente',         label: 'Unité de vente',            group: 'Colisage' },
  { key: 'pcb',                 label: 'PCB',                       group: 'Colisage' },
  { key: 'poids_brut_kg',       label: 'Poids brut (kg)',           group: 'Colisage' },
  { key: 'poids_net_kg',        label: 'Poids net (kg)',            group: 'Colisage' },
  { key: 'volume_m3',           label: 'Volume (m³)',               group: 'Colisage' },
  { key: 'longueur_cm',         label: 'Longueur (cm)',             group: 'Colisage' },
  { key: 'largeur_cm',          label: 'Largeur (cm)',              group: 'Colisage' },
  { key: 'hauteur_cm',          label: 'Hauteur (cm)',              group: 'Colisage' },
  { key: 'temperature_stockage',label: 'Température stockage',      group: 'Stockage' },
  { key: 'temperature_min_c',   label: 'Temp. min (°C)',            group: 'Stockage' },
  { key: 'temperature_max_c',   label: 'Temp. max (°C)',            group: 'Stockage' },
  { key: 'dlc_type',            label: 'Type DLC',                  group: 'Stockage' },
  { key: 'dlc_duree_jours',     label: 'Durée DLC (jours)',         group: 'Stockage' },
  { key: 'code_douanier',       label: 'Code douanier',             group: 'Douane' },
  { key: 'pays_origine',        label: 'Pays origine',              group: 'Douane' },
  { key: 'meursing_code',       label: 'Code Meursing',             group: 'Douane' },
  { key: 'ingredients_vo',      label: 'Ingrédients (VO)',          group: 'Ingrédients' },
  { key: 'ingredients_fr',      label: 'Ingrédients (FR)',          group: 'Ingrédients' },
  { key: 'allergenes',          label: 'Allergènes',                group: 'Ingrédients' },
]

const NUMERIC_FIELDS = ['pcb','poids_brut_kg','poids_net_kg','volume_m3','longueur_cm','largeur_cm','hauteur_cm','temperature_min_c','temperature_max_c','dlc_duree_jours']

// Auto-mapping basique sur les noms de colonnes
function autoMap(cols) {
  const map = {}
  const hints = {
    ean: 'ean13', ean13: 'ean13', 'ean 13': 'ean13', upc: 'ean13', barcode: 'ean13', 'code barre': 'ean13', 'code barres': 'ean13', 'code-barres': 'ean13', 'code ean': 'ean13', 'code-ean': 'ean13', gtin: 'ean13',
    libelle: 'libelle', libellé: 'libelle', label: 'libelle', 'product title': 'libelle', title: 'libelle', nom: 'libelle', name: 'libelle', 'product name': 'libelle', désignation: 'libelle', designation: 'libelle',
    'libelle court': 'libelle_court', 'libellé court': 'libelle_court', 'short name': 'libelle_court', 'short title': 'libelle_court',
    marque: 'marque', brand: 'marque',
    'ref marque': 'ref_marque', reference: 'ref_marque', référence: 'ref_marque', ref: 'ref_marque', réf: 'ref_marque', 'ref interne': 'ref_marque', 'sku': 'ref_marque',
    description: 'description', 'description vo': 'description', 'product description': 'description', descriptif: 'description',
    'description fr': 'description_fr', 'description française': 'description_fr',
    'libelle fr': 'libelle_fr', 'libellé fr': 'libelle_fr', 'french title': 'libelle_fr', 'nom fr': 'libelle_fr', 'french name': 'libelle_fr', 'libelle français': 'libelle_fr',
    'libelle court fr': 'libelle_court_fr', 'libellé court fr': 'libelle_court_fr',
    statut: 'statut', status: 'statut', état: 'statut', etat: 'statut',
    conditionnement: 'conditionnement', packaging: 'conditionnement',
    pcb: 'pcb', 'units per case': 'pcb', 'unite par carton': 'pcb',
    'poids brut': 'poids_brut_kg', 'gross weight': 'poids_brut_kg', 'poids brut kg': 'poids_brut_kg',
    'poids net': 'poids_net_kg', 'net weight': 'poids_net_kg', 'poids net kg': 'poids_net_kg',
    volume: 'volume_m3', 'volume m3': 'volume_m3',
    longueur: 'longueur_cm', length: 'longueur_cm', 'longueur cm': 'longueur_cm',
    largeur: 'largeur_cm', width: 'largeur_cm', 'largeur cm': 'largeur_cm',
    hauteur: 'hauteur_cm', height: 'hauteur_cm', 'hauteur cm': 'hauteur_cm',
    temperature: 'temperature_stockage', température: 'temperature_stockage', stockage: 'temperature_stockage', 'storage temperature': 'temperature_stockage',
    dlc: 'dlc_type', 'type dlc': 'dlc_type',
    'duree dlc': 'dlc_duree_jours', 'durée dlc': 'dlc_duree_jours', 'dlc duree': 'dlc_duree_jours', 'shelf life': 'dlc_duree_jours', 'dlc jours': 'dlc_duree_jours',
    'code douanier': 'code_douanier', hsn: 'code_douanier', 'hs code': 'code_douanier', 'code customs': 'code_douanier', 'nomenclature douanière': 'code_douanier',
    'pays origine': 'pays_origine', 'pays d origine': 'pays_origine', coo: 'pays_origine', 'country of origin': 'pays_origine', 'origin country': 'pays_origine',
    meursing: 'meursing_code', 'meursing code': 'meursing_code', 'code meursing': 'meursing_code',
    ingredients: 'ingredients_vo', ingrédients: 'ingredients_vo', 'ingredients vo': 'ingredients_vo', 'ingrédients vo': 'ingredients_vo', 'ingredient list': 'ingredients_vo', 'liste ingrédients': 'ingredients_vo',
    'ingredients fr': 'ingredients_fr', 'ingrédients fr': 'ingredients_fr', 'ingrédients français': 'ingredients_fr',
    allergenes: 'allergenes', allergènes: 'allergenes', allergens: 'allergenes', 'liste allergènes': 'allergenes',
    photo: 'photo_url', image: 'photo_url', url: 'photo_url', 'photo url': 'photo_url', 'image url': 'photo_url',
  }
  cols.forEach(col => {
    const key = col.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ')
    map[col] = hints[key] || '__ignore__'
  })
  return map
}

// ─── ÉTAPES ───────────────────────────────────────────────────────────────────
const STEPS = ['upload', 'mapping', 'validation', 'done']

export default function ImportProduits({ onClose, onImported }) {
  const [step, setStep]           = useState('upload')
  const [fileData, setFileData]   = useState(null)   // { cols, rows, filename }
  const [mapping, setMapping]     = useState({})
  const [validation, setValidation] = useState(null) // { toCreate, toUpdate, errors }
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [autoTranslate, setAutoTranslate] = useState(true)
  const [translateProgress, setTranslateProgress] = useState(null) // { done, total }
  const dropRef = useRef()

  // ── ÉTAPE 1 : Upload ────────────────────────────────────────────────────────
  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!raw.length) return toast('Fichier vide ou non reconnu', 'error')
        const cols = Object.keys(raw[0])
        const mapped = autoMap(cols)
        setFileData({ cols, rows: raw, filename: file.name })
        setMapping(mapped)
        setStep('mapping')
      } catch {
        toast('Impossible de lire ce fichier', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function onDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  // ── ÉTAPE 2 : Mapping ───────────────────────────────────────────────────────
  function setMap(col, hwKey) {
    setMapping(p => ({ ...p, [col]: hwKey }))
  }

  async function validateMapping() {
    // Vérifier que l'EAN est mappé : c'est la clé d'identification des produits
    const hasEan = Object.values(mapping).includes('ean13')
    if (!hasEan) return toast('Vous devez mapper au moins le champ "EAN / Code barre" — c\'est la clé d\'identification des produits', 'error')

    // Construire les objets produits
    const products = fileData.rows.map((row, i) => {
      const obj = { _row: i + 2 }
      Object.entries(mapping).forEach(([col, hwKey]) => {
        if (hwKey === '__ignore__') return
        let val = row[col]
        if (val === null || val === undefined) val = ''
        if (NUMERIC_FIELDS.includes(hwKey)) {
          val = val === '' ? null : parseFloat(String(val).replace(',', '.')) || null
        } else {
          val = String(val).trim()
        }
        // EAN : on normalise (supprime espaces, tirets) et on pad à 13 si numérique plus court
        if (hwKey === 'ean13' && val) {
          val = val.replace(/[\s-]/g, '')
          if (/^\d+$/.test(val) && val.length < 13) val = val.padStart(13, '0')
        }
        obj[hwKey] = val
      })
      if (!obj.statut) obj.statut = 'actif'
      return obj
    })

    // Récupérer les EAN existants
    const eans = products.map(p => p.ean13).filter(Boolean)
    let existingEans = new Map()
    if (eans.length) {
      const { data } = await supabase.from('produits').select('ean13, libelle').in('ean13', eans)
      existingEans = new Map((data || []).map(r => [r.ean13, r.libelle]))
    }

    const toCreate = []
    const toUpdate = []
    const errors   = []

    products.forEach(p => {
      // Clé obligatoire : EAN
      if (!p.ean13) { errors.push({ row: p._row, msg: 'EAN manquant — ligne ignorée (EAN est la clé)' }); return }
      if (p.ean13.length > 13) { errors.push({ row: p._row, msg: `EAN "${p.ean13}" trop long (> 13 chiffres)` }); return }
      // libelle NOT NULL en DB → obligatoire pour création, pas pour mise à jour
      const isExisting = existingEans.has(p.ean13)
      if (!isExisting && !p.libelle) { errors.push({ row: p._row, msg: `Libellé manquant pour la création du produit ${p.ean13}` }); return }
      if (isExisting) {
        toUpdate.push({ ...p, _existing: existingEans.get(p.ean13) })
      } else {
        toCreate.push(p)
      }
    })

    setValidation({ toCreate, toUpdate, errors })
    setStep('validation')
  }

  // ── ÉTAPE 3 : Import ────────────────────────────────────────────────────────
  async function doImport(includeUpdates) {
    setImporting(true)
    const { toCreate, toUpdate } = validation
    let created = 0, updated = 0, failed = 0
    const failedDetails = []

    // Nettoyer les champs internes
    const clean = p => {
      const { _row, _existing, ...rest } = p
      return rest
    }

    // Créations par batch de 50 — en cas d'erreur batch, on retry ligne par ligne pour identifier les coupables
    for (let i = 0; i < toCreate.length; i += 50) {
      const batch = toCreate.slice(i, i + 50)
      const cleaned = batch.map(clean)
      const { error } = await supabase.from('produits').insert(cleaned)
      if (!error) {
        created += batch.length
      } else {
        // Retry ligne par ligne pour trouver les erreurs précises
        for (let k = 0; k < batch.length; k++) {
          const { error: e2 } = await supabase.from('produits').insert(clean(batch[k]))
          if (e2) {
            failed++
            failedDetails.push({ row: batch[k]._row, ean: batch[k].ean13, msg: e2.message })
          } else {
            created++
          }
        }
      }
    }

    // Mises à jour
    if (includeUpdates) {
      for (const p of toUpdate) {
        const { ean13, ...data } = clean(p)
        const { error } = await supabase.from('produits').update(data).eq('ean13', ean13)
        if (error) {
          failed++
          failedDetails.push({ row: p._row, ean: p.ean13, msg: error.message })
        } else {
          updated++
        }
      }
    }

    setImportResult({ created, updated, failed, failedDetails })
    setImporting(false)

    if (autoTranslate) {
      const eansToCheck = [...toCreate, ...(includeUpdates ? toUpdate : [])].map(p => p.ean13).filter(Boolean)
      if (eansToCheck.length) {
        const { data: imported } = await supabase.from('produits').select('id, libelle, libelle_fr, libelle_court, libelle_court_fr, description, description_fr, ingredients_vo, ingredients_fr').in('ean13', eansToCheck)
        const candidates = (imported || []).filter(p =>
          (p.libelle && !p.libelle_fr) ||
          (p.libelle_court && !p.libelle_court_fr) ||
          (p.description && !p.description_fr) ||
          (p.ingredients_vo && !p.ingredients_fr)
        )
        if (candidates.length) {
          setTranslateProgress({ done: 0, total: candidates.length })
          let done = 0
          for (const p of candidates) {
            const patch = {}
            if (p.libelle && !p.libelle_fr) patch.libelle_fr = await translateToFr(p.libelle)
            if (p.libelle_court && !p.libelle_court_fr) patch.libelle_court_fr = await translateToFr(p.libelle_court)
            if (p.description && !p.description_fr) patch.description_fr = await translateToFr(p.description)
            if (p.ingredients_vo && !p.ingredients_fr) patch.ingredients_fr = await translateToFr(p.ingredients_vo)
            Object.keys(patch).forEach(k => { if (!patch[k]) delete patch[k] })
            if (Object.keys(patch).length) {
              await supabase.from('produits').update(patch).eq('id', p.id)
            }
            done++
            setTranslateProgress({ done, total: candidates.length })
            await new Promise(r => setTimeout(r, 120))
          }
          setTranslateProgress(null)
        }
      }
    }

    setStep('done')
    if (onImported) onImported()
  }

  // ─── RENDU ──────────────────────────────────────────────────────────────────
  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Import produits en masse</h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {['Fichier', 'Mapping', 'Validation', 'Terminé'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: i === stepIndex ? 'var(--primary)' : i < stepIndex ? '#e8f0eb' : 'var(--surface-2)', color: i === stepIndex ? '#fff' : i < stepIndex ? 'var(--primary)' : 'var(--text-muted)' }}>{s}</span>
                  {i < 3 && <ChevronRight size={12} color="var(--text-muted)" />}
                </div>
              ))}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── ÉTAPE 1 : Upload ── */}
          {step === 'upload' && (
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('file-input').click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s, background .2s' }}
              onDragEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onDragLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <FileSpreadsheet size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Glissez un fichier Excel ici</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ou cliquez pour choisir un fichier .xlsx / .xls / .csv</div>
              <input id="file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {/* ── ÉTAPE 2 : Mapping ── */}
          {step === 'mapping' && fileData && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                <FileSpreadsheet size={18} color="var(--primary)" />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{fileData.filename}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{fileData.rows.length} lignes détectées</span>
              </div>

              <p className="section-title">Associez les colonnes de votre fichier aux champs Highway</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fileData.cols.map(col => {
                  const preview = fileData.rows.slice(0, 2).map(r => r[col]).filter(Boolean).join(', ')
                  return (
                    <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{col}</div>
                        {preview && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>ex: {preview.slice(0, 60)}{preview.length > 60 ? '…' : ''}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                      <select
                        value={mapping[col] || '__ignore__'}
                        onChange={e => setMap(col, e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: mapping[col] && mapping[col] !== '__ignore__' ? '#e8f0eb' : 'var(--surface)', fontSize: 12, color: 'var(--text)' }}
                      >
                        {HW_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>
                            {f.group ? `[${f.group}] ${f.label}` : f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 : Validation ── */}
          {step === 'validation' && validation && (
            <>
              {/* Résumé */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'À créer', count: validation.toCreate.length, color: '#2D5A3D', bg: '#e8f0eb' },
                  { label: 'À mettre à jour', count: validation.toUpdate.length, color: '#b45309', bg: '#fef3c7' },
                  { label: 'Erreurs ignorées', count: validation.errors.length, color: '#dc2626', bg: '#fee2e2' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '14px 16px', borderRadius: 10, background: s.bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Produits à mettre à jour */}
              {validation.toUpdate.length > 0 && (
                <>
                  <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#b45309" /> Produits existants qui seront mis à jour
                  </p>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #fcd34d', borderRadius: 8, marginBottom: 16 }}>
                    {validation.toUpdate.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #fef3c7', fontSize: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 100 }}>{p.ean13}</span>
                        <span style={{ color: 'var(--text-muted)' }}>"{p._existing}"</span>
                        <ChevronRight size={12} />
                        <span style={{ fontWeight: 500 }}>"{p.libelle}"</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Erreurs */}
              {validation.errors.length > 0 && (
                <>
                  <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#dc2626" /> Lignes ignorées
                  </p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: 8, marginBottom: 16 }}>
                    {validation.errors.map((e, i) => (
                      <div key={i} style={{ padding: '6px 12px', borderBottom: '1px solid #fee2e2', fontSize: 12 }}>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Ligne {e.row}</span> — {e.msg}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
                <input type="checkbox" id="auto-translate" checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="auto-translate" style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Languages size={14} color="var(--primary)" />
                  Traduire automatiquement les libellés, descriptions et ingrédients en français après l'import
                </label>
              </div>

              {translateProgress && (
                <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--primary)' }}>Traduction en cours... {translateProgress.done}/{translateProgress.total}</div>
                  <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(100 * translateProgress.done / Math.max(1, translateProgress.total))}%`, background: 'var(--primary)', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}

              {/* Aperçu créations */}
              {validation.toCreate.length > 0 && (
                <>
                  <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} color="#2D5A3D" /> Nouveaux produits à créer (aperçu)
                  </p>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    {validation.toCreate.slice(0, 20).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                        {p.ean13 && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 100 }}>{p.ean13}</span>}
                        <span style={{ fontWeight: 500 }}>{p.libelle}</span>
                        {p.marque && <span style={{ color: 'var(--text-muted)' }}>— {p.marque}</span>}
                      </div>
                    ))}
                    {validation.toCreate.length > 20 && (
                      <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>… et {validation.toCreate.length - 20} autres</div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── ÉTAPE 4 : Terminé ── */}
          {step === 'done' && importResult && (
            <div style={{ padding: '20px 20px 40px' }}>
              <div style={{ textAlign: 'center' }}>
                <CheckCircle size={48} color="#2D5A3D" style={{ marginBottom: 20 }} />
                <h3 style={{ marginBottom: 16 }}>Import terminé !</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
                  {importResult.created > 0 && <div style={{ padding: '12px 24px', background: '#e8f0eb', borderRadius: 10 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#2D5A3D' }}>{importResult.created}</div><div style={{ fontSize: 12, color: '#2D5A3D' }}>créés</div></div>}
                  {importResult.updated > 0 && <div style={{ padding: '12px 24px', background: '#fef3c7', borderRadius: 10 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#b45309' }}>{importResult.updated}</div><div style={{ fontSize: 12, color: '#b45309' }}>mis à jour</div></div>}
                  {importResult.failed > 0 && <div style={{ padding: '12px 24px', background: '#fee2e2', borderRadius: 10 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{importResult.failed}</div><div style={{ fontSize: 12, color: '#dc2626' }}>échecs</div></div>}
                </div>
              </div>
              {importResult.failedDetails?.length > 0 && (
                <>
                  <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#dc2626" /> Détail des échecs
                  </p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: 8 }}>
                    {importResult.failedDetails.map((e, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #fee2e2', fontSize: 12 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Ligne {e.row}</span>
                          {e.ean && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>EAN {e.ean}</span>}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>{e.msg}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step === 'upload' && (
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          )}
          {step === 'mapping' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('upload')}>Retour</button>
              <button className="btn btn-primary" onClick={validateMapping}>
                Valider le mapping <ChevronRight size={15} />
              </button>
            </>
          )}
          {step === 'validation' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('mapping')}>Retour</button>
              <div style={{ display: 'flex', gap: 8 }}>
                {validation.toUpdate.length > 0 && (
                  <button className="btn btn-secondary" onClick={() => doImport(false)} disabled={importing}>
                    {importing ? <RefreshCw size={14} className="spin" /> : null}
                    Créer uniquement ({validation.toCreate.length})
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => doImport(true)} disabled={importing || (validation.toCreate.length === 0 && validation.toUpdate.length === 0)}>
                  {importing ? 'Import en cours...' : `Importer tout (${validation.toCreate.length + validation.toUpdate.length})`}
                </button>
              </div>
            </>
          )}
          {step === 'done' && (
            <button className="btn btn-primary" onClick={onClose}>Fermer</button>
          )}
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
