import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Warehouse, AlertTriangle, Edit2 } from 'lucide-react'

export default function Stock() {
  const [lots, setLots] = useState([])
  const [produits, setProduits] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAlerte, setFilterAlerte] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ produit_id: '', fournisseur_id: '', numero_lot: '', dlc: '', date_reception: new Date().toISOString().split('T')[0], quantite_initiale: '', emplacement: '', statut: 'disponible', notes: '' })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: l }, { data: p }, { data: f }] = await Promise.all([
      supabase.from('lots').select('*, produits(libelle, ean13, marque), fournisseurs(nom)').order('dlc', { ascending: true }),
      supabase.from('produits').select('id, libelle, marque').eq('statut', 'actif').order('libelle'),
      supabase.from('fournisseurs').select('id, nom').eq('actif', true).order('nom')
    ])
    // Calculate stock per lot from mouvements
    const lotsWithStock = await Promise.all((l || []).map(async lot => {
      const { data: mvts } = await supabase.from('mouvements_stock').select('quantite').eq('lot_id', lot.id)
      const stock = (mvts || []).reduce((sum, m) => sum + parseFloat(m.quantite), parseFloat(lot.quantite_initiale || 0))
      return { ...lot, stock_actuel: stock }
    }))
    setLots(lotsWithStock)
    setProduits(p || [])
    setFournisseurs(f || [])
    setLoading(false)
  }

  function dlcAlerte(dlc) {
    if (!dlc) return null
    const days = Math.ceil((new Date(dlc) - new Date()) / 86400000)
    if (days < 0) return 'PÉRIMÉ'
    if (days <= 30) return 'ALERTE'
    if (days <= 90) return 'ATTENTION'
    return 'OK'
  }

  function alerteBadge(a) {
    if (a === 'PÉRIMÉ') return 'badge-red'
    if (a === 'ALERTE') return 'badge-red'
    if (a === 'ATTENTION') return 'badge-orange'
    return 'badge-green'
  }

  function openCreate() { setForm({ produit_id: '', fournisseur_id: '', numero_lot: '', dlc: '', date_reception: new Date().toISOString().split('T')[0], quantite_initiale: '', emplacement: '', statut: 'disponible', notes: '' }); setEditing(null); setModal(true) }
  function openEdit(row) { setForm({ ...row, fournisseur_id: row.fournisseur_id || '' }); setEditing(row.id); setModal(true) }
  function close() { setModal(false); setEditing(null) }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    if (!form.produit_id) return toast('Le produit est obligatoire', 'error')
    if (!form.numero_lot) return toast('Le numéro de lot est obligatoire', 'error')
    if (!form.quantite_initiale) return toast('La quantité est obligatoire', 'error')
    setSaving(true)
    let error
    if (editing) {
      const { error: e } = await supabase.from('lots').update(form).eq('id', editing)
      error = e
    } else {
      const { error: e } = await supabase.from('lots').insert(form)
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editing ? 'Lot mis à jour' : 'Lot créé', 'success')
    close(); fetchAll()
  }

  const filtered = lots.filter(r => {
    const matchSearch = (r.produits?.libelle || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.numero_lot || '').toLowerCase().includes(search.toLowerCase())
    const alerte = dlcAlerte(r.dlc)
    const matchAlerte = !filterAlerte || alerte === filterAlerte
    return matchSearch && matchAlerte
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Stock & Lots</h2>
          <p>{lots.length} lot{lots.length > 1 ? 's' : ''} en stock</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nouveau lot
        </button>
      </div>

      <div className="page-body">
        {/* Alertes DLC */}
        {lots.filter(l => dlcAlerte(l.dlc) === 'PÉRIMÉ' || dlcAlerte(l.dlc) === 'ALERTE').length > 0 && (
          <div style={{ background: 'var(--danger-light)', border: '1px solid #f0c0bb', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 13.5 }}>
              {lots.filter(l => dlcAlerte(l.dlc) === 'PÉRIMÉ' || dlcAlerte(l.dlc) === 'ALERTE').length} lot(s) avec alerte DLC !
            </span>
          </div>
        )}

        <div className="filters-bar">
          <div className="search-input">
            <Search />
            <input placeholder="Produit, numéro de lot..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterAlerte} onChange={e => setFilterAlerte(e.target.value)}>
            <option value="">Toutes les alertes</option>
            <option value="PÉRIMÉ">Périmé</option>
            <option value="ALERTE">Alerte DLC (&lt; 30j)</option>
            <option value="ATTENTION">Attention (&lt; 90j)</option>
            <option value="OK">OK</option>
          </select>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Fournisseur</th>
                    <th>N° Lot</th>
                    <th>DLC</th>
                    <th>Alerte</th>
                    <th>Stock actuel</th>
                    <th>Emplacement</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9}>
                      <div className="empty-state">
                        <Warehouse />
                        <p>Aucun lot en stock.</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(row => {
                    const alerte = dlcAlerte(row.dlc)
                    return (
                      <tr key={row.id} onClick={() => openEdit(row)}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{row.produits?.libelle || '—'}</div>
                          {row.produits?.marque && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.produits.marque}</div>}
                        </td>
                        <td>{row.fournisseurs?.nom || '—'}</td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.numero_lot}</span></td>
                        <td>{row.dlc ? new Date(row.dlc).toLocaleDateString('fr-FR') : '—'}</td>
                        <td>{alerte ? <span className={`badge ${alerteBadge(alerte)}`}>{alerte}</span> : '—'}</td>
                        <td><strong>{row.stock_actuel}</strong></td>
                        <td>{row.emplacement || '—'}</td>
                        <td><span className={`badge ${row.statut === 'disponible' ? 'badge-green' : row.statut === 'bloqué' ? 'badge-red' : 'badge-gray'}`}>{row.statut}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn-icon" onClick={() => openEdit(row)}><Edit2 size={14} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier le lot' : 'Nouveau lot'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Produit *</label>
                  <select value={form.produit_id} onChange={e => set('produit_id', e.target.value)}>
                    <option value="">Sélectionner un produit...</option>
                    {produits.map(p => <option key={p.id} value={p.id}>{p.libelle} {p.marque ? `— ${p.marque}` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fournisseur</label>
                  <select value={form.fournisseur_id} onChange={e => set('fournisseur_id', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>N° de lot *</label>
                  <input value={form.numero_lot} onChange={e => set('numero_lot', e.target.value)} placeholder="LOT-2024-001" style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                <div className="form-group">
                  <label>Date de réception</label>
                  <input type="date" value={form.date_reception || ''} onChange={e => set('date_reception', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>DLC</label>
                  <input type="date" value={form.dlc || ''} onChange={e => set('dlc', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Quantité initiale *</label>
                  <input type="number" step="0.001" value={form.quantite_initiale} onChange={e => set('quantite_initiale', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Emplacement</label>
                  <input value={form.emplacement || ''} onChange={e => set('emplacement', e.target.value)} placeholder="Zone A, Allée 3..." />
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                    <option value="disponible">Disponible</option>
                    <option value="bloqué">Bloqué</option>
                    <option value="rappelé">Rappelé</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <label>Notes</label>
                  <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le lot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
