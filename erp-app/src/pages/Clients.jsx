import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Users, Edit2, Trash2 } from 'lucide-react'

const empty = {
  nom: '', code: '', type: 'indépendant', enseigne: '', siret: '',
  tva_intracommunautaire: '', contact_nom: '', contact_email: '',
  contact_telephone: '', adresse_facturation: '', adresse_livraison_principale: '',
  code_postal: '', ville: '', pays: 'France',
  conditions_paiement: '', delai_paiement_jours: 30,
  mode_transmission_commande: 'email', code_edi: '', notes: '', actif: true
}

export default function Clients() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('nom')
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
      const { error: e } = await supabase.from('clients').update(form).eq('id', editing)
      error = e
    } else {
      const { error: e } = await supabase.from('clients').insert(form)
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editing ? 'Client mis à jour' : 'Client créé', 'success')
    close(); fetch()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce client ?')) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Client supprimé', 'success')
    fetch()
  }

  const filtered = rows.filter(r => {
    const matchSearch = r.nom.toLowerCase().includes(search.toLowerCase()) ||
      (r.enseigne || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.ville || '').toLowerCase().includes(search.toLowerCase())
    const matchType = !filterType || r.type === filterType
    return matchSearch && matchType
  })

  const typeBadge = t => t === 'centrale' ? 'badge-blue' : t === 'grossiste' ? 'badge-orange' : 'badge-gray'

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clients</h2>
          <p>{rows.length} client{rows.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nouveau client
        </button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div className="search-input">
            <Search />
            <input placeholder="Nom, enseigne, ville..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="centrale">Centrale d'achat</option>
            <option value="indépendant">Indépendant</option>
            <option value="grossiste">Grossiste</option>
          </select>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Ville</th>
                    <th>Contact</th>
                    <th>Paiement</th>
                    <th>Commandes</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8}>
                      <div className="empty-state">
                        <Users />
                        <p>Aucun client. Créez-en un !</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(row => (
                    <tr key={row.id} onClick={() => openEdit(row)}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{row.nom}</div>
                          {row.enseigne && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.enseigne}</div>}
                        </div>
                      </td>
                      <td><span className={`badge ${typeBadge(row.type)}`}>{row.type}</span></td>
                      <td>{row.ville || '—'}</td>
                      <td>{row.contact_nom || '—'}</td>
                      <td>{row.delai_paiement_jours} j</td>
                      <td><span className="badge badge-gray">{row.mode_transmission_commande}</span></td>
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
              <h3>{editing ? 'Modifier le client' : 'Nouveau client'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="section-title">Informations générales</p>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom du client" />
                </div>
                <div className="form-group">
                  <label>Code interne</label>
                  <input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="CLI001" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="centrale">Centrale d'achat</option>
                    <option value="indépendant">Indépendant</option>
                    <option value="grossiste">Grossiste</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Enseigne</label>
                  <input value={form.enseigne || ''} onChange={e => set('enseigne', e.target.value)} placeholder="Carrefour, Franprix..." />
                </div>
                <div className="form-group">
                  <label>SIRET</label>
                  <input value={form.siret || ''} onChange={e => set('siret', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                <div className="form-group">
                  <label>TVA intracommunautaire</label>
                  <input value={form.tva_intracommunautaire || ''} onChange={e => set('tva_intracommunautaire', e.target.value)} />
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
              </div>

              <hr className="divider" />
              <p className="section-title">Adresses</p>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Adresse de facturation</label>
                  <textarea value={form.adresse_facturation || ''} onChange={e => set('adresse_facturation', e.target.value)} rows={2} />
                </div>
                <div className="form-group form-full">
                  <label>Adresse de livraison principale</label>
                  <textarea value={form.adresse_livraison_principale || ''} onChange={e => set('adresse_livraison_principale', e.target.value)} rows={2} />
                </div>
                <div className="form-group">
                  <label>Code postal</label>
                  <input value={form.code_postal || ''} onChange={e => set('code_postal', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Ville</label>
                  <input value={form.ville || ''} onChange={e => set('ville', e.target.value)} />
                </div>
              </div>

              <hr className="divider" />
              <p className="section-title">Commercial & Paiement</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Conditions de paiement</label>
                  <input value={form.conditions_paiement || ''} onChange={e => set('conditions_paiement', e.target.value)} placeholder="30 jours fin de mois" />
                </div>
                <div className="form-group">
                  <label>Délai paiement (jours)</label>
                  <input type="number" value={form.delai_paiement_jours} onChange={e => set('delai_paiement_jours', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mode de transmission commande</label>
                  <select value={form.mode_transmission_commande} onChange={e => set('mode_transmission_commande', e.target.value)}>
                    <option value="email">Email</option>
                    <option value="EDI">EDI</option>
                    <option value="portail">Portail web</option>
                    <option value="téléphone">Téléphone</option>
                    <option value="manuel">Saisie manuelle</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Code EDI (GLN)</label>
                  <input value={form.code_edi || ''} onChange={e => set('code_edi', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
              </div>

              <hr className="divider" />
              <div className="form-group">
                <label>Notes internes</label>
                <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.actif} onChange={e => set('actif', e.target.checked)} />
                  Client actif
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
