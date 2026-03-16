import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Search, X, Edit2, TrendingUp, Package, Users, DollarSign } from 'lucide-react'

const TVA_OPTIONS = [0, 5.5, 10, 20]

export default function Tarifs() {
  const [view, setView] = useState('produit') // 'produit' | 'client'
  const [produits, setProduits] = useState([])
  const [marques, setMarques] = useState([])
  const [clients, setClients] = useState([])
  const [tarifsAchat, setTarifsAchat] = useState([])
  const [tarifsVente, setTarifsVente] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMarque, setFilterMarque] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)

  // Modal edit
  const [editModal, setEditModal] = useState(null) // { produit, clientId? }
  const [editPvpr, setEditPvpr] = useState('')
  const [editAchat, setEditAchat] = useState({ prix_unitaire_ht: '', taux_tva: 5.5 })
  const [editVenteGeneral, setEditVenteGeneral] = useState({ prix_unitaire_ht: '', remise_pourcent: '' })
  const [editVenteClient, setEditVenteClient] = useState({ prix_unitaire_ht: '', remise_pourcent: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  // Bulk uplift modal
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkStep, setBulkStep] = useState(1)
  const [bulkClient, setBulkClient] = useState('')
  const [bulkMode, setBulkMode] = useState('marque') // 'marque' | 'individuel'
  const [bulkMarque, setBulkMarque] = useState('')
  const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set())
  const [bulkPourcent, setBulkPourcent] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [applyingBulk, setApplyingBulk] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: prods }, { data: mqs }, { data: cls }, { data: ta }, { data: tv }] = await Promise.all([
      supabase.from('produits').select('*, marques(nom)').eq('statut', 'actif').order('libelle'),
      supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('tarifs_achat').select('*').order('date_debut', { ascending: false }),
      supabase.from('tarifs_vente').select('*, clients(nom)').order('date_debut', { ascending: false }),
    ])
    setProduits(prods || [])
    setMarques(mqs || [])
    setClients(cls || [])
    setTarifsAchat(ta || [])
    setTarifsVente(tv || [])
    setLoading(false)
  }

  // Helpers
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
  function countClientTarifsForClient(clientId) {
    return tarifsVente.filter(t => t.client_id === clientId).length
  }

  // Filtered products
  const filteredProduits = produits.filter(p => {
    const s = search.toLowerCase()
    const matchSearch = p.libelle.toLowerCase().includes(s) || (p.ean13 || '').includes(s) || (p.marques?.nom || '').toLowerCase().includes(s)
    const matchMarque = !filterMarque || p.marque_id === filterMarque
    return matchSearch && matchMarque
  })

  // ── Edit modal logic ──
  function openEditModal(produit, clientId = null) {
    const achat = getLastAchat(produit.id)
    const general = getGeneralVente(produit.id)
    setEditPvpr(produit.pvpr ?? '')
    setEditAchat(achat ? { prix_unitaire_ht: achat.prix_unitaire_ht ?? '', taux_tva: achat.taux_tva ?? 5.5 } : { prix_unitaire_ht: '', taux_tva: 5.5 })
    setEditVenteGeneral(general ? { prix_unitaire_ht: general.prix_unitaire_ht ?? '', remise_pourcent: general.remise_pourcent ?? '' } : { prix_unitaire_ht: '', remise_pourcent: '' })
    if (clientId) {
      const cv = getClientVente(produit.id, clientId)
      setEditVenteClient(cv ? { prix_unitaire_ht: cv.prix_unitaire_ht ?? '', remise_pourcent: cv.remise_pourcent ?? '' } : { prix_unitaire_ht: '', remise_pourcent: '' })
    }
    setEditModal({ produit, clientId })
  }

  async function saveEditAchat() {
    if (!editModal) return
    if (!editAchat.prix_unitaire_ht && editAchat.prix_unitaire_ht !== 0) return toast('Saisissez un prix HT', 'error')
    setSavingEdit(true)
    const payload = {
      produit_id: editModal.produit.id,
      prix_unitaire_ht: parseFloat(editAchat.prix_unitaire_ht),
      taux_tva: parseFloat(editAchat.taux_tva),
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const existing = getLastAchat(editModal.produit.id)
    let error
    if (existing) {
      const { error: e } = await supabase.from('tarifs_achat').update(payload).eq('id', existing.id)
      error = e
    } else {
      const { error: e } = await supabase.from('tarifs_achat').insert(payload)
      error = e
    }
    setSavingEdit(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Prix d\'achat enregistré', 'success')
    fetchAll()
  }

  async function saveEditVenteGeneral() {
    if (!editModal) return
    if (!editVenteGeneral.prix_unitaire_ht && editVenteGeneral.prix_unitaire_ht !== 0) return toast('Saisissez un prix HT', 'error')
    setSavingEdit(true)
    const payload = {
      produit_id: editModal.produit.id,
      client_id: null,
      prix_unitaire_ht: parseFloat(editVenteGeneral.prix_unitaire_ht),
      remise_pourcent: editVenteGeneral.remise_pourcent ? parseFloat(editVenteGeneral.remise_pourcent) : null,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const existing = getGeneralVente(editModal.produit.id)
    let error
    if (existing) {
      const { error: e } = await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
      error = e
    } else {
      const { error: e } = await supabase.from('tarifs_vente').insert(payload)
      error = e
    }
    setSavingEdit(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Tarif général enregistré', 'success')
    fetchAll()
  }

  async function saveEditVenteClient() {
    if (!editModal || !editModal.clientId) return
    if (!editVenteClient.prix_unitaire_ht && editVenteClient.prix_unitaire_ht !== 0) return toast('Saisissez un prix HT', 'error')
    setSavingEdit(true)
    const payload = {
      produit_id: editModal.produit.id,
      client_id: editModal.clientId,
      prix_unitaire_ht: parseFloat(editVenteClient.prix_unitaire_ht),
      remise_pourcent: editVenteClient.remise_pourcent ? parseFloat(editVenteClient.remise_pourcent) : null,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const existing = getClientVente(editModal.produit.id, editModal.clientId)
    let error
    if (existing) {
      const { error: e } = await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
      error = e
    } else {
      const { error: e } = await supabase.from('tarifs_vente').insert(payload)
      error = e
    }
    setSavingEdit(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Tarif client enregistré', 'success')
    fetchAll()
  }

  // ── Bulk uplift logic ──
  function openBulkModal() {
    setBulkStep(1)
    setBulkClient('')
    setBulkMode('marque')
    setBulkMarque('')
    setBulkSelectedIds(new Set())
    setBulkPourcent('')
    setBulkPreview([])
    setBulkModal(true)
  }

  function computeBulkPreview() {
    let selectedProduits
    if (bulkMode === 'marque') {
      selectedProduits = produits.filter(p => p.marque_id === bulkMarque)
    } else {
      selectedProduits = produits.filter(p => bulkSelectedIds.has(p.id))
    }
    const pct = parseFloat(bulkPourcent)
    const preview = selectedProduits.map(p => {
      const general = getGeneralVente(p.id)
      if (!general) return null
      const oldClient = getClientVente(p.id, bulkClient)
      const newPrice = Math.round(general.prix_unitaire_ht * (1 + pct / 100) * 100) / 100
      return {
        produit: p,
        tarifGeneral: general.prix_unitaire_ht,
        ancienPrixClient: oldClient?.prix_unitaire_ht ?? null,
        nouveauPrixClient: newPrice,
      }
    }).filter(Boolean)
    setBulkPreview(preview)
    setBulkStep(2)
  }

  async function applyBulk() {
    if (bulkPreview.length === 0) return
    setApplyingBulk(true)
    const pct = bulkPourcent
    const today = new Date().toISOString().slice(0, 10)
    let errors = 0

    for (const item of bulkPreview) {
      const existing = getClientVente(item.produit.id, bulkClient)
      const payload = {
        produit_id: item.produit.id,
        client_id: bulkClient,
        prix_unitaire_ht: item.nouveauPrixClient,
        date_debut: today,
        note: `Majoration en masse ${pct >= 0 ? '+' : ''}${pct}%`,
      }
      if (existing) {
        const { error } = await supabase.from('tarifs_vente').update(payload).eq('id', existing.id)
        if (error) errors++
      } else {
        const { error } = await supabase.from('tarifs_vente').insert(payload)
        if (error) errors++
      }
    }

    setApplyingBulk(false)
    setBulkModal(false)
    if (errors > 0) {
      toast(`Appliqué avec ${errors} erreur(s)`, 'error')
    } else {
      toast(`Majoration appliquée à ${bulkPreview.length} produit(s)`, 'success')
    }
    fetchAll()
  }

  const bulkCanPreview = bulkClient && bulkPourcent && (bulkMode === 'marque' ? bulkMarque : bulkSelectedIds.size > 0)

  // ── Margin helpers ──
  function margeBadge(val) {
    if (val == null) return '—'
    const color = val > 20 ? 'badge-green' : val > 10 ? 'badge-orange' : 'badge-red'
    return <span className={`badge ${color}`}>{val.toFixed(1)}%</span>
  }
  function calcMargeHighway(achatHT, venteClientHT) {
    if (!achatHT || !venteClientHT || achatHT === 0) return null
    return ((venteClientHT - achatHT) / achatHT) * 100
  }
  function calcMargeClient(venteClientHT, pvpr) {
    if (!venteClientHT || !pvpr || venteClientHT === 0) return null
    return ((pvpr - venteClientHT) / venteClientHT) * 100
  }

  // ── Clients with tarif count ──
  const clientsWithTarifs = clients.map(c => ({
    ...c,
    nbTarifs: countClientTarifsForClient(c.id),
  })).filter(c => c.nbTarifs > 0 || !selectedClient)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestion des Tarifs</h2>
          <p>{view === 'produit' ? `${filteredProduits.length} produit(s)` : selectedClient ? 'Tarifs du client' : `${clients.length} client(s)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openBulkModal}><TrendingUp size={15} /> Majoration en masse</button>
        </div>
      </div>

      <div className="page-body">
        {/* Toggle vue */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn ${view === 'produit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('produit'); setSelectedClient(null) }}>
            <Package size={15} /> Vue par produit
          </button>
          <button className={`btn ${view === 'client' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('client'); setSelectedClient(null) }}>
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
              <X size={14} /> Retour à la liste clients
            </button>
          )}
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <>
                {/* ── Vue par produit ── */}
                {view === 'produit' && (
                  <table>
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Marque</th>
                        <th>Achat HT</th>
                        <th>Tarif Général HT</th>
                        <th>PVPR TTC</th>
                        <th>Marge Highway</th>
                        <th>Marge Client</th>
                        <th>Tarifs clients</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProduits.length === 0 ? (
                        <tr><td colSpan={9}><div className="empty-state"><Package /><p>Aucun produit trouvé</p></div></td></tr>
                      ) : filteredProduits.map(p => {
                        const achat = getLastAchat(p.id)
                        const vente = getGeneralVente(p.id)
                        const nbClients = countClientTarifs(p.id)
                        const achatHT = achat?.prix_unitaire_ht
                        const venteHT = vente?.prix_unitaire_ht
                        const pvpr = p.pvpr
                        const margeHW = calcMargeHighway(achatHT, venteHT)
                        const margeCl = calcMargeClient(venteHT, pvpr)
                        return (
                          <tr key={p.id} onClick={() => openEditModal(p)} style={{ cursor: 'pointer' }}>
                            <td><div style={{ fontWeight: 500 }}>{p.libelle}</div></td>
                            <td>{p.marques?.nom || '—'}</td>
                            <td>{achatHT != null ? `${Number(achatHT).toFixed(2)} €` : '—'}</td>
                            <td style={{ fontWeight: 500 }}>{venteHT != null ? `${Number(venteHT).toFixed(2)} €` : '—'}</td>
                            <td>{pvpr != null ? `${Number(pvpr).toFixed(2)} €` : '—'}</td>
                            <td>{margeBadge(margeHW)}</td>
                            <td>{margeBadge(margeCl)}</td>
                            <td>{nbClients > 0 ? <span className="badge badge-blue">{nbClients}</span> : '—'}</td>
                            <td>
                              <button className="btn-icon" onClick={e => { e.stopPropagation(); openEditModal(p) }}><Edit2 size={14} /></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* ── Vue par client — liste clients ── */}
                {view === 'client' && !selectedClient && (
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Nb tarifs spécifiques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length === 0 ? (
                        <tr><td colSpan={2}><div className="empty-state"><Users /><p>Aucun client</p></div></td></tr>
                      ) : clients.filter(c => {
                        if (!search) return true
                        return c.nom.toLowerCase().includes(search.toLowerCase())
                      }).map(c => {
                        const nb = countClientTarifsForClient(c.id)
                        return (
                          <tr key={c.id} onClick={() => setSelectedClient(c)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 500 }}>{c.nom}</td>
                            <td>{nb > 0 ? <span className="badge badge-blue">{nb}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* ── Vue par client — tarifs du client ── */}
                {view === 'client' && selectedClient && (
                  <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Users size={16} color="var(--primary)" />
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{selectedClient.nom}</span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Marque</th>
                          <th>Tarif Général HT</th>
                          <th>Tarif Client HT</th>
                          <th>Écart</th>
                          <th>PVPR TTC</th>
                          <th>Marge Highway</th>
                          <th>Marge Client</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProduits.map(p => {
                          const general = getGeneralVente(p.id)
                          const client = getClientVente(p.id, selectedClient.id)
                          if (!general && !client) return null
                          const achat = getLastAchat(p.id)
                          const gHT = general?.prix_unitaire_ht
                          const cHT = client?.prix_unitaire_ht
                          const pvpr = p.pvpr
                          let ecart = null
                          let ecartColor = 'var(--text-muted)'
                          if (gHT && cHT) {
                            ecart = ((cHT - gHT) / gHT * 100).toFixed(1)
                            ecartColor = ecart > 0 ? '#e74c3c' : ecart < 0 ? '#27ae60' : 'var(--text-muted)'
                          }
                          const margeHW = calcMargeHighway(achat?.prix_unitaire_ht, cHT || gHT)
                          const margeCl = calcMargeClient(cHT || gHT, pvpr)
                          return (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 500 }}>{p.libelle}</td>
                              <td>{p.marques?.nom || '—'}</td>
                              <td>{gHT != null ? `${Number(gHT).toFixed(2)} €` : '—'}</td>
                              <td style={{ fontWeight: 500 }}>{cHT != null ? `${Number(cHT).toFixed(2)} €` : '—'}</td>
                              <td>{ecart != null ? <span style={{ fontWeight: 600, color: ecartColor }}>{ecart > 0 ? '+' : ''}{ecart}%</span> : '—'}</td>
                              <td>{pvpr != null ? `${Number(pvpr).toFixed(2)} €` : '—'}</td>
                              <td>{margeBadge(margeHW)}</td>
                              <td>{margeBadge(margeCl)}</td>
                              <td>
                                <button className="btn-icon" onClick={() => openEditModal(p, selectedClient.id)}><Edit2 size={14} /></button>
                              </td>
                            </tr>
                          )
                        }).filter(Boolean)}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal édition prix ── */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tarifs — {editModal.produit.libelle}</h3>
              <button className="btn-icon" onClick={() => setEditModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="section-title">Prix d'achat fournisseur</p>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Prix HT (€)</label>
                  <input type="number" step="0.01" value={editAchat.prix_unitaire_ht} onChange={e => setEditAchat(p => ({ ...p, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>TVA (%)</label>
                  <select value={editAchat.taux_tva} onChange={e => setEditAchat(p => ({ ...p, taux_tva: parseFloat(e.target.value) }))}>
                    {TVA_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Prix TTC (€)</label>
                  <input type="text" disabled value={editAchat.prix_unitaire_ht ? (parseFloat(editAchat.prix_unitaire_ht) * (1 + editAchat.taux_tva / 100)).toFixed(2) : '—'} style={{ background: 'var(--surface-2)' }} />
                </div>
              </div>
              <div style={{ marginTop: 8, marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={saveEditAchat} disabled={savingEdit} style={{ fontSize: 13 }}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer prix d\'achat'}
                </button>
              </div>

              <hr className="divider" />
              <p className="section-title">Tarif général de vente</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Prix vente HT (€)</label>
                  <input type="number" step="0.01" value={editVenteGeneral.prix_unitaire_ht} onChange={e => setEditVenteGeneral(p => ({ ...p, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Remise (%)</label>
                  <input type="number" step="0.1" value={editVenteGeneral.remise_pourcent} onChange={e => setEditVenteGeneral(p => ({ ...p, remise_pourcent: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div style={{ marginTop: 8, marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={saveEditVenteGeneral} disabled={savingEdit} style={{ fontSize: 13 }}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer tarif général'}
                </button>
              </div>

              <hr className="divider" />
              <p className="section-title">PVPR & Marges</p>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>PVPR TTC (€)</label>
                  <input type="number" step="0.01" value={editPvpr} onChange={e => setEditPvpr(e.target.value)} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Marge Highway</label>
                  <input type="text" disabled value={
                    editAchat.prix_unitaire_ht && editVenteGeneral.prix_unitaire_ht
                      ? `${calcMargeHighway(parseFloat(editAchat.prix_unitaire_ht), parseFloat(editVenteGeneral.prix_unitaire_ht)).toFixed(1)}%`
                      : '—'
                  } style={{ background: 'var(--surface-2)', fontWeight: 600 }} />
                </div>
                <div className="form-group">
                  <label>Marge Client</label>
                  <input type="text" disabled value={
                    editVenteGeneral.prix_unitaire_ht && editPvpr
                      ? `${calcMargeClient(parseFloat(editVenteGeneral.prix_unitaire_ht), parseFloat(editPvpr)).toFixed(1)}%`
                      : '—'
                  } style={{ background: 'var(--surface-2)', fontWeight: 600 }} />
                </div>
              </div>
              <div style={{ marginTop: 8, marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={async () => {
                  setSavingEdit(true)
                  const { error } = await supabase.from('produits').update({ pvpr: editPvpr ? parseFloat(editPvpr) : null }).eq('id', editModal.produit.id)
                  setSavingEdit(false)
                  if (error) return toast('Erreur : ' + error.message, 'error')
                  toast('PVPR enregistré', 'success')
                  fetchAll()
                }} disabled={savingEdit} style={{ fontSize: 13 }}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer PVPR'}
                </button>
              </div>

              {editModal.clientId && (
                <>
                  <hr className="divider" />
                  <p className="section-title">Tarif client spécifique</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Prix client HT (€)</label>
                      <input type="number" step="0.01" value={editVenteClient.prix_unitaire_ht} onChange={e => setEditVenteClient(p => ({ ...p, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label>Remise (%)</label>
                      <input type="number" step="0.1" value={editVenteClient.remise_pourcent} onChange={e => setEditVenteClient(p => ({ ...p, remise_pourcent: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={saveEditVenteClient} disabled={savingEdit} style={{ fontSize: 13 }}>
                      {savingEdit ? 'Enregistrement...' : 'Enregistrer tarif client'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal majoration en masse ── */}
      {bulkModal && (
        <div className="modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Majoration en masse</h3>
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
                          <div key={p.id} onClick={() => setBulkSelectedIds(prev => {
                            const n = new Set(prev)
                            n.has(p.id) ? n.delete(p.id) : n.add(p.id)
                            return n
                          })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 5, background: checked ? '#e8f0eb' : 'transparent' }}>
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
                  <p className="section-title">2. Aperçu de la majoration ({bulkPourcent >= 0 ? '+' : ''}{bulkPourcent}%)</p>
                  {bulkPreview.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <Package />
                      <p>Aucun produit avec tarif général trouvé pour cette sélection</p>
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: 350, overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Produit</th>
                            <th>Tarif Général HT</th>
                            <th>Ancien prix client</th>
                            <th>Nouveau prix client</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.map(item => (
                            <tr key={item.produit.id}>
                              <td style={{ fontWeight: 500 }}>{item.produit.libelle}</td>
                              <td>{Number(item.tarifGeneral).toFixed(2)} €</td>
                              <td>{item.ancienPrixClient != null ? `${Number(item.ancienPrixClient).toFixed(2)} €` : '—'}</td>
                              <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.nouveauPrixClient.toFixed(2)} €</td>
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
                  <button className="btn btn-primary" onClick={computeBulkPreview} disabled={!bulkCanPreview}>
                    Aperçu
                  </button>
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
    </div>
  )
}
