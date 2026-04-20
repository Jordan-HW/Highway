import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Building2, Edit2, Trash2, UserPlus, Tag } from 'lucide-react'

const emptyMarque = {
  nom: '', code: '', pays: '', devise: 'EUR', delai_livraison_jours: 7,
  conditions_paiement: '', adresse: '', notes: '', actif: true,
  nomenclature_specifique: false
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
  const [editingContact, setEditingContact] = useState(null) // idx du contact en édition

  // Catégories
  const [categories, setCategories] = useState([])
  const [deletedCatIds, setDeletedCatIds] = useState([])
  const [newCatName, setNewCatName] = useState('')

  // Onglet actif dans la modale
  const [tab, setTab] = useState('infos')
  const [editingInfos, setEditingInfos] = useState(false)

  // Modale catégories générales
  const [catModal, setCatModal] = useState(false)
  const [globalCats, setGlobalCats] = useState([])
  const [newGlobalCatName, setNewGlobalCatName] = useState('')
  const [savingCats, setSavingCats] = useState(false)

  useEffect(() => { fetchMarques() }, [])

  async function fetchMarques() {
    setLoading(true)
    const { data } = await supabase
      .from('marques')
      .select('*, marque_contacts(id, prenom, nom, fonction, email, telephone), categories(id, nom)')
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
    setEditingInfos(true)
    setModal(true)
  }

  function openEdit(row) {
    const { marque_contacts, categories: cats, ...marqueData } = row
    setForm(marqueData)
    setEditing(row.id)
    setContacts(marque_contacts?.length ? marque_contacts.map(c => ({ ...c })) : [])
    setDeletedContactIds([])
    setCategories(cats?.length ? cats.map(c => ({ ...c })) : [])
    setDeletedCatIds([])
    setNewCatName('')
    setTab('infos')
    setEditingInfos(false)
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
  function addContact() {
    setContacts(prev => [...prev, { ...emptyContact }])
    setEditingContact(contacts.length)
  }
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
      return toast('Cette famille existe déjà', 'error')
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

  // ── Familles générales ──
  async function openGlobalCats() {
    const { data } = await supabase.from('categories').select('id, nom').is('marque_id', null).order('nom')
    setGlobalCats(data || [])
    setNewGlobalCatName('')
    setCatModal(true)
  }

  async function addGlobalCat() {
    const name = newGlobalCatName.trim()
    if (!name) return
    if (globalCats.some(c => c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette famille existe déjà', 'error')
    }
    setSavingCats(true)
    const { data, error } = await supabase.from('categories').insert({ nom: name }).select('id, nom').single()
    setSavingCats(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)))
    setNewGlobalCatName('')
  }

  async function removeGlobalCat(cat) {
    if (!confirm(`Supprimer la famille "${cat.nom}" ?`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => prev.filter(c => c.id !== cat.id))
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openGlobalCats}>
            <Tag size={15} /> Familles générales
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Nouvelle marque
          </button>
        </div>
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
                    <th>Nomenclature</th>
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
                      <td>
                        {row.nomenclature_specifique
                          ? <span className="badge badge-purple" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>Spécifique ({row.categories?.length || 0})</span>
                          : <span className="badge badge-gray">Générale</span>
                        }
                      </td>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editing ? form.nom : 'Nouvelle marque'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
              {[
                { key: 'infos', label: 'Infos' },
                { key: 'contacts', label: `Contacts (${contacts.filter(c => c.prenom || c.nom || c.email).length})` },
                ...(form.nomenclature_specifique ? [{ key: 'categories', label: `Familles (${categories.length})` }] : []),
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: tab === t.key ? 600 : 400,
                    color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    marginBottom: -1,
                    fontFamily: 'var(--font)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ padding: '16px 20px' }}>
              {/* ── TAB INFOS ── */}
              {tab === 'infos' && !editingInfos && editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Informations</span>
                    <button className="btn-icon" onClick={() => setEditingInfos(true)} title="Modifier"><Edit2 size={14} /></button>
                  </div>
                  {[
                    ['Code', form.code],
                    ['Pays', form.pays],
                    ['Devise', form.devise],
                    ['Délai livraison', form.delai_livraison_jours ? `${form.delai_livraison_jours} jours` : null],
                    ['Paiement', form.conditions_paiement],
                    ['Adresse', form.adresse],
                    ['Notes', form.notes],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ width: 120, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
                      <span style={{ color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{val || '—'}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ width: 120, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>Statut</span>
                    <span className={`badge ${form.actif ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 11 }}>{form.actif ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <div style={{ display: 'flex', padding: '7px 0', fontSize: 13 }}>
                    <span style={{ width: 120, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>Nomenclature</span>
                    <span>{form.nomenclature_specifique
                      ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11 }}>Spécifique</span>
                      : <span className="badge badge-gray" style={{ fontSize: 11 }}>Générale</span>
                    }</span>
                  </div>
                </div>
              )}

              {tab === 'infos' && (editingInfos || !editing) && (
                <>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Nom *</label>
                      <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom de la marque" />
                    </div>
                    <div className="form-group">
                      <label>Code interne</label>
                      <input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="MKS001" />
                    </div>
                    <div className="form-group">
                      <label>Pays</label>
                      <input value={form.pays || ''} onChange={e => set('pays', e.target.value)} placeholder="Royaume-Uni..." />
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
                      <label>Délai livraison (j)</label>
                      <input type="number" value={form.delai_livraison_jours} onChange={e => set('delai_livraison_jours', +e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Conditions paiement</label>
                      <input value={form.conditions_paiement || ''} onChange={e => set('conditions_paiement', e.target.value)} placeholder="30j fin de mois" />
                    </div>
                    <div className="form-group form-full">
                      <label>Adresse</label>
                      <textarea value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} rows={2} />
                    </div>
                    <div className="form-group form-full">
                      <label>Notes</label>
                      <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.actif} onChange={e => set('actif', e.target.checked)} />
                      Marque active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.nomenclature_specifique || false} onChange={e => {
                        set('nomenclature_specifique', e.target.checked)
                        if (!e.target.checked && tab === 'categories') setTab('infos')
                      }} />
                      Nomenclature familles spécifique
                    </label>
                  </div>
                </>
              )}

              {/* ── TAB CONTACTS ── */}
              {tab === 'contacts' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Contacts</span>
                    <button className="btn btn-secondary" onClick={addContact} style={{ fontSize: 11, padding: '4px 10px' }}>
                      <UserPlus size={13} /> Ajouter
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      Aucun contact.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {contacts.map((c, idx) => editingContact === idx ? (
                        /* ── Mode édition ── */
                        <div key={idx} style={{ border: '1px solid var(--primary-mid)', borderRadius: 'var(--radius)', padding: '10px 12px', background: 'var(--primary-light)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 11 }}>Prénom</label>
                              <input value={c.prenom || ''} onChange={e => setContact(idx, 'prenom', e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 11 }}>Nom</label>
                              <input value={c.nom || ''} onChange={e => setContact(idx, 'nom', e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 11 }}>Fonction</label>
                              <input value={c.fonction || ''} onChange={e => setContact(idx, 'fonction', e.target.value)} placeholder="Dir. commercial..." style={{ padding: '5px 8px', fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 11 }}>Email</label>
                              <input type="email" value={c.email || ''} onChange={e => setContact(idx, 'email', e.target.value)} style={{ padding: '5px 8px', fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: 11 }}>Téléphone</label>
                              <input value={c.telephone || ''} onChange={e => setContact(idx, 'telephone', e.target.value)} placeholder="+33..." style={{ padding: '5px 8px', fontSize: 13 }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setEditingContact(null)} style={{ fontSize: 11, padding: '3px 10px' }}>OK</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Mode lecture ── */
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {[c.prenom, c.nom].filter(Boolean).join(' ') || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sans nom</span>}
                              {c.fonction && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {c.fonction}</span>}
                            </span>
                            {(c.email || c.telephone) && (
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {[c.email, c.telephone].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            <button className="btn-icon" onClick={() => setEditingContact(idx)} title="Modifier"><Edit2 size={13} /></button>
                            <button className="btn-icon" onClick={() => removeContact(idx)} title="Supprimer"><Trash2 size={13} /></button>
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
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCategory()}
                      placeholder="Nouvelle famille..."
                      style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    />
                    <button className="btn btn-primary" onClick={addCategory} style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}>
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      Aucune famille.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {categories.map((c, idx) => (
                        <div
                          key={c.id || `new-${idx}`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            background: c._new ? 'var(--primary-light)' : 'var(--surface-2)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Tag size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: 13 }}>{c.nom}</span>
                            {c._new && <span style={{ fontSize: 10, color: 'var(--primary)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>Nouveau</span>}
                          </div>
                          <button className="btn-icon" onClick={() => removeCategory(idx)} title="Supprimer"><Trash2 size={13} /></button>
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
      {catModal && (
        <div className="modal-overlay" onClick={() => setCatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Familles générales</h3>
              <button className="btn-icon" onClick={() => setCatModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Ces familles sont utilisées par les marques qui n'ont pas de nomenclature spécifique.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={newGlobalCatName}
                  onChange={e => setNewGlobalCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGlobalCat()}
                  placeholder="Nom de la famille..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={addGlobalCat} disabled={savingCats} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>

              {globalCats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  <Tag size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p>Aucune famille générale.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {globalCats.map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--surface-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nom}</span>
                      </div>
                      <button className="btn-icon" onClick={() => removeGlobalCat(c)} title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCatModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
