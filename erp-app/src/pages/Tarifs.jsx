import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Search, X, Upload, FileSpreadsheet, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Save, Plus, Trash2, Check, Percent, Package, Users, Clock, Eye, EyeOff, Settings2, GripVertical, CheckSquare, Square } from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Helpers ──
function applyRemisesCascade(basePrice, remises, produitId, marqueId, categorieId) {
  let price = basePrice
  const steps = []
  for (const r of [...remises].sort((a, b) => a.ordre - b.ordre)) {
    if (r.marque_id && r.marque_id !== marqueId) continue
    if (r.categorie_id && r.categorie_id !== categorieId) continue
    if (r.produit_ids && !r.produit_ids.includes(produitId)) continue
    price = price * (1 - r.pourcentage / 100)
    steps.push({ label: r.label || 'Remise', pct: r.pourcentage, after: Math.round(price * 100) / 100 })
  }
  return { price: Math.round(price * 100) / 100, steps }
}

// ── Column definitions ──
const PRODUCT_COLUMNS = [
  { id: 'photo', label: '', width: 28, fixed: true },
  { id: 'ean', label: 'EAN13', width: 78 },
  { id: 'produit', label: 'Produit', fixed: true },
  { id: 'tva', label: 'TVA', width: 56 },
  { id: 'achatHT', label: 'Achat HT', width: 58 },
  { id: 'achatTTC', label: 'Achat TTC', width: 58 },
  { id: 'cessionHT', label: 'Cession HT', width: 58 },
  { id: 'cessionTTC', label: 'Cession TTC', width: 62 },
  { id: 'pvcHT', label: 'PVC HT', width: 58 },
  { id: 'pvcTTC', label: 'PVC TTC', width: 58 },
  { id: 'margeHW', label: 'Marge HW', width: 64 },
  { id: 'valHW', label: 'Val. HW', width: 52 },
  { id: 'margeCl', label: 'Marge Cl.', width: 64 },
  { id: 'valCl', label: 'Val. Cl.', width: 52 },
  { id: 'actions', label: '', width: 18, fixed: true },
]

const CLIENT_COLUMNS = [
  { id: 'photo', label: '', width: 28, fixed: true },
  { id: 'ref', label: 'Réf.', width: 28, fixed: true },
  { id: 'produit', label: 'Produit', fixed: true },
  { id: 'marque', label: 'Marque' },
  { id: 'cessionHT', label: 'Cession HT', width: 58 },
  { id: 'apRemises', label: 'Ap. remises', width: 62 },
  { id: 'remises', label: 'Remises appliquées' },
  { id: 'prixFixe', label: 'Prix fixé', width: 72 },
  { id: 'prixEffectif', label: 'Prix effectif', width: 72 },
  { id: 'margeHW', label: 'Marge HW', width: 64 },
  { id: 'margeCl', label: 'Marge Cl.', width: 64 },
]

function loadColConfig(key, columns) {
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Ensure all columns are present in order (handle new columns added later)
      const allIds = columns.map(c => c.id)
      const order = [...(parsed.order || []).filter(id => allIds.includes(id))]
      allIds.forEach(id => { if (!order.includes(id)) order.push(id) })
      return { order, hidden: (parsed.hidden || []).filter(id => allIds.includes(id)) }
    }
  } catch {}
  return { order: columns.map(c => c.id), hidden: [] }
}

function saveColConfig(key, config) {
  localStorage.setItem(key, JSON.stringify(config))
}

function ColumnSettingsPanel({ columns, config, onUpdate, onClose }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const orderedCols = config.order.map(id => columns.find(c => c.id === id)).filter(Boolean)

  function toggleCol(id) {
    const hidden = config.hidden.includes(id)
      ? config.hidden.filter(x => x !== id)
      : [...config.hidden, id]
    onUpdate({ ...config, hidden })
  }

  const handleDragStart = (e, idx) => {
    const col = orderedCols[idx]
    if (col?.fixed) { e.preventDefault(); return }
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx) }
  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx == null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return }
    const newOrder = [...config.order]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(dropIdx, 0, moved)
    onUpdate({ ...config, order: newOrder })
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 300, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Colonnes</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '10px 20px 0', fontSize: 11, color: 'var(--text-muted)' }}>Glissez pour réordonner · cochez pour afficher</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {orderedCols.map((col, idx) => {
            const isVisible = !config.hidden.includes(col.id)
            const locked = col.fixed
            const isDragging = dragIdx === idx
            const isOver = overIdx === idx && dragIdx !== idx
            if (!col.label) return null // skip empty-label cols (photo, actions)
            return (
              <div key={col.id}
                draggable={!locked}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7,
                  cursor: locked ? 'default' : 'grab',
                  background: isDragging ? 'var(--primary-light)' : isVisible ? '#e8f0eb' : 'transparent',
                  opacity: isDragging ? 0.5 : locked && !isVisible ? 0.5 : 1,
                  borderTop: isOver ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'background .15s',
                }}>
                <span style={{ color: 'var(--text-muted)', cursor: locked ? 'default' : 'grab', display: 'flex' }}>
                  {locked ? <span style={{ width: 16 }} /> : <GripVertical size={14} />}
                </span>
                <div onClick={e => { e.stopPropagation(); !locked && toggleCol(col.id) }} style={{ display: 'flex', alignItems: 'center', cursor: locked ? 'default' : 'pointer' }}>
                  {isVisible ? <CheckSquare size={15} color="var(--primary)" /> : <Square size={15} color="var(--text-muted)" />}
                </div>
                <span style={{ fontSize: 13, flex: 1, opacity: isVisible ? 1 : 0.45 }}>{col.label}</span>
                {locked && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>fixe</span>}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onUpdate({ order: columns.map(c => c.id), hidden: [] })}>Réinitialiser</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Appliquer</button>
        </div>
      </div>
    </>
  )
}

export default function Tarifs() {
  const [view, setView] = useState('produit')
  const [produits, setProduits] = useState([])
  const [marques, setMarques] = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients] = useState([])
  const [tarifsAchat, setTarifsAchat] = useState([])
  const [tarifsVente, setTarifsVente] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMarque, setFilterMarque] = useState('')

  // Vue par produit — édition inline
  const [expandedId, setExpandedId] = useState(null)
  const [rowEdits, setRowEdits] = useState({}) // { [produitId]: { tva, achat, vente, pvpr } }
  const [editSource, setEditSource] = useState({}) // { [produitId]: 'achat' | 'vente' | 'pvpr' | 'tva' | 'margeHW' | 'margeClient' }
  const [savingAll, setSavingAll] = useState(false)
  const [allRemises, setAllRemises] = useState([]) // toutes les remises de tous les clients

  // Vue par client
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientRefs, setClientRefs] = useState(new Set())
  const [clientRemises, setClientRemises] = useState([])
  const [clientTarifsMap, setClientTarifsMap] = useState({})
  const [showRemises, setShowRemises] = useState(false)
  const [savingRemise, setSavingRemise] = useState(false)
  const [savingRef, setSavingRef] = useState(null)
  const [hideNonRef, setHideNonRef] = useState(false)
  // Remise product picker
  const [pickerRemiseId, setPickerRemiseId] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')

  // Column config
  const [prodColConfig, setProdColConfig] = useState(() => loadColConfig('highway_tarifs_cols_produit', PRODUCT_COLUMNS))
  const [clientColConfig, setClientColConfig] = useState(() => loadColConfig('highway_tarifs_cols_client', CLIENT_COLUMNS))
  const [showColSettings, setShowColSettings] = useState(false)

  function updateColConfig(type, newConfig) {
    if (type === 'produit') { setProdColConfig(newConfig); saveColConfig('highway_tarifs_cols_produit', newConfig) }
    else { setClientColConfig(newConfig); saveColConfig('highway_tarifs_cols_client', newConfig) }
  }

  function getVisibleCols(type) {
    const config = type === 'produit' ? prodColConfig : clientColConfig
    const allCols = type === 'produit' ? PRODUCT_COLUMNS : CLIENT_COLUMNS
    return config.order.filter(id => !config.hidden.includes(id) && allCols.some(c => c.id === id))
  }

  function colDef(type, colId) {
    return (type === 'produit' ? PRODUCT_COLUMNS : CLIENT_COLUMNS).find(c => c.id === colId)
  }

  // Photo zoom
  const [photoZoomUrl, setPhotoZoomUrl] = useState(null)

  // Editing inline (prix + marges)
  const [editingField, setEditingField] = useState(null) // '{id}-achat' | '{id}-vente' | '{id}-pvpr' | 'hw-{id}' | 'cl-{id}'
  const [editingVal, setEditingVal] = useState('')
  // Marge client choice popup
  const [margeClientChoice, setMargeClientChoice] = useState(null) // { produitId, margeVal }
  // Historique prix
  const [historiqueModal, setHistoriqueModal] = useState(null) // { produitId, libelle }
  const [historiqueData, setHistoriqueData] = useState([])
  const [historiqueFiltre, setHistoriqueFiltre] = useState('') // '' = tous, ou 'achat_ht', 'vente_ht', 'pvpr', 'tva'

  // Variations récentes (dernier changement achat par produit)
  const [recentVariations, setRecentVariations] = useState({}) // { [produitId]: { variation: number, date: string } }

  // Import modal
  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState('upload')
  const [importFile, setImportFile] = useState(null)
  const [importMapping, setImportMapping] = useState({})
  const [importValidation, setImportValidation] = useState(null)
  const [importingData, setImportingData] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: prods }, { data: mqs }, { data: cats }, { data: cls }, { data: ta }, { data: tv }, { data: ar }, { data: recentHist }] = await Promise.all([
      supabase.from('produits').select('*, marques(nom), categories(nom)').eq('statut', 'actif').order('libelle'),
      supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('categories').select('id, nom, marque_id').order('nom'),
      supabase.from('clients').select('id, nom, type').order('nom'),
      supabase.from('tarifs_achat').select('*').order('date_debut', { ascending: false }),
      supabase.from('tarifs_vente').select('*').order('date_debut', { ascending: false }),
      supabase.from('client_remises').select('*').order('ordre'),
      supabase.from('tarif_historique').select('*').eq('champ', 'achat_ht').gte('date_changement', thirtyDaysAgo).order('date_changement', { ascending: false }),
    ])
    setProduits(prods || [])
    setMarques(mqs || [])
    setCategories(cats || [])
    setClients(cls || [])
    setTarifsAchat(ta || [])
    setTarifsVente(tv || [])
    setAllRemises(ar || [])
    // Build recent variations map (most recent achat change per product in last 30 days)
    const varMap = {}
    for (const h of (recentHist || [])) {
      if (!varMap[h.produit_id] && h.ancien_prix != null && h.nouveau_prix != null && h.ancien_prix !== 0) {
        varMap[h.produit_id] = {
          variation: ((h.nouveau_prix - h.ancien_prix) / h.ancien_prix * 100),
          date: h.date_changement
        }
      }
    }
    setRecentVariations(varMap)
    setLoading(false)
  }

  function getLastAchat(produitId) { return tarifsAchat.find(t => t.produit_id === produitId) }
  function getGeneralVente(produitId) { return tarifsVente.find(t => t.produit_id === produitId && !t.client_id) }
  function getClientVente(produitId, clientId) { return tarifsVente.find(t => t.produit_id === produitId && t.client_id === clientId) }
  function countClientTarifs(produitId) { return tarifsVente.filter(t => t.produit_id === produitId && t.client_id).length }

  function calcMarge(cost, sell) {
    if (!cost || !sell || sell === 0) return null
    return ((sell - cost) / sell) * 100
  }
  function margeBadge(val) {
    if (val == null) return '—'
    const color = val >= 28 ? 'badge-green' : val >= 23 ? 'badge-orange' : 'badge-red'
    return <span className={`badge ${color}`}>{val.toFixed(2)}%</span>
  }

  const filteredProduits = produits.filter(p => {
    const s = search.toLowerCase()
    const matchSearch = p.libelle.toLowerCase().includes(s) || (p.ean13 || '').includes(s) || (p.marques?.nom || '').toLowerCase().includes(s)
    const matchMarque = !filterMarque || p.marque_id === filterMarque
    return matchSearch && matchMarque
  })

  // ════════════════════════════════════════════
  // VUE PAR PRODUIT — Accordion
  // ════════════════════════════════════════════

  // Initialise les valeurs d'édition d'une ligne à partir des données actuelles
  function getRowValues(p) {
    const achat = getLastAchat(p.id)
    const gen = getGeneralVente(p.id)
    return {
      tva: p.taux_tva ?? 5.5,
      achat: achat?.prix_achat_ht ?? '',
      vente: gen?.prix_vente_ht ?? '',
      pvpr: p.pvpr ?? '',
    }
  }

  function getEditRow(p) {
    return rowEdits[p.id] || getRowValues(p)
  }

  function setEditField(produitId, field, value) {
    setRowEdits(prev => {
      const prod = produits.find(pp => pp.id === produitId)
      const base = prev[produitId] || getRowValues(prod)
      return { ...prev, [produitId]: { ...base, [field]: value } }
    })
    setEditSource(prev => ({ ...prev, [produitId]: field }))
  }

  // Compare un champ édité vs original (normalise à 2 décimales pour les prix)
  function isFieldDirty(editVal, origVal) {
    const e = editVal === '' || editVal == null ? '' : parseFloat(editVal)
    const o = origVal === '' || origVal == null ? '' : parseFloat(origVal)
    if (e === '' && o === '') return false
    if (e === '' || o === '') return true
    return Number(Number(e).toFixed(4)) !== Number(Number(o).toFixed(4))
  }

  function getDirtyFields(p) {
    const edit = rowEdits[p.id]
    if (!edit) return {}
    const orig = getRowValues(p)
    return {
      tva: String(edit.tva) !== String(orig.tva),
      achat: isFieldDirty(edit.achat, orig.achat),
      vente: isFieldDirty(edit.vente, orig.vente),
      pvpr: isFieldDirty(edit.pvpr, orig.pvpr),
    }
  }

  function isRowDirty(p) {
    const d = getDirtyFields(p)
    return d.tva || d.achat || d.vente || d.pvpr
  }

  const hasDirtyRows = produits.some(p => isRowDirty(p))

  // Warning avant de quitter avec des modifs non sauvées (refresh / fermeture onglet)
  useEffect(() => {
    const handler = e => { if (hasDirtyRows) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasDirtyRows])


  // Formate un champ prix à 2 décimales au blur
  function formatField(produitId, field) {
    setRowEdits(prev => {
      const edit = prev[produitId]
      if (!edit || edit[field] === '' || edit[field] === null) return prev
      const val = parseFloat(edit[field])
      if (isNaN(val)) return prev
      return { ...prev, [produitId]: { ...edit, [field]: val.toFixed(2) } }
    })
  }

  // Marge HW éditée → recalcule Prix de cession HT (précision 4 déc pour détecter les micro-changements)
  function handleMargeHWChange(produitId, margeStr) {
    const marge = parseFloat(margeStr)
    if (isNaN(marge) || marge >= 100) return
    const prod = produits.find(pp => pp.id === produitId)
    setRowEdits(prev => {
      const base = prev[produitId] || getRowValues(prod)
      const achat = parseFloat(base.achat)
      if (!achat) return prev
      const newVente = achat / (1 - marge / 100)
      const newVenteStr = newVente.toFixed(4)
      return { ...prev, [produitId]: { ...base, vente: newVenteStr } }
    })
    setEditSource(prev => ({ ...prev, [produitId]: 'margeHW' }))
  }

  // Marge client éditée → ouvre le choix
  function handleMargeClientChange(produitId, margeStr) {
    const marge = parseFloat(margeStr)
    if (isNaN(marge) || marge >= 100) return
    setEditingMarge(null)
    setMargeClientChoice({ produitId, margeVal: marge })
  }

  // Applique le choix marge client
  function applyMargeClientChoice(target) {
    if (!margeClientChoice) return
    const { produitId, margeVal } = margeClientChoice
    const prod = produits.find(pp => pp.id === produitId)
    setRowEdits(prev => {
      const base = prev[produitId] || getRowValues(prod)
      const tva = parseFloat(base.tva) || 0
      if (target === 'pvpr') {
        const venteHT = parseFloat(base.vente)
        if (!venteHT) return prev
        const pvprHT = venteHT / (1 - margeVal / 100)
        const pvprTTC = (pvprHT * (1 + tva / 100)).toFixed(2)
        return { ...prev, [produitId]: { ...base, pvpr: pvprTTC } }
      } else {
        const pvprTTC = parseFloat(base.pvpr)
        if (!pvprTTC) return prev
        const pvprHT = pvprTTC / (1 + tva / 100)
        const newVente = (pvprHT * (1 - margeVal / 100)).toFixed(4)
        return { ...prev, [produitId]: { ...base, vente: newVente } }
      }
    })
    setEditSource(prev => ({ ...prev, [margeClientChoice.produitId]: 'margeClient' }))
    setMargeClientChoice(null)
  }

  function toggleAccordion(produitId) {
    setExpandedId(prev => prev === produitId ? null : produitId)
  }

  async function openHistorique(produitId, libelle) {
    setHistoriqueModal({ produitId, libelle })
    setHistoriqueFiltre('')
    const { data } = await supabase.from('tarif_historique').select('*').eq('produit_id', produitId).order('date_changement', { ascending: false }).limit(100)
    setHistoriqueData(data || [])
  }

  const champLabels = { achat_ht: 'Achat HT', vente_ht: 'Cession HT', pvpr: 'PVC TTC', tva: 'TVA %' }

  const dirtyIds = produits.filter(p => isRowDirty(p)).map(p => p.id)

  // Log un changement de prix dans l'historique
  async function logPriceChange(produitId, champ, ancienPrix, nouveauPrix, source = 'manuel') {
    const a = ancienPrix != null && ancienPrix !== '' ? parseFloat(ancienPrix) : null
    const n = nouveauPrix != null && nouveauPrix !== '' ? parseFloat(nouveauPrix) : null
    if (a === n) return // pas de changement réel
    await supabase.from('tarif_historique').insert({ produit_id: produitId, champ, ancien_prix: a, nouveau_prix: n, source })
  }

  async function saveAllDirty() {
    if (!dirtyIds.length) return
    setSavingAll(true)
    const today = new Date().toISOString().slice(0, 10)
    const r2 = v => Math.round(parseFloat(v) * 100) / 100
    let hasError = false

    for (const produitId of dirtyIds) {
      const prod = produits.find(pp => pp.id === produitId)
      const edit = getEditRow(prod)
      const orig = getRowValues(prod)

      if (edit.achat !== '' && edit.achat !== null) {
        const newVal = r2(edit.achat)
        await logPriceChange(produitId, 'achat_ht', orig.achat, newVal, 'manuel')
        const payload = { produit_id: produitId, prix_achat_ht: newVal, date_debut: today }
        const existing = getLastAchat(produitId)
        const { error } = existing
          ? await supabase.from('tarifs_achat').update(payload).eq('id', existing.id)
          : await supabase.from('tarifs_achat').insert(payload)
        if (error) { toast('Erreur prix achat : ' + error.message, 'error'); hasError = true }
      }

      if (edit.vente !== '' && edit.vente !== null) {
        const newVal = r2(edit.vente)
        await logPriceChange(produitId, 'vente_ht', orig.vente, newVal, 'manuel')
        const payload = { produit_id: produitId, client_id: null, prix_vente_ht: newVal, remise_pct: null, date_debut: today }
        const existing = getGeneralVente(produitId)
        const { error } = existing
          ? await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
          : await supabase.from('tarifs_vente').insert(payload)
        if (error) { toast('Erreur tarif général : ' + error.message, 'error'); hasError = true }
      }

      const prodUpdate = { taux_tva: parseFloat(edit.tva) }
      if (edit.pvpr !== '' && edit.pvpr !== null) {
        const newPvpr = r2(edit.pvpr)
        await logPriceChange(produitId, 'pvpr', orig.pvpr, newPvpr, 'manuel')
        prodUpdate.pvpr = newPvpr
      } else prodUpdate.pvpr = null
      if (String(edit.tva) !== String(orig.tva)) {
        await logPriceChange(produitId, 'tva', orig.tva, parseFloat(edit.tva), 'manuel')
      }
      const { error: errProd } = await supabase.from('produits').update(prodUpdate).eq('id', produitId)
      if (errProd) { toast('Erreur PVC/TVA : ' + errProd.message, 'error'); hasError = true }
    }

    setSavingAll(false)
    if (!hasError) {
      toast(`${dirtyIds.length} produit(s) enregistré(s)`, 'success')
      setRowEdits({}); setEditSource({})
    }
    fetchAll()
  }

  // ════════════════════════════════════════════
  // VUE PAR CLIENT
  // ════════════════════════════════════════════

  async function selectClient(client) {
    setSelectedClient(client)
    setShowRemises(false)
    setPickerRemiseId(null)
    const [{ data: refs }, { data: remises }, { data: tvClient }] = await Promise.all([
      supabase.from('client_produit_references').select('produit_id').eq('client_id', client.id),
      supabase.from('client_remises').select('*').eq('client_id', client.id).order('ordre'),
      supabase.from('tarifs_vente').select('*').eq('client_id', client.id),
    ])
    setClientRefs(new Set((refs || []).map(r => r.produit_id)))
    setClientRemises(remises || [])
    const map = {}
    ;(tvClient || []).forEach(t => { map[t.produit_id] = t })
    setClientTarifsMap(map)
  }

  async function toggleRef(produitId) {
    if (!selectedClient) return
    setSavingRef(produitId)
    const isRef = clientRefs.has(produitId)
    if (isRef) {
      await supabase.from('client_produit_references').delete().eq('client_id', selectedClient.id).eq('produit_id', produitId)
      setClientRefs(prev => { const n = new Set(prev); n.delete(produitId); return n })
    } else {
      await supabase.from('client_produit_references').insert({ client_id: selectedClient.id, produit_id: produitId })
      setClientRefs(prev => new Set([...prev, produitId]))
    }
    setSavingRef(null)
  }

  async function saveClientPrix(produitId, value) {
    if (!selectedClient) return
    const existing = clientTarifsMap[produitId]
    const isEmpty = value === '' || value === null || value === undefined
    if (isEmpty && existing?.id) {
      const { error } = await supabase.from('tarifs_vente').delete().eq('id', existing.id)
      if (error) return toast('Erreur : ' + error.message, 'error')
      setClientTarifsMap(prev => { const n = { ...prev }; delete n[produitId]; return n })
      fetchAll()
      return
    }
    if (isEmpty) return
    const payload = {
      produit_id: produitId, client_id: selectedClient.id,
      prix_vente_ht: Math.round(parseFloat(value) * 100) / 100,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const { data, error } = existing?.id
      ? await supabase.from('tarifs_vente').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('tarifs_vente').insert(payload).select().single()
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientTarifsMap(prev => ({ ...prev, [produitId]: data }))
    fetchAll()
  }

  async function clearFixedPrice(produitId) {
    if (!selectedClient) return
    const existing = clientTarifsMap[produitId]
    if (!existing?.id) return
    const { error } = await supabase.from('tarifs_vente').delete().eq('id', existing.id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientTarifsMap(prev => { const n = { ...prev }; delete n[produitId]; return n })
    fetchAll()
  }

  async function clearAllFixedPrices() {
    if (!selectedClient) return
    const ids = Object.values(clientTarifsMap).filter(t => t?.id).map(t => t.id)
    if (!ids.length) return toast('Aucun prix fixé', 'error')
    if (!confirm(`Supprimer ${ids.length} prix fixé(s) pour ${selectedClient.nom} ?`)) return
    const { error } = await supabase.from('tarifs_vente').delete().in('id', ids)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientTarifsMap({})
    toast(`${ids.length} prix fixé(s) supprimé(s)`, 'success')
    fetchAll()
  }

  // ── Remises CRUD ──
  async function addRemise() {
    if (!selectedClient) return
    setSavingRemise(true)
    const { data, error } = await supabase.from('client_remises').insert({
      client_id: selectedClient.id,
      label: 'Nouvelle remise',
      pourcentage: 0,
      marque_id: marques[0]?.id || null,
      categorie_id: null,
      produit_ids: null,
      ordre: clientRemises.length,
    }).select().single()
    setSavingRemise(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientRemises(prev => [...prev, data])
    setAllRemises(prev => [...prev, data])
  }

  function updateRemiseLocal(id, field, value) {
    setClientRemises(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function saveRemise(remise) {
    setSavingRemise(true)
    const { id, created_at, ...payload } = remise
    const { error } = await supabase.from('client_remises').update(payload).eq('id', id)
    setSavingRemise(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setAllRemises(prev => prev.map(r => r.id === id ? remise : r))
  }

  async function deleteRemise(id) {
    const { error } = await supabase.from('client_remises').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientRemises(prev => prev.filter(r => r.id !== id))
    setAllRemises(prev => prev.filter(r => r.id !== id))
    if (pickerRemiseId === id) setPickerRemiseId(null)
  }

  function toggleRemiseProduit(remiseId, produitId) {
    setClientRemises(prev => prev.map(r => {
      if (r.id !== remiseId) return r
      const ids = r.produit_ids || []
      const next = ids.includes(produitId) ? ids.filter(x => x !== produitId) : [...ids, produitId]
      return { ...r, produit_ids: next }
    }))
  }

  // ── Import tarifs ──
  const IMPORT_FIELDS = [
    { key: '__ignore__', label: '— Ignorer —' },
    { key: 'ean13', label: 'EAN13 (clé) *' },
    { key: 'taux_tva', label: 'TVA (%)' },
    { key: 'prix_achat_ht', label: 'Prix achat fournisseur HT' },
    { key: 'prix_vente_ht', label: 'Prix de cession général HT' },
    { key: 'pvpr', label: 'Prix de vente consommateur TTC (PVC)' },
    { key: 'client_nom', label: 'Client (nom)' },
    { key: 'prix_client_ht', label: 'Prix client HT' },
  ]

  function autoMapTarifs(cols) {
    const map = {}
    const hints = {
      ean: 'ean13', ean13: 'ean13', 'code barre': 'ean13', barcode: 'ean13', 'code barres': 'ean13', 'code ean': 'ean13',
      tva: 'taux_tva', 'taux tva': 'taux_tva', 'tva %': 'taux_tva', 'taux de tva': 'taux_tva',
      'prix achat': 'prix_achat_ht', 'achat ht': 'prix_achat_ht', 'prix achat ht': 'prix_achat_ht', 'achat fournisseur': 'prix_achat_ht', 'prix fournisseur': 'prix_achat_ht',
      'prix vente': 'prix_vente_ht', 'vente ht': 'prix_vente_ht', 'prix vente ht': 'prix_vente_ht', 'tarif general': 'prix_vente_ht', 'prix vente general': 'prix_vente_ht', 'vente general': 'prix_vente_ht', 'prix cession': 'prix_vente_ht', 'cession ht': 'prix_vente_ht', 'prix de cession': 'prix_vente_ht',
      pvpr: 'pvpr', 'prix public': 'pvpr', 'prix recommande': 'pvpr', 'prix consommateur': 'pvpr', 'pvpr ttc': 'pvpr', 'prix recommande ttc': 'pvpr', pvc: 'pvpr', 'pvc ttc': 'pvpr', 'prix vente consommateur': 'pvpr',
      client: 'client_nom', 'nom client': 'client_nom',
      'prix client': 'prix_client_ht', 'tarif client': 'prix_client_ht', 'prix client ht': 'prix_client_ht',
    }
    cols.forEach(col => { map[col] = hints[col.toLowerCase().trim().replace(/_/g, ' ')] || '__ignore__' })
    return map
  }

  function openImportModal() {
    setImportStep('upload'); setImportFile(null); setImportMapping({}); setImportValidation(null); setImportResult(null); setImportModal(true)
  }

  function handleImportFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
        if (!raw.length) return toast('Fichier vide', 'error')
        const cols = Object.keys(raw[0])
        setImportFile({ cols, rows: raw, filename: file.name })
        setImportMapping(autoMapTarifs(cols))
        setImportStep('mapping')
      } catch { toast('Impossible de lire ce fichier', 'error') }
    }
    reader.readAsArrayBuffer(file)
  }

  function validateImportMapping() {
    if (!Object.values(importMapping).includes('ean13')) return toast('Mappez la colonne EAN13', 'error')
    const eanIdx = new Map(); produits.forEach(p => { if (p.ean13) eanIdx.set(p.ean13, p) })
    const clientIdx = new Map(); clients.forEach(c => clientIdx.set(c.nom.toLowerCase(), c))
    const toProcess = [], errors = []
    importFile.rows.forEach((row, i) => {
      const obj = {}
      Object.entries(importMapping).forEach(([col, field]) => { if (field !== '__ignore__') obj[field] = String(row[col] ?? '').trim() })
      if (!obj.ean13) { errors.push({ row: i + 2, msg: 'EAN13 manquant' }); return }
      const produit = eanIdx.get(obj.ean13)
      if (!produit) { errors.push({ row: i + 2, msg: `EAN ${obj.ean13} non trouvé` }); return }
      let resolvedClient = null
      if (obj.client_nom) { resolvedClient = clientIdx.get(obj.client_nom.toLowerCase()); if (!resolvedClient) { errors.push({ row: i + 2, msg: `Client "${obj.client_nom}" non trouvé` }); return } }
      toProcess.push({ ...obj, _row: i + 2, _produit: produit, _client: resolvedClient })
    })
    setImportValidation({ toProcess, errors }); setImportStep('validation')
  }

  async function doImportTarifs() {
    setImportingData(true)
    const today = new Date().toISOString().slice(0, 10)
    let updated = 0, failed = 0
    for (const item of importValidation.toProcess) {
      const prodId = item._produit.id
      const r2 = v => Math.round(parseFloat(v) * 100) / 100
      // PVC + TVA sur fiche produit
      const prodUpdate = {}
      if (item.pvpr) prodUpdate.pvpr = r2(item.pvpr)
      if (item.taux_tva) {
        let tvaVal = parseFloat(String(item.taux_tva).replace('%', '').replace(',', '.').trim())
        if (tvaVal > 0 && tvaVal < 1) tvaVal = tvaVal * 100 // 0.055 → 5.5, 0.20 → 20
        prodUpdate.taux_tva = tvaVal
      }
      if (Object.keys(prodUpdate).length) {
        if (prodUpdate.pvpr) await logPriceChange(prodId, 'pvpr', item._produit.pvpr, prodUpdate.pvpr, 'import')
        if (prodUpdate.taux_tva) await logPriceChange(prodId, 'tva', item._produit.taux_tva, prodUpdate.taux_tva, 'import')
        const { error } = await supabase.from('produits').update(prodUpdate).eq('id', prodId); if (error) failed++
      }
      if (item.prix_achat_ht) { const ex = getLastAchat(prodId); await logPriceChange(prodId, 'achat_ht', ex?.prix_achat_ht, r2(item.prix_achat_ht), 'import'); const payload = { produit_id: prodId, prix_achat_ht: r2(item.prix_achat_ht), date_debut: today }; const { error } = ex ? await supabase.from('tarifs_achat').update(payload).eq('id', ex.id) : await supabase.from('tarifs_achat').insert(payload); if (error) { failed++; continue } }
      if (item.prix_vente_ht) { const ex = getGeneralVente(prodId); await logPriceChange(prodId, 'vente_ht', ex?.prix_vente_ht, r2(item.prix_vente_ht), 'import'); const payload = { produit_id: prodId, client_id: null, prix_vente_ht: r2(item.prix_vente_ht), remise_pct: null, date_debut: today }; const { error } = ex ? await supabase.from('tarifs_vente').update(payload).eq('id', ex.id) : await supabase.from('tarifs_vente').insert(payload); if (error) { failed++; continue } }
      if (item.prix_client_ht && item._client) { const ex = getClientVente(prodId, item._client.id); await logPriceChange(prodId, 'vente_client_' + item._client.nom, ex?.prix_vente_ht, r2(item.prix_client_ht), 'import'); const payload = { produit_id: prodId, client_id: item._client.id, prix_vente_ht: r2(item.prix_client_ht), remise_pct: null, date_debut: today, notes: 'Import Excel' }; const { error } = ex ? await supabase.from('tarifs_vente').update(payload).eq('id', ex.id) : await supabase.from('tarifs_vente').insert(payload); if (error) { failed++; continue } }
      updated++
    }
    setRowEdits({}); setEditSource({})
    setImportResult({ updated, failed }); setImportingData(false); setImportStep('done'); fetchAll()
  }

  const Thumb = ({ url }) => url
    ? <img src={url} alt="" onClick={e => { e.stopPropagation(); setPhotoZoomUrl(url) }} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
    : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={12} color="var(--text-muted)" /></div>

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Référencement et Tarifs</h2>
          <p>{view === 'produit' ? `${filteredProduits.length} produit(s)` : selectedClient ? selectedClient.nom : `${clients.length} client(s)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openImportModal}><Upload size={15} /> Importer</button>
        </div>
      </div>

      <div className="page-body" style={hasDirtyRows ? { paddingBottom: 80 } : undefined}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${view === 'produit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('produit'); setSelectedClient(null); setExpandedId(null); setShowColSettings(false) }}>
            <Package size={15} /> Vue par produit
          </button>
          <button className={`btn ${view === 'client' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('client'); setSelectedClient(null); setExpandedId(null); setShowColSettings(false) }}>
            <Users size={15} /> Vue par client
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button className={`btn ${showColSettings ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowColSettings(!showColSettings)} title="Configurer les colonnes">
              <Settings2 size={15} /> Colonnes
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-input" style={{ minWidth: 280 }}>
            <Search />
            <input placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {view === 'produit' && (
            <select className="filter-select" value={filterMarque} onChange={e => setFilterMarque(e.target.value)}>
              <option value="">Toutes les marques</option>
              {marques.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          )}
          {view === 'client' && selectedClient && (
            <button className="btn btn-secondary" onClick={() => setSelectedClient(null)} style={{ fontSize: 13 }}>
              <X size={14} /> Retour
            </button>
          )}
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <>
                {/* ══════════ VUE PAR PRODUIT ══════════ */}
                {view === 'produit' && (() => {
                  const visCols = getVisibleCols('produit')
                  return (
                  <table style={{ fontSize: 11 }}>
                    <thead>
                      <tr>
                        {visCols.map(colId => {
                          const c = colDef('produit', colId)
                          return <th key={colId} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProduits.length === 0 ? (
                        <tr><td colSpan={visCols.length}><div className="empty-state"><Package /><p>Aucun produit</p></div></td></tr>
                      ) : filteredProduits.map(p => {
                        const edit = getEditRow(p)
                        const dirty = isRowDirty(p)
                        const df = getDirtyFields(p)
                        const src = editSource[p.id] // source du changement
                        const hl = '#FFF176' // jaune fluo vif — champ source
                        const hlS = '#FFF9C4' // jaune léger — champ impacté
                        const tva = parseFloat(edit.tva) || 0
                        const achatHT = edit.achat !== '' ? parseFloat(edit.achat) : null
                        const venteHT = edit.vente !== '' ? parseFloat(edit.vente) : null
                        const pvprVal = edit.pvpr !== '' ? parseFloat(edit.pvpr) : null
                        const marge = calcMarge(achatHT, venteHT)
                        const margeHWVal = (achatHT != null && venteHT != null) ? venteHT - achatHT : null
                        const pvprHT_row = pvprVal ? pvprVal / (1 + tva / 100) : null
                        const margeClient = calcMarge(venteHT, pvprHT_row)
                        const margeClientVal = (venteHT != null && pvprHT_row != null) ? pvprHT_row - venteHT : null
                        const isExpanded = expandedId === p.id
                        const inS = { padding: '2px 3px', fontSize: 11, width: 40, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 3 }
                        const sfx = { fontSize: 10, color: '#1A1820', marginLeft: 1, userSelect: 'none' }
                        // Style valeur cliquable (sans cadre, soulignement pointillé)
                        const clickVal = { cursor: 'pointer', fontSize: 11, textAlign: 'right', borderBottom: '1px dashed var(--text-muted)', paddingBottom: 1 }

                        // Helper: champ prix cliquable / éditable
                        const priceCell = (field, val, bg) => {
                          const fk = `${p.id}-${field}`
                          if (editingField === fk) {
                            return (
                              <td style={{ padding: '2px 3px', whiteSpace: 'nowrap', background: bg }}>
                                <input type="number" step="0.01" autoFocus value={editingVal}
                                  onChange={e => setEditingVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditField(p.id, field, editingVal); formatField(p.id, field); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                                  onBlur={() => { setEditField(p.id, field, editingVal); formatField(p.id, field); setEditingField(null) }}
                                  style={inS} /><span style={sfx}>€</span>
                              </td>
                            )
                          }
                          const display = val != null ? val.toFixed(2) : '—'
                          return (
                            <td style={{ padding: '2px 6px', background: bg }} onClick={() => { setEditingVal(val != null ? val.toFixed(2) : ''); setEditingField(fk) }}>
                              <span style={clickVal}>{display}</span><span style={sfx}> €</span>
                            </td>
                          )
                        }

                        // Build cells map for dynamic column rendering
                        const cells = {
                          photo: <td key="photo" style={{ padding: '2px 4px' }}><Thumb url={p.photo_url} /></td>,
                          ean: <td key="ean" style={{ padding: '2px 6px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p.ean13 || '—'}</td>,
                          produit: <td key="produit" style={{ cursor: 'pointer', padding: '2px 6px' }} onClick={() => toggleAccordion(p.id)}><div style={{ fontWeight: 500, fontSize: 12 }}>{p.libelle}</div></td>,
                          tva: <td key="tva" style={{ padding: '2px 6px', background: df.tva ? (src === 'tva' ? hl : hlS) : undefined }} onClick={() => { if (editingField !== `${p.id}-tva`) setEditingField(`${p.id}-tva`) }}>
                            {editingField === `${p.id}-tva` ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <select autoFocus value={edit.tva} onChange={e => { setEditField(p.id, 'tva', parseFloat(e.target.value)); setEditingField(null) }} onBlur={() => setEditingField(null)} style={{ padding: '2px 2px', fontSize: 11, flex: 1, minWidth: 0 }}>
                                  <option value="0">0</option><option value="5.5">5.5</option><option value="10">10</option><option value="20">20</option>
                                </select>
                                <span style={sfx}>%</span>
                              </div>
                            ) : <span style={clickVal}>{tva}<span style={sfx}> %</span></span>}
                          </td>,
                          achatHT: priceCell('achat', achatHT, df.achat ? (src === 'achat' ? hl : hlS) : undefined),
                          achatTTC: <td key="achatTTC" style={{ padding: '2px 6px', fontSize: 11, background: (df.achat || df.tva) ? hlS : undefined }}>{achatHT != null ? `${(achatHT * (1 + tva / 100)).toFixed(2)} €` : '—'}</td>,
                          cessionHT: priceCell('vente', venteHT, df.vente ? (src === 'vente' ? hl : hlS) : undefined),
                          cessionTTC: <td key="cessionTTC" style={{ padding: '2px 6px', fontSize: 11, background: (df.vente || df.tva) ? hlS : undefined }}>{venteHT != null ? `${(venteHT * (1 + tva / 100)).toFixed(2)} €` : '—'}</td>,
                          pvcHT: <td key="pvcHT" style={{ padding: '2px 6px', fontSize: 11, background: (df.pvpr || df.tva) ? hlS : undefined }}>{pvprHT_row != null ? `${pvprHT_row.toFixed(2)} €` : '—'}</td>,
                          pvcTTC: priceCell('pvpr', pvprVal, df.pvpr ? (src === 'pvpr' ? hl : hlS) : undefined),
                          margeHW: <td key="margeHW" style={{ padding: '3px 4px', verticalAlign: 'middle', background: src === 'margeHW' ? hl : (df.achat || df.vente) ? hlS : undefined }}>
                            {editingField === `hw-${p.id}` ? (
                              <input type="number" step="0.1" autoFocus value={editingVal}
                                onChange={e => setEditingVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMargeHWChange(p.id, editingVal); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                                onBlur={() => { handleMargeHWChange(p.id, editingVal); setEditingField(null) }}
                                style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} />
                            ) : <span style={{ cursor: 'pointer' }} onClick={() => { setEditingVal(marge != null ? marge.toFixed(2) : ''); setEditingField(`hw-${p.id}`) }}>{margeBadge(marge)}</span>}
                          </td>,
                          valHW: <td key="valHW" style={{ padding: '3px 6px', fontSize: 11, verticalAlign: 'middle', background: src === 'margeHW' ? hl : (df.achat || df.vente) ? hlS : undefined }}>{margeHWVal != null ? `${margeHWVal.toFixed(2)} €` : '—'}</td>,
                          margeCl: <td key="margeCl" style={{ padding: '3px 4px', verticalAlign: 'middle', background: src === 'margeClient' ? hl : (df.vente || df.pvpr) ? hlS : undefined }}>
                            {editingField === `cl-${p.id}` ? (
                              <input type="number" step="0.1" autoFocus value={editingVal}
                                onChange={e => setEditingVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMargeClientChange(p.id, editingVal); } if (e.key === 'Escape') setEditingField(null) }}
                                onBlur={() => { handleMargeClientChange(p.id, editingVal) }}
                                style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} />
                            ) : <span style={{ cursor: 'pointer' }} onClick={() => { setEditingVal(margeClient != null ? margeClient.toFixed(2) : ''); setEditingField(`cl-${p.id}`) }}>{margeBadge(margeClient)}</span>}
                          </td>,
                          valCl: <td key="valCl" style={{ padding: '3px 6px', fontSize: 11, verticalAlign: 'middle', background: src === 'margeClient' ? hl : (df.vente || df.pvpr) ? hlS : undefined }}>{margeClientVal != null ? `${margeClientVal.toFixed(2)} €` : '—'}</td>,
                          actions: <td key="actions" style={{ padding: '3px 2px', whiteSpace: 'nowrap' }}>
                            <Clock size={12} style={{ cursor: 'pointer', color: 'var(--text-muted)', marginRight: 1 }} onClick={() => openHistorique(p.id, p.libelle)} />
                            {recentVariations[p.id] && (() => {
                              const v = recentVariations[p.id].variation
                              const isUp = v > 0
                              return <span style={{ fontSize: 9, fontWeight: 600, color: isUp ? '#C0392B' : '#27AE60', marginRight: 2, cursor: 'pointer' }} onClick={() => openHistorique(p.id, p.libelle)} title={`Variation achat récente`}>{isUp ? '↑' : '↓'}{Math.abs(v).toFixed(1)}%</span>
                            })()}
                            <span style={{ cursor: 'pointer' }} onClick={() => toggleAccordion(p.id)}>{isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                          </td>,
                        }

                        return [
                          <tr key={p.id} style={{ background: isExpanded ? 'var(--primary-light)' : undefined }}>
                            {visCols.map(colId => cells[colId])}
                          </tr>,
                          isExpanded && (() => {
                            const achatVal = achatHT
                            const genVal = venteHT
                            const pvprHTc = pvprVal ? pvprVal / (1 + tva / 100) : null
                            const clientRows = clients.map(c => {
                              const fixed = getClientVente(p.id, c.id)
                              const remisesClient = allRemises.filter(r => r.client_id === c.id)
                              const result = genVal ? applyRemisesCascade(genVal, remisesClient, p.id, p.marque_id, p.categorie_id) : null
                              const afterRemises = result?.price ?? null
                              const steps = result?.steps || []
                              const hasFixed = !!fixed
                              const prixFinal = hasFixed ? fixed.prix_vente_ht : afterRemises
                              if (!prixFinal && !steps.length) return null
                              const mHW = achatVal && prixFinal ? ((prixFinal - achatVal) / prixFinal * 100) : null
                              const mHWv = achatVal && prixFinal ? prixFinal - achatVal : null
                              const mCl = pvprHTc && prixFinal ? ((pvprHTc - prixFinal) / pvprHTc * 100) : null
                              const mClv = pvprHTc && prixFinal ? pvprHTc - prixFinal : null
                              const prixFinalTTC = prixFinal ? prixFinal * (1 + tva / 100) : null
                              return { id: c.id, nom: c.nom, genVal, steps, afterRemises, fixedPrice: hasFixed ? fixed.prix_vente_ht : null, prixFinal, prixFinalTTC, mHW, mHWv, mCl, mClv }
                            }).filter(Boolean)
                            if (!clientRows.length) return null
                            const cs = { fontSize: 10, padding: '3px 6px', background: 'var(--surface-2)' }
                            const hs = { fontSize: 9, padding: '2px 6px', background: 'var(--surface-2)', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }
                            // Accordion header cells
                            const hdrCells = {
                              photo: <td key="photo" style={hs}></td>,
                              ean: <td key="ean" style={hs}></td>,
                              produit: <td key="produit" style={hs}>Client</td>,
                              tva: <td key="tva" style={hs}>Prix fixé</td>,
                              achatHT: <td key="achatHT" style={hs}>Prix gén.</td>,
                              achatTTC: <td key="achatTTC" style={hs}>Ap. rem.</td>,
                              cessionHT: <td key="cessionHT" style={{ ...hs, fontWeight: 700, color: 'var(--text-primary)' }}>Final HT</td>,
                              cessionTTC: <td key="cessionTTC" style={hs}>Final TTC</td>,
                              pvcHT: <td key="pvcHT" style={hs}>PVC HT</td>,
                              pvcTTC: <td key="pvcTTC" style={hs}>PVC TTC</td>,
                              margeHW: <td key="margeHW" style={hs}>Marge HW</td>,
                              valHW: <td key="valHW" style={hs}>Val. HW</td>,
                              margeCl: <td key="margeCl" style={hs}>Marge Cl.</td>,
                              valCl: <td key="valCl" style={hs}>Val. Cl.</td>,
                              actions: <td key="actions" style={hs}></td>,
                            }
                            return [
                              <tr key={`${p.id}-cl-hdr`}>
                                {visCols.map(colId => hdrCells[colId])}
                              </tr>,
                              ...clientRows.map(cr => {
                                const crCells = {
                                  photo: <td key="photo" style={{ ...cs, padding: '3px 2px', textAlign: 'center', color: 'var(--text-muted)' }}>↳</td>,
                                  ean: <td key="ean" style={cs}></td>,
                                  produit: <td key="produit" style={{ ...cs, fontWeight: 500 }}>
                                    <span>{cr.nom}</span>
                                    {cr.steps.length > 0 && <span style={{ marginLeft: 6 }}>{cr.steps.map((s, i) => (
                                      <span key={i} title={`${s.label} → ${s.after.toFixed(2)} €`} style={{ fontSize: 8, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 4px', borderRadius: 3, fontWeight: 600, marginRight: 2 }}>-{s.pct}%</span>
                                    ))}</span>}
                                    {cr.fixedPrice != null && <span style={{ fontSize: 8, background: '#E6C547', color: '#5C4B00', padding: '1px 4px', borderRadius: 3, fontWeight: 700, marginLeft: 4 }}>FIXÉ</span>}
                                  </td>,
                                  tva: <td key="tva" style={cs}>{cr.fixedPrice != null ? <span style={{ fontWeight: 600 }}>{cr.fixedPrice.toFixed(2)}</span> : ''}</td>,
                                  achatHT: <td key="achatHT" style={{ ...cs, color: 'var(--text-muted)' }}>{cr.genVal != null ? `${cr.genVal.toFixed(2)}` : '—'}</td>,
                                  achatTTC: <td key="achatTTC" style={{ ...cs, color: 'var(--text-muted)' }}>{cr.afterRemises != null ? `${cr.afterRemises.toFixed(2)}` : '—'}</td>,
                                  cessionHT: <td key="cessionHT" style={{ ...cs, fontWeight: 700 }}>{cr.prixFinal != null ? `${cr.prixFinal.toFixed(2)} €` : '—'}</td>,
                                  cessionTTC: <td key="cessionTTC" style={cs}>{cr.prixFinalTTC != null ? `${cr.prixFinalTTC.toFixed(2)} €` : '—'}</td>,
                                  pvcHT: <td key="pvcHT" style={cs}>{pvprHT_row != null ? `${pvprHT_row.toFixed(2)} €` : '—'}</td>,
                                  pvcTTC: <td key="pvcTTC" style={cs}>{pvprVal ? `${pvprVal.toFixed(2)} €` : '—'}</td>,
                                  margeHW: <td key="margeHW" style={cs}>{cr.mHW != null ? margeBadge(cr.mHW) : '—'}</td>,
                                  valHW: <td key="valHW" style={cs}>{cr.mHWv != null ? `${cr.mHWv.toFixed(2)} €` : '—'}</td>,
                                  margeCl: <td key="margeCl" style={cs}>{cr.mCl != null ? margeBadge(cr.mCl) : '—'}</td>,
                                  valCl: <td key="valCl" style={cs}>{cr.mClv != null ? `${cr.mClv.toFixed(2)} €` : '—'}</td>,
                                  actions: <td key="actions" style={cs}></td>,
                                }
                                return (
                                  <tr key={`${p.id}-cl-${cr.id}`} style={{ background: cr.fixedPrice != null ? '#FFF8E7' : 'var(--surface-2)' }}>
                                    {visCols.map(colId => crCells[colId])}
                                  </tr>
                                )
                              })]
                          })(),
                        ]
                      })}
                    </tbody>
                  </table>
                  )})()}

                {/* ══════════ VUE PAR CLIENT — Liste ══════════ */}
                {view === 'client' && !selectedClient && (
                  <table>
                    <thead>
                      <tr><th>Client</th><th>Type</th><th>Tarifs spécifiques</th></tr>
                    </thead>
                    <tbody>
                      {clients.length === 0 ? (
                        <tr><td colSpan={3}><div className="empty-state"><Users /><p>Aucun client</p></div></td></tr>
                      ) : clients.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase())).map(c => {
                        const nb = tarifsVente.filter(t => t.client_id === c.id).length
                        return (
                          <tr key={c.id} onClick={() => selectClient(c)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 500 }}>{c.nom}</td>
                            <td><span className={`badge ${c.type === 'centrale' ? 'badge-blue' : c.type === 'grossiste' ? 'badge-orange' : 'badge-gray'}`}>{c.type}</span></td>
                            <td>{nb > 0 ? <span className="badge badge-blue">{nb}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* ══════════ VUE PAR CLIENT — Détail ══════════ */}
                {view === 'client' && selectedClient && (
                  <>
                    {/* Header */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Users size={16} color="var(--primary)" />
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedClient.nom}</span>
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>{clientRefs.size} référencé(s)</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {Object.keys(clientTarifsMap).length > 0 && (
                            <button className="btn btn-secondary" onClick={clearAllFixedPrices} style={{ fontSize: 11, color: '#C0392B' }}>
                              <Trash2 size={13} /> Supprimer tous les prix fixés ({Object.values(clientTarifsMap).filter(t => t?.id).length})
                            </button>
                          )}
                          <button className={`btn ${hideNonRef ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHideNonRef(!hideNonRef)} style={{ fontSize: 11 }}>
                            {hideNonRef ? <EyeOff size={13} /> : <Eye size={13} />} {hideNonRef ? 'Référencés seuls' : 'Tous les produits'}
                          </button>
                          <button className={`btn ${showRemises ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowRemises(!showRemises)} style={{ fontSize: 12 }}>
                            <Percent size={14} /> Remises ({clientRemises.length})
                          </button>
                        </div>
                      </div>

                      {/* ── Panel remises en cascade ── */}
                      {showRemises && (
                        <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Remises en cascade</span>
                            <button className="btn btn-secondary" onClick={addRemise} disabled={savingRemise} style={{ fontSize: 11, padding: '4px 10px' }}>
                              <Plus size={13} /> Ajouter une remise
                            </button>
                          </div>

                          {clientRemises.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                              Aucune remise. Les prix de cession s'appliquent tels quels.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {clientRemises.map((r, idx) => {
                                const remiseMarque = marques.find(m => m.id === r.marque_id)
                                const marqueProduits = produits.filter(p => p.marque_id === r.marque_id)
                                // Familles disponibles pour ce dropdown : si marque sélectionnée, familles spécifiques à cette marque + familles générales ; sinon toutes
                                const availableCategories = r.marque_id
                                  ? categories.filter(c => c.marque_id === r.marque_id || c.marque_id === null)
                                  : categories
                                const isPicking = pickerRemiseId === r.id

                                return (
                                  <div key={r.id} style={{ background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                    {/* Ligne principale */}
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px' }}>
                                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, width: 22, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>

                                      <input
                                        value={r.label}
                                        onChange={e => updateRemiseLocal(r.id, 'label', e.target.value)}
                                        onBlur={() => saveRemise(r)}
                                        placeholder="Nom de la remise"
                                        style={{ flex: 1, padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, minWidth: 0 }}
                                      />

                                      <select
                                        value={r.marque_id || ''}
                                        onChange={e => {
                                          const newMarqueId = e.target.value || null
                                          // Si la famille actuelle n'est plus compatible avec la marque, on la reset
                                          const currentCat = categories.find(c => c.id === r.categorie_id)
                                          const keepCat = !r.categorie_id || !currentCat || currentCat.marque_id === null || currentCat.marque_id === newMarqueId
                                          const nextCatId = keepCat ? r.categorie_id : null
                                          updateRemiseLocal(r.id, 'marque_id', newMarqueId)
                                          updateRemiseLocal(r.id, 'categorie_id', nextCatId)
                                          updateRemiseLocal(r.id, 'produit_ids', null)
                                          saveRemise({ ...r, marque_id: newMarqueId, categorie_id: nextCatId, produit_ids: null })
                                        }}
                                        style={{ padding: '5px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, maxWidth: 140 }}
                                      >
                                        <option value="">Tous fournisseurs</option>
                                        {marques.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                                      </select>

                                      <select
                                        value={r.categorie_id || ''}
                                        onChange={e => {
                                          const val = e.target.value || null
                                          updateRemiseLocal(r.id, 'categorie_id', val)
                                          saveRemise({ ...r, categorie_id: val })
                                        }}
                                        title="Famille de produits"
                                        style={{ padding: '5px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, maxWidth: 140 }}
                                      >
                                        <option value="">Toutes familles</option>
                                        {availableCategories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                      </select>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                        <input
                                          type="number" step="0.1"
                                          value={r.pourcentage}
                                          onChange={e => updateRemiseLocal(r.id, 'pourcentage', parseFloat(e.target.value) || 0)}
                                          onBlur={() => saveRemise(r)}
                                          style={{ width: 55, padding: '5px 6px', fontSize: 12, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 4 }}
                                        />
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                                      </div>

                                      <select
                                        value={r.produit_ids === null ? 'all' : 'selection'}
                                        onChange={e => {
                                          const val = e.target.value === 'all' ? null : []
                                          updateRemiseLocal(r.id, 'produit_ids', val)
                                          saveRemise({ ...r, produit_ids: val })
                                          if (e.target.value === 'selection') setPickerRemiseId(r.id)
                                          else setPickerRemiseId(null)
                                        }}
                                        style={{ padding: '5px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4 }}
                                      >
                                        <option value="all">Tous les produits</option>
                                        <option value="selection">Sélection</option>
                                      </select>

                                      {r.produit_ids !== null && (
                                        <button
                                          className="btn btn-secondary"
                                          onClick={() => setPickerRemiseId(isPicking ? null : r.id)}
                                          style={{ fontSize: 10, padding: '3px 8px', whiteSpace: 'nowrap' }}
                                        >
                                          {r.produit_ids.length} produit(s)
                                        </button>
                                      )}

                                      <button className="btn-icon" onClick={() => deleteRemise(r.id)} title="Supprimer"><Trash2 size={13} /></button>
                                    </div>

                                    {/* Product picker */}
                                    {isPicking && (
                                      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', background: 'var(--primary-light)' }}>
                                        <div style={{ marginBottom: 8 }}>
                                          <input
                                            placeholder="Rechercher un produit..."
                                            value={pickerSearch}
                                            onChange={e => setPickerSearch(e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
                                          />
                                        </div>
                                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          {(r.marque_id ? marqueProduits : produits)
                                            .filter(p => !r.categorie_id || p.categorie_id === r.categorie_id)
                                            .filter(p => !pickerSearch || p.libelle.toLowerCase().includes(pickerSearch.toLowerCase()))
                                            .map(p => {
                                              const selected = (r.produit_ids || []).includes(p.id)
                                              return (
                                                <div key={p.id} onClick={() => {
                                                  toggleRemiseProduit(r.id, p.id)
                                                }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', background: selected ? 'var(--surface)' : 'transparent' }}>
                                                  <div style={{
                                                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: selected ? 'var(--primary)' : 'var(--surface)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                  }}>
                                                    {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                                                  </div>
                                                  <Thumb url={p.photo_url} />
                                                  <span style={{ fontSize: 12 }}>{p.libelle}</span>
                                                  {!r.marque_id && p.marques?.nom && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{p.marques.nom}</span>}
                                                </div>
                                              )
                                            })}
                                        </div>
                                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                          <button className="btn btn-primary" onClick={() => { saveRemise(clientRemises.find(x => x.id === r.id)); setPickerRemiseId(null) }} style={{ fontSize: 11, padding: '4px 12px' }}>
                                            OK
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Preview cascade */}
                              <div style={{ marginTop: 4, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 6, fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                <strong>Cascade :</strong>
                                {clientRemises.map((r, i) => (
                                  <span key={r.id}>
                                    <span style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                      {r.label || `#${i + 1}`} -{r.pourcentage}%
                                      {r.marque_id && <span style={{ color: 'var(--text-muted)' }}> ({marques.find(m => m.id === r.marque_id)?.nom})</span>}
                                      {r.categorie_id && <span style={{ color: 'var(--text-muted)' }}> · {categories.find(c => c.id === r.categorie_id)?.nom}</span>}
                                      {r.produit_ids !== null && <span style={{ color: 'var(--text-muted)' }}> [{r.produit_ids.length}]</span>}
                                    </span>
                                    {i < clientRemises.length - 1 && <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>→</span>}
                                  </span>
                                ))}
                                <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                                  Base 100 € → {applyRemisesCascade(100, clientRemises, null, null, null).price.toFixed(2)} €
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Produits table */}
                    {(() => {
                      const clVisCols = getVisibleCols('client')
                      return (
                    <table style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          {clVisCols.map(colId => {
                            const c = colDef('client', colId)
                            return <th key={colId} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProduits.filter(p => !hideNonRef || clientRefs.has(p.id)).map(p => {
                          const isRef = clientRefs.has(p.id)
                          const general = getGeneralVente(p.id)
                          const genPrice = general?.prix_vente_ht || null
                          const ct = clientTarifsMap[p.id]
                          const remiseResult = genPrice ? applyRemisesCascade(genPrice, clientRemises, p.id, p.marque_id, p.categorie_id) : null
                          const afterRemises = remiseResult?.price ?? null
                          const remiseSteps = remiseResult?.steps || []
                          const hasRemises = remiseSteps.length > 0
                          const isFixed = ct?.prix_vente_ht != null && ct?.prix_vente_ht !== ''
                          const effectif = isFixed ? parseFloat(ct.prix_vente_ht) : afterRemises
                          const achat = getLastAchat(p.id)
                          const marge = calcMarge(achat?.prix_achat_ht, effectif)
                          const tva = parseFloat(p.taux_tva) || 5.5
                          const pvpTTC = p.pvpr != null && p.pvpr !== '' ? parseFloat(p.pvpr) : null
                          const pvpHT = pvpTTC ? pvpTTC / (1 + tva / 100) : null
                          const margeCl = calcMarge(effectif, pvpHT)

                          const clCells = {
                            photo: <td key="photo" style={{ padding: '2px 4px' }}><Thumb url={p.photo_url} /></td>,
                            ref: <td key="ref" style={{ padding: '2px 4px' }}>
                              <button onClick={() => toggleRef(p.id)} disabled={savingRef === p.id} style={{
                                width: 22, height: 22, borderRadius: 4, border: `2px solid ${isRef ? 'var(--primary)' : 'var(--border)'}`,
                                background: isRef ? 'var(--primary)' : 'var(--surface)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                              }}>
                                {isRef && <Check size={11} color="#fff" strokeWidth={3} />}
                              </button>
                            </td>,
                            produit: <td key="produit" style={{ padding: '2px 6px' }}>
                              <div style={{ fontWeight: 500, fontSize: 12 }}>{p.libelle}</div>
                              {p.ean13 && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.ean13}</div>}
                            </td>,
                            marque: <td key="marque" style={{ padding: '2px 6px' }}>{p.marques?.nom || '—'}</td>,
                            cessionHT: <td key="cessionHT" style={{ padding: '2px 6px' }}>{genPrice != null ? `${Number(genPrice).toFixed(2)} €` : '—'}</td>,
                            apRemises: <td key="apRemises" style={{ padding: '2px 6px', color: hasRemises ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {afterRemises != null ? `${afterRemises.toFixed(2)} €` : '—'}
                            </td>,
                            remises: <td key="remises" style={{ padding: '2px 6px' }}>
                              {remiseSteps.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                  {remiseSteps.map((s, i) => (
                                    <span key={i} title={`${s.label} → ${s.after.toFixed(2)} €`} style={{ fontSize: 8, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>
                                      {s.label} -{s.pct}%
                                    </span>
                                  ))}
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>,
                            prixFixe: <td key="prixFixe" style={{ padding: '2px 6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <input type="number" step="0.01"
                                  value={ct?.prix_vente_ht ?? ''}
                                  onChange={e => setClientTarifsMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], prix_vente_ht: e.target.value, produit_id: p.id, client_id: selectedClient.id } }))}
                                  onBlur={e => saveClientPrix(p.id, e.target.value)}
                                  placeholder="—"
                                  style={{ width: 60, padding: '2px 4px', fontSize: 11, borderRadius: 3, border: isFixed ? '1px solid #E6C547' : '1px solid var(--border)', background: isFixed ? '#FFF8E7' : 'var(--surface)' }}
                                />
                                {isFixed && (
                                  <button className="btn-icon" onClick={() => clearFixedPrice(p.id)} title="Supprimer le prix fixé" style={{ color: '#C0392B', padding: 1 }}>
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            </td>,
                            prixEffectif: <td key="prixEffectif" style={{ padding: '2px 6px', fontWeight: 600 }}>
                              {effectif != null ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  {effectif.toFixed(2)} €
                                  {isFixed && <span style={{ fontSize: 8, background: '#E6C547', color: '#5C4B00', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>FIXÉ</span>}
                                </span>
                              ) : '—'}
                            </td>,
                            margeHW: <td key="margeHW" style={{ padding: '3px 4px' }}>{margeBadge(marge)}</td>,
                            margeCl: <td key="margeCl" style={{ padding: '3px 4px' }}>{margeBadge(margeCl)}</td>,
                          }

                          return (
                            <tr key={p.id} style={{ opacity: isRef ? 1 : 0.5, background: isFixed ? '#FFF8E7' : undefined }}>
                              {clVisCols.map(colId => clCells[colId])}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                      )})()}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal import tarifs ── */}
      {importModal && (
        <div className="modal-overlay" onClick={() => setImportModal(false)}>
          <div className="modal" style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Import tarifs depuis Excel</h3>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {['Fichier', 'Mapping', 'Validation', 'Terminé'].map((s, i) => {
                    const idx = ['upload', 'mapping', 'validation', 'done'].indexOf(importStep)
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: i === idx ? 'var(--primary)' : i < idx ? '#e8f0eb' : 'var(--surface-2)', color: i === idx ? '#fff' : i < idx ? 'var(--primary)' : 'var(--text-muted)' }}>{s}</span>
                        {i < 3 && <ChevronRight size={12} color="var(--text-muted)" />}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setImportModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              {importStep === 'upload' && (
                <div onDrop={e => { e.preventDefault(); handleImportFile(e.dataTransfer.files[0]) }} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('tarif-file-input').click()} style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '60px 40px', textAlign: 'center', cursor: 'pointer' }}>
                  <FileSpreadsheet size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Glissez un fichier Excel ici</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>ou cliquez pour choisir</div>
                  <input id="tarif-file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleImportFile(e.target.files[0])} />
                </div>
              )}
              {importStep === 'mapping' && importFile && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
                    <FileSpreadsheet size={18} color="var(--primary)" />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{importFile.filename}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{importFile.rows.length} lignes</span>
                  </div>
                  <p className="section-title">Associez les colonnes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {importFile.cols.map(col => {
                      const preview = importFile.rows.slice(0, 2).map(r => r[col]).filter(Boolean).join(', ')
                      return (
                        <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{col}</div>
                            {preview && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>ex: {preview.slice(0, 60)}</div>}
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                          <select value={importMapping[col] || '__ignore__'} onChange={e => setImportMapping(p => ({ ...p, [col]: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: importMapping[col] && importMapping[col] !== '__ignore__' ? '#e8f0eb' : 'var(--surface)', fontSize: 12 }}>
                            {IMPORT_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {importStep === 'validation' && importValidation && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 10, background: '#e8f0eb', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#2D5A3D' }}>{importValidation.toProcess.length}</div>
                      <div style={{ fontSize: 12, color: '#2D5A3D' }}>À importer</div>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fee2e2', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{importValidation.errors.length}</div>
                      <div style={{ fontSize: 12, color: '#dc2626' }}>Erreurs</div>
                    </div>
                  </div>
                  {importValidation.errors.length > 0 && (
                    <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid #fca5a5', borderRadius: 8, marginBottom: 16 }}>
                      {importValidation.errors.map((e, i) => (
                        <div key={i} style={{ padding: '6px 12px', borderBottom: '1px solid #fee2e2', fontSize: 12 }}>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Ligne {e.row}</span> — {e.msg}
                        </div>
                      ))}
                    </div>
                  )}
                  {importValidation.toProcess.length > 0 && (
                    <div className="table-container" style={{ maxHeight: 250, overflowY: 'auto' }}>
                      <table>
                        <thead><tr><th>EAN</th><th>Produit</th><th>Achat</th><th>Cession</th><th>PVC</th><th>Client</th><th>Prix client</th></tr></thead>
                        <tbody>
                          {importValidation.toProcess.slice(0, 30).map((item, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.ean13}</td>
                              <td style={{ fontWeight: 500, fontSize: 12 }}>{item._produit.libelle}</td>
                              <td>{item.prix_achat_ht || '—'}</td><td>{item.prix_vente_ht || '—'}</td><td>{item.pvpr || '—'}</td>
                              <td style={{ fontSize: 12 }}>{item._client?.nom || '—'}</td><td>{item.prix_client_ht || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {importStep === 'done' && importResult && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle size={48} color="#2D5A3D" style={{ marginBottom: 20 }} />
                  <h3 style={{ marginBottom: 16 }}>Import terminé !</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                    {importResult.updated > 0 && <div style={{ padding: '12px 24px', background: '#e8f0eb', borderRadius: 10 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#2D5A3D' }}>{importResult.updated}</div><div style={{ fontSize: 12, color: '#2D5A3D' }}>importés</div></div>}
                    {importResult.failed > 0 && <div style={{ padding: '12px 24px', background: '#fee2e2', borderRadius: 10 }}><div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{importResult.failed}</div><div style={{ fontSize: 12, color: '#dc2626' }}>échecs</div></div>}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {importStep === 'upload' && <button className="btn btn-secondary" onClick={() => setImportModal(false)}>Annuler</button>}
              {importStep === 'mapping' && (<><button className="btn btn-secondary" onClick={() => setImportStep('upload')}>Retour</button><button className="btn btn-primary" onClick={validateImportMapping}>Valider <ChevronRight size={15} /></button></>)}
              {importStep === 'validation' && (<><button className="btn btn-secondary" onClick={() => setImportStep('mapping')}>Retour</button><button className="btn btn-primary" onClick={doImportTarifs} disabled={importingData || importValidation.toProcess.length === 0}>{importingData ? 'Import...' : `Importer ${importValidation.toProcess.length} tarif(s)`}</button></>)}
              {importStep === 'done' && <button className="btn btn-primary" onClick={() => setImportModal(false)}>Fermer</button>}
            </div>
          </div>
        </div>
      )}
      {/* Photo zoom */}
      {photoZoomUrl && (
        <div onClick={() => setPhotoZoomUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={photoZoomUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}

      {/* Historique prix */}
      {historiqueModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setHistoriqueModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: '24px 28px', maxWidth: 640, width: '90vw', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Historique des prix</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{historiqueModal.libelle}</div>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setHistoriqueModal(null)} />
            </div>
            {/* Filtres par champ */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {[{ key: '', label: 'Tout' }, { key: 'achat_ht', label: 'Achat HT' }, { key: 'vente_ht', label: 'Cession HT' }, { key: 'pvpr', label: 'PVC' }, { key: 'tva', label: 'TVA' }].map(f => (
                <button key={f.key} className={`btn ${historiqueFiltre === f.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHistoriqueFiltre(f.key)} style={{ fontSize: 11, padding: '4px 10px' }}>
                  {f.label} {f.key && <span style={{ fontSize: 9, opacity: 0.7 }}>({historiqueData.filter(h => h.champ === f.key).length})</span>}
                </button>
              ))}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(() => {
                const filtered = historiqueFiltre ? historiqueData.filter(h => h.champ === historiqueFiltre) : historiqueData
                if (filtered.length === 0) return (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <Clock size={32} style={{ marginBottom: 8 }} />
                    <div>{historiqueData.length === 0 ? 'Aucun historique pour ce produit' : 'Aucun changement pour ce champ'}</div>
                  </div>
                )
                return (
                  <table style={{ fontSize: 11, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                        {!historiqueFiltre && <th style={{ padding: '6px 8px', textAlign: 'left' }}>Champ</th>}
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ancien</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}></th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Nouveau</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Variation</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(h => {
                        const variation = (h.ancien_prix != null && h.nouveau_prix != null && h.ancien_prix !== 0) ? ((h.nouveau_prix - h.ancien_prix) / h.ancien_prix * 100) : null
                        return (
                          <tr key={h.id}>
                            <td style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-secondary)' }}>{new Date(h.date_changement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            {!historiqueFiltre && <td style={{ padding: '4px 8px' }}><span className="badge badge-neutral" style={{ fontSize: 10 }}>{champLabels[h.champ] || h.champ}</span></td>}
                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{h.ancien_prix != null ? h.ancien_prix.toFixed(2) : '—'}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>→</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{h.nouveau_prix != null ? h.nouveau_prix.toFixed(2) : '—'}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 10, color: variation != null ? (variation > 0 ? '#C0392B' : variation < 0 ? '#27AE60' : 'var(--text-muted)') : 'var(--text-muted)' }}>{variation != null ? `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%` : '—'}</td>
                            <td style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-secondary)' }}>{h.source === 'import' ? 'Import' : 'Manuel'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Choix marge client */}
      {margeClientChoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMargeClientChoice(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 12, padding: '24px 28px', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Répercuter la marge client sur :</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Marge saisie : {margeClientChoice.margeVal.toFixed(1)}%</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={() => applyMargeClientChoice('pvpr')} style={{ flex: 1, fontSize: 12, padding: '10px 12px' }}>
                → PVC TTC
              </button>
              <button className="btn btn-secondary" onClick={() => applyMargeClientChoice('vente')} style={{ flex: 1, fontSize: 12, padding: '10px 12px' }}>
                → Prix de cession HT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre globale Enregistrer */}
      {/* Panneau latéral config colonnes */}
      {showColSettings && (() => {
        const isClientDetail = view === 'client' && selectedClient
        const cols = isClientDetail ? CLIENT_COLUMNS : PRODUCT_COLUMNS
        const cfg = isClientDetail ? clientColConfig : prodColConfig
        const type = isClientDetail ? 'client' : 'produit'
        return <ColumnSettingsPanel columns={cols} config={cfg} onUpdate={newCfg => updateColConfig(type, newCfg)} onClose={() => setShowColSettings(false)} />
      })()}

      {hasDirtyRows && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--surface)', borderTop: '2px solid var(--primary)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -4px 16px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{dirtyIds.length} produit(s) modifié(s)</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setRowEdits({}); setEditSource({}) }} style={{ fontSize: 12 }}>Annuler</button>
            <button className="btn btn-primary" onClick={saveAllDirty} disabled={savingAll} style={{ fontSize: 12, padding: '7px 24px', gap: 6 }}>
              <Save size={14} /> {savingAll ? 'Enregistrement...' : 'Enregistrer tout'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
