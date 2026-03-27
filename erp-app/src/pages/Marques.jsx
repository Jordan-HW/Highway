import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Building2, Edit2, Trash2, UserPlus, Tag } from 'lucide-react'

const emptyMarque = {
  nom: '', code: '', pays: '', devise: 'EUR', delai_livraison_jours: 7,
  conditions_paiement: '', adresse: '', notes: '', actif: true
}

const emptyContact = { prenom: '', nom: '', fonction: '', email: '' }

export default function Marques() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyMarque)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState([])
  const [deletedContactIds, setDeletedContactIds] = useState([])

  // Catégories
  const [categories, setCategories] = useState([])
  const [deletedCatIds, setDeletedCatIds] = useState([])
  const [newCatName, setNewCatName] = useState('')

  // Onglet actif dans la modale
  const [tab, setTab] = useState('infos')

  useEffect(() => { fetchMarques() }, [])

  async function fetchMarques() {
    setLoading(true)
    const { data } = await supabase
      .from('marques')
      .select('*, marque_contacts(id, prenom, nom, fonction, email), categories(id, nom)')
      .order('nom')
    setRows(data || [])
    setLoading(false)
  }

  function openCreate() {
    setForm(emptyMarque)
    setEditing(null)
    setContacts([{ ...emptyContact }])
    setDeletedContactIds([])
    setCategories([])
    setDeletedCatIds([])
    setNewCatName('')
    setTab('infos')
    setModal(true)
  }

  function openEdit(row) {
    const { marque_contacts, categories: cats, ...marqueData } = row
    setForm(marqueData)
    setEditing(row.id)
    setContacts(marque_contacts?.length ? marque_contacts.map(c => ({ ...c })) : [{ ...emptyContact }])
    setDeletedContactIds([])
    setCategories(cats?.length ? cats.map(c => ({ ...c })) : [])
    setDeletedCatIds([])
    setNewCatName('')
    setTab('infos')
    setModal(true)
  }

  function close() {
    setModal(false)
    setForm(emptyMarque)
    setEditing(null)
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  // ── Contact helpers ──
  function setContact(idx, field, val) {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))
  }
  function addContact() { setContacts(prev => [...prev, { ...emptyContact }]) }
  function removeContact(idx) {
    const c = contacts[idx]
    if (c.id) setDeletedContactIds(prev => [...prev, c.id])
    setContacts(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Catégorie helpers ──
  function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    if (categories.some(c => c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette catégorie existe déjà', 'error')
    }
    setCategories(prev => [...prev, { nom: name, _new: true }])
    setNewCatName('')
  }
  function removeCategory(idx) {
    const c = categories[idx]
    if (c.id) setDeletedCatIds(prev => [...prev, c.id])
    setCategories(prev => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    if (!form.nom.trim()) return toast('Le nom est obligatoire', 'error')
    setSaving(true)

    try {
      let marqueId = editing

      // Save marque
      if (editing) {
        const { error } = await supabase.from('marques').update(form).eq('id', editing)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('marques').insert(form).select('id').single()
        if (error) throw error
        marqueId = data.id
      }

      // ── Save contacts ──
      // Delete removed contacts
      if (deletedContactIds.length) {
        await supabase.from('marque_contacts').delete().in('id', deletedContactIds)
      }
      // Upsert existing + insert new
      for (const c of contacts) {
        const hasData = c.prenom || c.nom || c.fonction || c.email
        if (!hasData) continue
        if (c.id) {
          const { id, ...payload } = c
          await supabase.from('marque_contacts').update(payload).eq('id', id)
        } else {
          await supabase.from('marque_contacts').insert({ ...c, marque_id: marqueId })
        }
      }

      // ── Save catégories ──
      if (deletedCatIds.length) {
        await supabase.from('categories').delete().in('id', deletedCatIds)
      }
      for (const c of categories) {
        if (c._new) {
          await supabase.from('categories').insert({ nom: c.nom, marque_id: marqueId })
        }
      }

      toast(editing ? 'Marque mise à jour' : 'Marque créée', 'success')
      close()
      fetchMarques()
    } catch (err) {
      toast('Erreur : ' + err.message, 'error')
    }
    setSaving(false)
  }

  async function remove(id) {
    if (!confirm('Supprimer cette marque ?')) return
    const { error } = await supabase.from('marques').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Marque supprimée', 'success')
    fetchMarques()
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
          <Plus size={15} /> Nouvelle marque
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
                    <th>Contacts</th>
                    <th>Catégories</th>
                    <th>Délai livraison</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8}>
                      <div className="empty-state">
                        <Building2 />
                        <p>Aucune marque. Créez-en une !</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(row => (
                    <tr key={row.id} onClick={() => openEdit(row)}>
                      <td><strong>{row.nom}</strong></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.code || '—'}</span></td>
                      <td>{row.pays || '—'}</td>
                      <td>{row.marque_contacts?.length || 0}</td>
                      <td>{row.categories?.length || 0}</td>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier la marque' : 'Nouvelle marque'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
              {[
                { key: 'infos', label: 'Informations' },
                { key: 'contacts', label: `Contacts (${contacts.filter(c => c.prenom || c.nom || c.email).length})` },
                { key: 'categories', label: `Catégories (${categories.length})` },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: tab === t.key ? 600 : 400,
                    color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {/* ── TAB INFOS ── */}
              {tab === 'infos' && (
                <>
                  <p className="section-title">Informations générales</p>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Nom *</label>
                      <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom de la marque" />
                    </div>
                    <div className="form-group">
                      <label>Code interne</label>
                      <input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="EX: MKS001" />
                    </div>
                    <div className="form-group">
                      <label>Pays</label>
                      <input value={form.pays || ''} onChange={e => set('pays', e.target.value)} placeholder="Royaume-Uni, France..." />
                    </div>
                    <div className="form-group">
                      <label>Devise</label>
                      <select value={form.devise} onChange={e => set('devise', e.target.value)}>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD $</option>
                        <option value="GBP">GBP £</option>
                        <option value="CHF">CHF</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Délai livraison (jours)</label>
                      <input type="number" value={form.delai_livraison_jours} onChange={e => set('delai_livraison_jours', +e.target.value)} />
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
                      Marque active
                    </label>
                  </div>
                </>
              )}

              {/* ── TAB CONTACTS ── */}
              {tab === 'contacts' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <p className="section-title" style={{ margin: 0 }}>Contacts de la marque</p>
                    <button className="btn btn-secondary" onClick={addContact} style={{ fontSize: 12, padding: '6px 12px' }}>
                      <UserPlus size={14} /> Ajouter
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      <UserPlus size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <p>Aucun contact. Ajoutez-en un.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {contacts.map((c, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: 16,
                            position: 'relative',
                            background: 'var(--surface-2)',
                          }}
                        >
                          <button
                            className="btn-icon"
                            onClick={() => removeContact(idx)}
                            style={{ position: 'absolute', top: 8, right: 8 }}
                            title="Supprimer ce contact"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="form-grid">
                            <div className="form-group">
                              <label>Prénom</label>
                              <input value={c.prenom || ''} onChange={e => setContact(idx, 'prenom', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>Nom</label>
                              <input value={c.nom || ''} onChange={e => setContact(idx, 'nom', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>Fonction</label>
                              <input value={c.fonction || ''} onChange={e => setContact(idx, 'fonction', e.target.value)} placeholder="Directeur commercial..." />
                            </div>
                            <div className="form-group">
                              <label>Email</label>
                              <input type="email" value={c.email || ''} onChange={e => setContact(idx, 'email', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── TAB CATÉGORIES ── */}
              {tab === 'categories' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <p className="section-title" style={{ margin: 0 }}>Catégories de la marque</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCategory()}
                      placeholder="Nom de la catégorie..."
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={addCategory} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      <Tag size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <p>Aucune catégorie pour cette marque.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {categories.map((c, idx) => (
                        <div
                          key={c.id || `new-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            background: c._new ? 'var(--primary-light)' : 'var(--surface-2)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nom}</span>
                            {c._new && <span style={{ fontSize: 10, color: 'var(--primary)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>Nouveau</span>}
                          </div>
                          <button className="btn-icon" onClick={() => removeCategory(idx)} title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
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
