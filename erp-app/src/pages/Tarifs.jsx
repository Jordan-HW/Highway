import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Search, X, Edit2, TrendingUp, Package, Users, Upload, FileSpreadsheet, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Save, Plus, Trash2, Check, Percent } from 'lucide-react'
import * as XLSX from 'xlsx'

const TVA_OPTIONS = [0, 5.5, 10, 20]

// ── Helpers ──
function applyRemisesCascade(basePrice, remises, produitId) {
  let price = basePrice
  for (const r of [...remises].sort((a, b) => a.ordre - b.ordre)) {
    if (!r.produit_ids || r.produit_ids.includes(produitId)) {
      price = price * (1 - r.pourcentage / 100)
    }
  }
  return Math.round(price * 100) / 100
}

export default function Tarifs() {
  const [view, setView] = useState('produit')
  const [produits, setProduits] = useState([])
  const [marques, setMarques] = useState([])
  const [clients, setClients] = useState([])
  const [tarifsAchat, setTarifsAchat] = useState([])
  const [tarifsVente, setTarifsVente] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMarque, setFilterMarque] = useState('')

  // Vue par produit — accordion
  const [expandedId, setExpandedId] = useState(null)
  const [accAchat, setAccAchat] = useState({ prix_achat_ht: '', taux_tva: 5.5 })
  const [accVenteGen, setAccVenteGen] = useState({ prix_vente_ht: '', remise_pct: '' })
  const [accClientTarifs, setAccClientTarifs] = useState([]) // { client_id, nom, prix_vente_ht, remise_pct, _existing }
  const [accClientSearch, setAccClientSearch] = useState('')
  const [accSaving, setAccSaving] = useState(false)

  // Vue par client
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientRefs, setClientRefs] = useState(new Set())
  const [clientRemises, setClientRemises] = useState([])
  const [clientTarifsMap, setClientTarifsMap] = useState({})
  const [showRemises, setShowRemises] = useState(false)
  const [savingRemise, setSavingRemise] = useState(false)
  const [savingRef, setSavingRef] = useState(null)

  // Bulk uplift modal
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkStep, setBulkStep] = useState(1)
  const [bulkClient, setBulkClient] = useState('')
  const [bulkMode, setBulkMode] = useState('marque')
  const [bulkMarque, setBulkMarque] = useState('')
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set())
  const [bulkPourcent, setBulkPourcent] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [applyingBulk, setApplyingBulk] = useState(false)

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
    const [{ data: prods }, { data: mqs }, { data: cls }, { data: ta }, { data: tv }] = await Promise.all([
      supabase.from('produits').select('*, marques(nom)').eq('statut', 'actif').order('libelle'),
      supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('clients').select('id, nom, type').order('nom'),
      supabase.from('tarifs_achat').select('*').order('date_debut', { ascending: false }),
      supabase.from('tarifs_vente').select('*').order('date_debut', { ascending: false }),
    ])
    setProduits(prods || [])
    setMarques(mqs || [])
    setClients(cls || [])
    setTarifsAchat(ta || [])
    setTarifsVente(tv || [])
    setLoading(false)
  }

  // ── Tarif helpers ──
  function getLastAchat(produitId) {
    return tarifsAchat.find(t => t.produit_id === produitId)
  }
  function getGeneralVente(produitId) {
    return tarifsVente.find(t => t.produit_id === produitId && !t.client_id)
  }
  function getClientVente(produitId, clientId) {
    return tarifsVente.find(t => t.produit_id === produitId && t.client_id === clientId)
  }
  function countClientTarifs(produitId) {
    return tarifsVente.filter(t => t.produit_id === produitId && t.client_id).length
  }

  // ── Margin helpers ──
  function calcMarge(cost, sell) {
    if (!cost || !sell || cost === 0) return null
    return ((sell - cost) / cost) * 100
  }
  function margeBadge(val) {
    if (val == null) return '—'
    const color = val > 20 ? 'badge-green' : val > 10 ? 'badge-orange' : 'badge-red'
    return <span className={`badge ${color}`}>{val.toFixed(1)}%</span>
  }

  // ── Filtered products ──
  const filteredProduits = produits.filter(p => {
    const s = search.toLowerCase()
    const matchSearch = p.libelle.toLowerCase().includes(s) || (p.ean13 || '').includes(s) || (p.marques?.nom || '').toLowerCase().includes(s)
    const matchMarque = !filterMarque || p.marque_id === filterMarque
    return matchSearch && matchMarque
  })

  // ════════════════════════════════════════════════════════════
  // VUE PAR PRODUIT — Accordion
  // ════════════════════════════════════════════════════════════

  async function toggleAccordion(produitId) {
    if (expandedId === produitId) { setExpandedId(null); return }
    setExpandedId(produitId)
    setAccClientSearch('')

    // Load achat
    const achat = getLastAchat(produitId)
    setAccAchat(achat ? { prix_achat_ht: achat.prix_achat_ht ?? '', taux_tva: achat.taux_tva ?? 5.5 } : { prix_achat_ht: '', taux_tva: 5.5 })

    // Load vente general
    const gen = getGeneralVente(produitId)
    setAccVenteGen(gen ? { prix_vente_ht: gen.prix_vente_ht ?? '', remise_pct: gen.remise_pct ?? '' } : { prix_vente_ht: '', remise_pct: '' })

    // Build client tarifs list (all clients)
    const clientList = clients.map(c => {
      const tv = getClientVente(produitId, c.id)
      return {
        client_id: c.id,
        nom: c.nom,
        prix_vente_ht: tv?.prix_vente_ht ?? '',
        remise_pct: tv?.remise_pct ?? '',
        _existing: !!tv,
        _id: tv?.id,
      }
    })
    setAccClientTarifs(clientList)
  }

  async function saveAccAchat(produitId) {
    if (!accAchat.prix_achat_ht && accAchat.prix_achat_ht !== 0) return toast('Saisissez un prix', 'error')
    setAccSaving(true)
    const payload = {
      produit_id: produitId,
      prix_achat_ht: parseFloat(accAchat.prix_achat_ht),
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const existing = getLastAchat(produitId)
    const { error } = existing
      ? await supabase.from('tarifs_achat').update(payload).eq('id', existing.id)
      : await supabase.from('tarifs_achat').insert(payload)
    setAccSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Prix achat enregistré', 'success')
    fetchAll()
  }

  async function saveAccVenteGen(produitId) {
    if (!accVenteGen.prix_vente_ht && accVenteGen.prix_vente_ht !== 0) return toast('Saisissez un prix', 'error')
    setAccSaving(true)
    const payload = {
      produit_id: produitId,
      client_id: null,
      prix_vente_ht: parseFloat(accVenteGen.prix_vente_ht),
      remise_pct: accVenteGen.remise_pct ? parseFloat(accVenteGen.remise_pct) : null,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const existing = getGeneralVente(produitId)
    const { error } = existing
      ? await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
      : await supabase.from('tarifs_vente').insert(payload)
    setAccSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Tarif général enregistré', 'success')
    fetchAll()
  }

  async function saveAccClientTarif(produitId, ct) {
    if (!ct.prix_vente_ht && ct.prix_vente_ht !== 0) return
    setAccSaving(true)
    const payload = {
      produit_id: produitId,
      client_id: ct.client_id,
      prix_vente_ht: parseFloat(ct.prix_vente_ht),
      remise_pct: ct.remise_pct ? parseFloat(ct.remise_pct) : null,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const { error } = ct._existing && ct._id
      ? await supabase.from('tarifs_vente').update(payload).eq('id', ct._id)
      : await supabase.from('tarifs_vente').insert(payload)
    setAccSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(`Tarif ${ct.nom} enregistré`, 'success')
    fetchAll()
  }

  function updateClientTarif(clientId, field, val) {
    setAccClientTarifs(prev => prev.map(ct =>
      ct.client_id === clientId ? { ...ct, [field]: val } : ct
    ))
  }

  // ════════════════════════════════════════════════════════════
  // VUE PAR CLIENT — Référencement + Remises
  // ════════════════════════════════════════════════════════════

  async function selectClient(client) {
    setSelectedClient(client)
    setShowRemises(false)

    // Fetch references, remises, and client tarifs
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
      await supabase.from('client_produit_references').delete()
        .eq('client_id', selectedClient.id).eq('produit_id', produitId)
      setClientRefs(prev => { const n = new Set(prev); n.delete(produitId); return n })
    } else {
      await supabase.from('client_produit_references').insert({
        client_id: selectedClient.id, produit_id: produitId
      })
      setClientRefs(prev => new Set([...prev, produitId]))
    }
    setSavingRef(null)
  }

  async function saveClientPrix(produitId, field, value) {
    if (!selectedClient) return
    const existing = clientTarifsMap[produitId]
    const payload = {
      produit_id: produitId,
      client_id: selectedClient.id,
      prix_vente_ht: field === 'prix_vente_ht' ? (parseFloat(value) || null) : (existing?.prix_vente_ht || null),
      remise_pct: field === 'remise_pct' ? (parseFloat(value) || null) : (existing?.remise_pct || null),
      date_debut: new Date().toISOString().slice(0, 10),
    }
    if (!payload.prix_vente_ht && !payload.remise_pct) return

    const { data, error } = existing
      ? await supabase.from('tarifs_vente').update(payload).eq('id', existing.id).select().single()
      : await supabase.from('tarifs_vente').insert(payload).select().single()
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientTarifsMap(prev => ({ ...prev, [produitId]: data }))
  }

  // ── Remises CRUD ──
  async function addRemise() {
    if (!selectedClient) return
    setSavingRemise(true)
    const ordre = clientRemises.length
    const { data, error } = await supabase.from('client_remises').insert({
      client_id: selectedClient.id,
      label: 'Nouvelle remise',
      pourcentage: 0,
      produit_ids: null,
      ordre,
    }).select().single()
    setSavingRemise(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientRemises(prev => [...prev, data])
  }

  async function updateRemise(id, field, value) {
    setClientRemises(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function saveRemise(remise) {
    setSavingRemise(true)
    const { id, created_at, ...payload } = remise
    const { error } = await supabase.from('client_remises').update(payload).eq('id', id)
    setSavingRemise(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Remise enregistrée', 'success')
  }

  async function deleteRemise(id) {
    const { error } = await supabase.from('client_remises').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setClientRemises(prev => prev.filter(r => r.id !== id))
  }

  // ── Bulk uplift ──
  function openBulkModal() {
    setBulkStep(1); setBulkClient(''); setBulkMode('marque'); setBulkMarque('')
    setBulkSelectedIds(new Set()); setBulkPourcent(''); setBulkPreview([]); setBulkModal(true)
  }

  function computeBulkPreview() {
    let sel = bulkMode === 'marque'
      ? produits.filter(p => p.marque_id === bulkMarque)
      : produits.filter(p => bulkSelectedIds.has(p.id))
    const pct = parseFloat(bulkPourcent)
    const preview = sel.map(p => {
      const general = getGeneralVente(p.id)
      if (!general) return null
      const old = getClientVente(p.id, bulkClient)
      return {
        produit: p,
        tarifGeneral: general.prix_vente_ht,
        ancienPrix: old?.prix_vente_ht ?? null,
        nouveauPrix: Math.round(general.prix_vente_ht * (1 + pct / 100) * 100) / 100,
      }
    }).filter(Boolean)
    setBulkPreview(preview)
    setBulkStep(2)
  }

  async function applyBulk() {
    setApplyingBulk(true)
    const today = new Date().toISOString().slice(0, 10)
    let errors = 0
    for (const item of bulkPreview) {
      const existing = getClientVente(item.produit.id, bulkClient)
      const payload = {
        produit_id: item.produit.id, client_id: bulkClient,
        prix_vente_ht: item.nouveauPrix, date_debut: today,
        notes: `Majoration ${bulkPourcent >= 0 ? '+' : ''}${bulkPourcent}%`,
      }
      const { error } = existing
        ? await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
        : await supabase.from('tarifs_vente').insert(payload)
      if (error) errors++
    }
    setApplyingBulk(false); setBulkModal(false)
    if (errors) toast(`Appliqué avec ${errors} erreur(s)`, 'error')
    else toast(`Majoration appliquée à ${bulkPreview.length} produit(s)`, 'success')
    fetchAll()
  }

  const bulkCanPreview = bulkClient && bulkPourcent && (bulkMode === 'marque' ? bulkMarque : bulkSelectedIds.size > 0)

  // ── Import tarifs ──
  const IMPORT_FIELDS = [
    { key: '__ignore__', label: '— Ignorer —' },
    { key: 'ean13', label: 'EAN13 (clé) *' },
    { key: 'prix_achat_ht', label: 'Prix achat HT' },
    { key: 'taux_tva', label: 'Taux TVA (%)' },
    { key: 'prix_vente_ht', label: 'Tarif vente général HT' },
    { key: 'remise_pct', label: 'Remise vente (%)' },
    { key: 'pvpr', label: 'PVPR TTC' },
    { key: 'client_nom', label: 'Client (nom)' },
    { key: 'prix_client_ht', label: 'Tarif client HT' },
    { key: 'remise_client_pct', label: 'Remise client (%)' },
  ]

  function autoMapTarifs(cols) {
    const map = {}
    const hints = {
      ean: 'ean13', ean13: 'ean13', 'code barre': 'ean13', barcode: 'ean13',
      'prix achat': 'prix_achat_ht', 'achat ht': 'prix_achat_ht',
      tva: 'taux_tva', 'taux tva': 'taux_tva',
      'prix vente': 'prix_vente_ht', 'vente ht': 'prix_vente_ht', 'tarif general': 'prix_vente_ht',
      remise: 'remise_pct', 'remise %': 'remise_pct',
      pvpr: 'pvpr', 'prix public': 'pvpr',
      client: 'client_nom', 'nom client': 'client_nom',
      'prix client': 'prix_client_ht', 'tarif client': 'prix_client_ht',
      'remise client': 'remise_client_pct',
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
      Object.entries(importMapping).forEach(([col, field]) => {
        if (field === '__ignore__') return
        obj[field] = String(row[col] ?? '').trim()
      })
      if (!obj.ean13) { errors.push({ row: i + 2, msg: 'EAN13 manquant' }); return }
      const produit = eanIdx.get(obj.ean13)
      if (!produit) { errors.push({ row: i + 2, msg: `EAN ${obj.ean13} non trouvé` }); return }
      let resolvedClient = null
      if (obj.client_nom) {
        resolvedClient = clientIdx.get(obj.client_nom.toLowerCase())
        if (!resolvedClient) { errors.push({ row: i + 2, msg: `Client "${obj.client_nom}" non trouvé` }); return }
      }
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
      if (item.pvpr) {
        const { error } = await supabase.from('produits').update({ pvpr: parseFloat(item.pvpr) || null }).eq('id', prodId)
        if (error) failed++
      }
      if (item.prix_achat_ht) {
        const payload = { produit_id: prodId, prix_achat_ht: parseFloat(item.prix_achat_ht), date_debut: today }
        const ex = getLastAchat(prodId)
        const { error } = ex ? await supabase.from('tarifs_achat').update(payload).eq('id', ex.id) : await supabase.from('tarifs_achat').insert(payload)
        if (error) { failed++; continue }
      }
      if (item.prix_vente_ht) {
        const payload = { produit_id: prodId, client_id: null, prix_vente_ht: parseFloat(item.prix_vente_ht), remise_pct: item.remise_pct ? parseFloat(item.remise_pct) : null, date_debut: today }
        const ex = getGeneralVente(prodId)
        const { error } = ex ? await supabase.from('tarifs_vente').update(payload).eq('id', ex.id) : await supabase.from('tarifs_vente').insert(payload)
        if (error) { failed++; continue }
      }
      if (item.prix_client_ht && item._client) {
        const payload = { produit_id: prodId, client_id: item._client.id, prix_vente_ht: parseFloat(item.prix_client_ht), remise_pct: item.remise_client_pct ? parseFloat(item.remise_client_pct) : null, date_debut: today, notes: 'Import Excel' }
        const ex = getClientVente(prodId, item._client.id)
        const { error } = ex ? await supabase.from('tarifs_vente').update(payload).eq('id', ex.id) : await supabase.from('tarifs_vente').insert(payload)
        if (error) { failed++; continue }
      }
      updated++
    }
    setImportResult({ updated, failed }); setImportingData(false); setImportStep('done'); fetchAll()
  }

  // ── Photo thumbnail ──
  const Thumb = ({ url }) => url
    ? <img src={url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
    : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="var(--text-muted)" /></div>

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Référencement et Tarifs</h2>
          <p>{view === 'produit' ? `${filteredProduits.length} produit(s)` : selectedClient ? selectedClient.nom : `${clients.length} client(s)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openImportModal}><Upload size={15} /> Importer</button>
          <button className="btn btn-secondary" onClick={openBulkModal}><TrendingUp size={15} /> Masse</button>
        </div>
      </div>

      <div className="page-body">
        {/* Toggle vue */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${view === 'produit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('produit'); setSelectedClient(null); setExpandedId(null) }}>
            <Package size={15} /> Vue par produit
          </button>
          <button className={`btn ${view === 'client' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('client'); setSelectedClient(null); setExpandedId(null) }}>
            <Users size={15} /> Vue par client
          </button>
        </div>

        {/* Filters */}
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
                {view === 'produit' && (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}></th>
                        <th>Produit</th>
                        <th>Marque</th>
                        <th>Achat HT</th>
                        <th>Vente HT</th>
                        <th>PVPR</th>
                        <th>Marge</th>
                        <th>Clients</th>
                        <th style={{ width: 30 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProduits.length === 0 ? (
                        <tr><td colSpan={9}><div className="empty-state"><Package /><p>Aucun produit</p></div></td></tr>
                      ) : filteredProduits.map(p => {
                        const achat = getLastAchat(p.id)
                        const vente = getGeneralVente(p.id)
                        const achatHT = achat?.prix_achat_ht
                        const venteHT = vente?.prix_vente_ht
                        const marge = calcMarge(achatHT, venteHT)
                        const nbClients = countClientTarifs(p.id)
                        const isExpanded = expandedId === p.id

                        return [
                          <tr key={p.id} onClick={() => toggleAccordion(p.id)} style={{ cursor: 'pointer', background: isExpanded ? 'var(--primary-light)' : undefined }}>
                            <td><Thumb url={p.photo_url} /></td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{p.libelle}</div>
                              {p.ean13 && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.ean13}</div>}
                            </td>
                            <td>{p.marques?.nom || '—'}</td>
                            <td>{achatHT != null ? `${Number(achatHT).toFixed(2)} €` : '—'}</td>
                            <td style={{ fontWeight: 500 }}>{venteHT != null ? `${Number(venteHT).toFixed(2)} €` : '—'}</td>
                            <td>{p.pvpr != null ? `${Number(p.pvpr).toFixed(2)} €` : '—'}</td>
                            <td>{margeBadge(marge)}</td>
                            <td>{nbClients > 0 ? <span className="badge badge-blue">{nbClients}</span> : '—'}</td>
                            <td>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                          </tr>,

                          isExpanded && (
                            <tr key={`${p.id}-acc`}>
                              <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                                  {/* Prix d'achat */}
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>Prix d'achat</div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label style={{ fontSize: 11 }}>Prix HT (€)</label>
                                        <input type="number" step="0.01" value={accAchat.prix_achat_ht} onChange={e => setAccAchat(a => ({ ...a, prix_achat_ht: e.target.value }))} placeholder="0.00" style={{ padding: '5px 8px', fontSize: 13 }} />
                                      </div>
                                      <button className="btn btn-primary" onClick={() => saveAccAchat(p.id)} disabled={accSaving} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                                        <Save size={13} /> Enregistrer
                                      </button>
                                    </div>
                                  </div>

                                  {/* Prix vente général */}
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>Tarif vente général</div>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label style={{ fontSize: 11 }}>Prix HT (€)</label>
                                        <input type="number" step="0.01" value={accVenteGen.prix_vente_ht} onChange={e => setAccVenteGen(v => ({ ...v, prix_vente_ht: e.target.value }))} placeholder="0.00" style={{ padding: '5px 8px', fontSize: 13 }} />
                                      </div>
                                      <div className="form-group" style={{ marginBottom: 0, width: 80 }}>
                                        <label style={{ fontSize: 11 }}>Remise %</label>
                                        <input type="number" step="0.1" value={accVenteGen.remise_pct} onChange={e => setAccVenteGen(v => ({ ...v, remise_pct: e.target.value }))} placeholder="0" style={{ padding: '5px 8px', fontSize: 13 }} />
                                      </div>
                                      <button className="btn btn-primary" onClick={() => saveAccVenteGen(p.id)} disabled={accSaving} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                                        <Save size={13} /> Enregistrer
                                      </button>
                                    </div>
                                  </div>

                                  {/* Tarifs clients */}
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Tarifs par client</span>
                                      <div className="search-input" style={{ width: 200, height: 28 }}>
                                        <Search size={13} />
                                        <input placeholder="Filtrer clients..." value={accClientSearch} onChange={e => setAccClientSearch(e.target.value)} style={{ fontSize: 11, padding: '3px 6px' }} />
                                      </div>
                                    </div>
                                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                                      <table style={{ margin: 0 }}>
                                        <thead>
                                          <tr>
                                            <th style={{ fontSize: 11, padding: '6px 10px' }}>Client</th>
                                            <th style={{ fontSize: 11, padding: '6px 10px', width: 110 }}>Prix HT (€)</th>
                                            <th style={{ fontSize: 11, padding: '6px 10px', width: 80 }}>Remise %</th>
                                            <th style={{ fontSize: 11, padding: '6px 10px', width: 50 }}></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {accClientTarifs
                                            .filter(ct => !accClientSearch || ct.nom.toLowerCase().includes(accClientSearch.toLowerCase()))
                                            .map(ct => (
                                              <tr key={ct.client_id} style={{ background: ct.prix_vente_ht !== '' ? 'var(--primary-light)' : undefined }}>
                                                <td style={{ fontSize: 12, padding: '4px 10px', fontWeight: ct.prix_vente_ht !== '' ? 500 : 400 }}>{ct.nom}</td>
                                                <td style={{ padding: '4px 6px' }}>
                                                  <input type="number" step="0.01" value={ct.prix_vente_ht} onChange={e => updateClientTarif(ct.client_id, 'prix_vente_ht', e.target.value)} placeholder="—" style={{ padding: '3px 6px', fontSize: 12, width: '100%' }} />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                  <input type="number" step="0.1" value={ct.remise_pct} onChange={e => updateClientTarif(ct.client_id, 'remise_pct', e.target.value)} placeholder="—" style={{ padding: '3px 6px', fontSize: 12, width: '100%' }} />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                  <button className="btn-icon" onClick={() => saveAccClientTarif(p.id, ct)} disabled={accSaving} title="Enregistrer"><Save size={13} /></button>
                                                </td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ),
                        ]
                      })}
                    </tbody>
                  </table>
                )}

                {/* ══════════ VUE PAR CLIENT — Liste ══════════ */}
                {view === 'client' && !selectedClient && (
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Produits référencés</th>
                        <th>Tarifs spécifiques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><Users /><p>Aucun client</p></div></td></tr>
                      ) : clients.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase())).map(c => {
                        const nbTarifs = tarifsVente.filter(t => t.client_id === c.id).length
                        return (
                          <tr key={c.id} onClick={() => selectClient(c)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 500 }}>{c.nom}</td>
                            <td><span className={`badge ${c.type === 'centrale' ? 'badge-blue' : c.type === 'grossiste' ? 'badge-orange' : 'badge-gray'}`}>{c.type}</span></td>
                            <td>—</td>
                            <td>{nbTarifs > 0 ? <span className="badge badge-blue">{nbTarifs}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* ══════════ VUE PAR CLIENT — Détail ══════════ */}
                {view === 'client' && selectedClient && (
                  <>
                    {/* Header client + remises */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Users size={16} color="var(--primary)" />
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedClient.nom}</span>
                          <span className="badge badge-blue" style={{ fontSize: 11 }}>{clientRefs.size} référencé(s)</span>
                        </div>
                        <button className={`btn ${showRemises ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowRemises(!showRemises)} style={{ fontSize: 12 }}>
                          <Percent size={14} /> Remises ({clientRemises.length})
                        </button>
                      </div>

                      {/* Panel remises cascade */}
                      {showRemises && (
                        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Remises en cascade</span>
                            <button className="btn btn-secondary" onClick={addRemise} disabled={savingRemise} style={{ fontSize: 11, padding: '3px 10px' }}>
                              <Plus size={13} /> Ajouter
                            </button>
                          </div>

                          {clientRemises.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>Aucune remise configurée.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {clientRemises.map((r, idx) => (
                                <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, width: 20, textAlign: 'center' }}>{idx + 1}</span>
                                  <input
                                    value={r.label}
                                    onChange={e => updateRemise(r.id, 'label', e.target.value)}
                                    onBlur={() => saveRemise(r)}
                                    placeholder="Nom de la remise"
                                    style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }}
                                  />
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={r.pourcentage}
                                      onChange={e => updateRemise(r.id, 'pourcentage', parseFloat(e.target.value) || 0)}
                                      onBlur={() => saveRemise(r)}
                                      style={{ width: 60, padding: '4px 6px', fontSize: 12, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 4 }}
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                                  </div>
                                  <select
                                    value={r.produit_ids === null ? 'all' : 'selection'}
                                    onChange={e => {
                                      const val = e.target.value === 'all' ? null : []
                                      updateRemise(r.id, 'produit_ids', val)
                                      saveRemise({ ...r, produit_ids: val })
                                    }}
                                    style={{ padding: '4px 6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4 }}
                                  >
                                    <option value="all">Tous les produits</option>
                                    <option value="selection">Sélection</option>
                                  </select>
                                  {r.produit_ids !== null && (
                                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                                      {r.produit_ids.length} prod.
                                    </span>
                                  )}
                                  <button className="btn-icon" onClick={() => deleteRemise(r.id)} title="Supprimer"><Trash2 size={13} /></button>
                                </div>
                              ))}
                            </div>
                          )}

                          {clientRemises.length > 0 && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--primary-light)', borderRadius: 6, fontSize: 12 }}>
                              <strong>Effet cascade (base 100 €) :</strong>{' '}
                              {applyRemisesCascade(100, clientRemises, null).toFixed(2)} €
                              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                                ({clientRemises.map(r => `-${r.pourcentage}%`).join(' puis ')})
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Produits table */}
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}></th>
                          <th style={{ width: 40 }}>Réf.</th>
                          <th>Produit</th>
                          <th>Marque</th>
                          <th>Vente HT</th>
                          <th>Prix client</th>
                          <th>Après remises</th>
                          <th>PVPR</th>
                          <th>Marge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProduits.map(p => {
                          const isRef = clientRefs.has(p.id)
                          const general = getGeneralVente(p.id)
                          const ct = clientTarifsMap[p.id]
                          const basePrice = ct?.prix_vente_ht || general?.prix_vente_ht || null
                          const afterRemises = basePrice ? applyRemisesCascade(basePrice, clientRemises, p.id) : null
                          const achat = getLastAchat(p.id)
                          const marge = calcMarge(achat?.prix_achat_ht, afterRemises || basePrice)

                          return (
                            <tr key={p.id} style={{ opacity: isRef ? 1 : 0.5 }}>
                              <td><Thumb url={p.photo_url} /></td>
                              <td>
                                <button
                                  onClick={() => toggleRef(p.id)}
                                  disabled={savingRef === p.id}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, border: `2px solid ${isRef ? 'var(--primary)' : 'var(--border)'}`,
                                    background: isRef ? 'var(--primary)' : 'var(--surface)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                                  }}
                                >
                                  {isRef && <Check size={14} color="#fff" strokeWidth={3} />}
                                </button>
                              </td>
                              <td>
                                <div style={{ fontWeight: 500 }}>{p.libelle}</div>
                                {p.ean13 && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.ean13}</div>}
                              </td>
                              <td>{p.marques?.nom || '—'}</td>
                              <td>{general?.prix_vente_ht != null ? `${Number(general.prix_vente_ht).toFixed(2)} €` : '—'}</td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={ct?.prix_vente_ht ?? ''}
                                  onChange={e => setClientTarifsMap(prev => ({
                                    ...prev,
                                    [p.id]: { ...prev[p.id], prix_vente_ht: e.target.value, produit_id: p.id, client_id: selectedClient.id }
                                  }))}
                                  onBlur={e => saveClientPrix(p.id, 'prix_vente_ht', e.target.value)}
                                  placeholder={general?.prix_vente_ht ? `${Number(general.prix_vente_ht).toFixed(2)}` : '—'}
                                  style={{ width: 90, padding: '3px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, background: ct?.prix_vente_ht ? 'var(--primary-light)' : 'var(--surface)' }}
                                />
                              </td>
                              <td style={{ fontWeight: 500, color: 'var(--primary)' }}>
                                {afterRemises != null ? `${afterRemises.toFixed(2)} €` : '—'}
                              </td>
                              <td>{p.pvpr != null ? `${Number(p.pvpr).toFixed(2)} €` : '—'}</td>
                              <td>{margeBadge(marge)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal majoration en masse ── */}
      {bulkModal && (
        <div className="modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modification en masse</h3>
              <button className="btn-icon" onClick={() => setBulkModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {bulkStep === 1 && (
                <>
                  <p className="section-title">1. Sélection</p>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Client *</label>
                      <select value={bulkClient} onChange={e => setBulkClient(e.target.value)}>
                        <option value="">Sélectionner un client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, margin: '16px 0 12px' }}>
                    <button className={`btn ${bulkMode === 'marque' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBulkMode('marque')} style={{ fontSize: 13 }}>Par marque</button>
                    <button className={`btn ${bulkMode === 'individuel' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBulkMode('individuel')} style={{ fontSize: 13 }}>Sélection individuelle</button>
                  </div>
                  {bulkMode === 'marque' && (
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label>Marque</label>
                      <select value={bulkMarque} onChange={e => setBulkMarque(e.target.value)}>
                        <option value="">Sélectionner une marque...</option>
                        {marques.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                    </div>
                  )}
                  {bulkMode === 'individuel' && (
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 16 }}>
                      {produits.map(p => {
                        const checked = bulkSelectedIds.has(p.id)
                        return (
                          <div key={p.id} onClick={() => setBulkSelectedIds(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 5, background: checked ? '#e8f0eb' : 'transparent' }}>
                            <input type="checkbox" checked={checked} readOnly style={{ accentColor: 'var(--primary)' }} />
                            <span style={{ fontSize: 13 }}>{p.libelle}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{p.marques?.nom || ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="form-group" style={{ maxWidth: 200 }}>
                    <label>Pourcentage (%)</label>
                    <input type="number" step="0.1" value={bulkPourcent} onChange={e => setBulkPourcent(e.target.value)} placeholder="ex: +5 ou -3" />
                  </div>
                </>
              )}
              {bulkStep === 2 && (
                <>
                  <p className="section-title">2. Aperçu ({bulkPourcent >= 0 ? '+' : ''}{bulkPourcent}%)</p>
                  {bulkPreview.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}><Package /><p>Aucun produit avec tarif général</p></div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: 350, overflowY: 'auto' }}>
                      <table>
                        <thead><tr><th>Produit</th><th>Tarif Général</th><th>Ancien</th><th>Nouveau</th></tr></thead>
                        <tbody>
                          {bulkPreview.map(item => (
                            <tr key={item.produit.id}>
                              <td style={{ fontWeight: 500 }}>{item.produit.libelle}</td>
                              <td>{Number(item.tarifGeneral).toFixed(2)} €</td>
                              <td>{item.ancienPrix != null ? `${Number(item.ancienPrix).toFixed(2)} €` : '—'}</td>
                              <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.nouveauPrix.toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {bulkStep === 1 && (
                <>
                  <button className="btn btn-secondary" onClick={() => setBulkModal(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={computeBulkPreview} disabled={!bulkCanPreview}>Aperçu</button>
                </>
              )}
              {bulkStep === 2 && (
                <>
                  <button className="btn btn-secondary" onClick={() => setBulkStep(1)}>Retour</button>
                  <button className="btn btn-primary" onClick={applyBulk} disabled={applyingBulk || bulkPreview.length === 0}>
                    {applyingBulk ? 'Application...' : `Appliquer à ${bulkPreview.length} produit(s)`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                <div
                  onDrop={e => { e.preventDefault(); handleImportFile(e.dataTransfer.files[0]) }}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => document.getElementById('tarif-file-input').click()}
                  style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '60px 40px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <FileSpreadsheet size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Glissez un fichier Excel ici</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>ou cliquez pour choisir</div>
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
                        <thead><tr><th>EAN</th><th>Produit</th><th>Achat</th><th>Vente</th><th>PVPR</th><th>Client</th><th>Prix client</th></tr></thead>
                        <tbody>
                          {importValidation.toProcess.slice(0, 30).map((item, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{item.ean13}</td>
                              <td style={{ fontWeight: 500, fontSize: 12 }}>{item._produit.libelle}</td>
                              <td>{item.prix_achat_ht || '—'}</td>
                              <td>{item.prix_vente_ht || '—'}</td>
                              <td>{item.pvpr || '—'}</td>
                              <td style={{ fontSize: 12 }}>{item._client?.nom || '—'}</td>
                              <td>{item.prix_client_ht || '—'}</td>
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
              {importStep === 'mapping' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setImportStep('upload')}>Retour</button>
                  <button className="btn btn-primary" onClick={validateImportMapping}>Valider <ChevronRight size={15} /></button>
                </>
              )}
              {importStep === 'validation' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setImportStep('mapping')}>Retour</button>
                  <button className="btn btn-primary" onClick={doImportTarifs} disabled={importingData || importValidation.toProcess.length === 0}>
                    {importingData ? 'Import...' : `Importer ${importValidation.toProcess.length} tarif(s)`}
                  </button>
                </>
              )}
              {importStep === 'done' && <button className="btn btn-primary" onClick={() => setImportModal(false)}>Fermer</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
