import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Building2, Edit2, Trash2 } from 'lucide-react'

const empty = {
  nom: '', code: '', pays: '', devise: 'EUR', delai_livraison_jours: 7,
  contact_nom: '', contact_email: '', contact_telephone: '',
  conditions_paiement: '', adresse: '', notes: '', actif: true
}

export default function Marques() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('marques').select('*').order('nom')
    setRows(data || [])
    setLoading(false)
  }

  function openCreate() { setForm(empty); setEditing(null); setModal(true) }
  function openEdit(row) { setForm(row); setEditing(row.id); setModal(true) }
  function close() { setModal(false); setForm(empty); setEditing(null) }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function save() {
    if (!form.nom.trim()) return toast('Le nom est obligatoire', 'error')
    setSaving(true)
    let error
    if (editing) {
      const { error: e } = await supabase.from('marques').update(form).eq('id', editing)
      error = e
    } else {
      const { error: e } = await supabase.from('marques').insert(form)
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editing ? 'Marque mis à jour' : 'Marque créé', 'success')
    close(); fetch()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce marque ?')) return
    const { error } = await supabase.from('marques').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Marque supprimé', 'success')
    fetch()
  }

  const filtered = rows.filter(r =>
    r.nom.toLowerCase().includes(search.toLowerCase()) ||
    (r.pays || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Marques</h2>
          <p>{rows.length} marque{rows.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nouveau marque
        </button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div className="search-input">
            <Search />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Pays</th>
                    <th>Contact</th>
                    <th>Délai livraison</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="empty-state">
                        <Building2 />
                        <p>Aucun marque. Créez-en un !</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(row => (
                    <tr key={row.id} onClick={() => openEdit(row)}>
                      <td><strong>{row.nom}</strong></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.code || '—'}</span></td>
                      <td>{row.pays || '—'}</td>
                      <td>{row.contact_nom || '—'}</td>
                      <td>{row.delai_livraison_jours} j</td>
                      <td><span className={`badge ${row.actif ? 'badge-green' : 'badge-gray'}`}>{row.actif ? 'Actif' : 'Inactif'}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEdit(row)}><Edit2 size={14} /></button>
                          <button className="btn-icon" onClick={() => remove(row.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <h3>{editing ? 'Modifier le marque' : 'Nouveau marque'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="section-title">Informations générales</p>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom du marque" />
                </div>
                <div className="form-group">
                  <label>Code interne</label>
                  <input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="EX: FOUR001" />
                </div>
                <div className="form-group">
                  <label>Pays</label>
                  <input value={form.pays || ''} onChange={e => set('pays', e.target.value)} placeholder="France, Espagne..." />
                </div>
                <div className="form-group">
                  <label>Devise</label>
                  <select value={form.devise} onChange={e => set('devise', e.target.value)}>
                    <option value="EUR">EUR €</option>
                    <option value="USD">USD $</option>
                    <option value="GBP">GBP £</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Délai livraison (jours)</label>
                  <input type="number" value={form.delai_livraison_jours} onChange={e => set('delai_livraison_jours', +e.target.value)} />
                </div>
              </div>

              <hr className="divider" />
              <p className="section-title">Contact</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom du contact</label>
                  <input value={form.contact_nom || ''} onChange={e => set('contact_nom', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.contact_email || ''} onChange={e => set('contact_email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input value={form.contact_telephone || ''} onChange={e => set('contact_telephone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Conditions de paiement</label>
                  <input value={form.conditions_paiement || ''} onChange={e => set('conditions_paiement', e.target.value)} placeholder="30 jours fin de mois" />
                </div>
              </div>

              <hr className="divider" />
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Adresse</label>
                  <textarea value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} rows={2} />
                </div>
                <div className="form-group form-full">
                  <label>Notes internes</label>
                  <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.actif} onChange={e => set('actif', e.target.checked)} />
                  Marque actif
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
