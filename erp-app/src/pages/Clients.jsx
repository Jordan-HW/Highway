import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Users, Edit2, Trash2, UserPlus } from 'lucide-react'

const empty = {
  nom: '', code: '', type: 'indépendant', enseigne: '', siret: '',
  tva_intracommunautaire: '', adresse_facturation: '', adresse_livraison_principale: '',
  code_postal: '', ville: '', pays: 'France',
  conditions_paiement: '', delai_paiement_jours: 30,
  mode_transmission_commande: 'email', code_edi: '', notes: '', actif: true
}

const emptyContact = { prenom: '', nom: '', fonction: '', email: '', telephone: '' }

export default function Clients() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Onglet actif + mode édition par section
  const [tab, setTab] = useState('infos')
  const [editingInfos, setEditingInfos] = useState(false)
  const [editingLogistique, setEditingLogistique] = useState(false)
  const [editingFacturation, setEditingFacturation] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState([])
  const [deletedContactIds, setDeletedContactIds] = useState([])
  const [editingContact, setEditingContact] = useState(null)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*, client_contacts(id, prenom, nom, fonction, email, telephone)')
      .order('nom')
    setRows(data || [])
    setLoading(false)
  }

  function openCreate() {
    setForm(empty)
    setEditing(null)
    setContacts([{ ...emptyContact }])
    setDeletedContactIds([])
    setTab('infos')
    setEditingInfos(true)
    setEditingLogistique(true)
    setEditingFacturation(true)
    setEditingContact(null)
    setModal(true)
  }

  function openEdit(row) {
    const { client_contacts, ...clientData } = row
    setForm(clientData)
    setEditing(row.id)
    setContacts(client_contacts?.length ? client_contacts.map(c => ({ ...c })) : [])
    setDeletedContactIds([])
    setTab('infos')
    setEditingInfos(false)
    setEditingLogistique(false)
    setEditingFacturation(false)
    setEditingContact(null)
    setModal(true)
  }

  function close() { setModal(false); setForm(empty); setEditing(null) }
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

  async function save() {
    if (!form.nom.trim()) return toast('Le nom est obligatoire', 'error')
    setSaving(true)

    try {
      let clientId = editing

      // Exclure les jointures du payload
      const { client_contacts, ...payload } = form

      if (editing) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editing)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('clients').insert(payload).select('id').single()
        if (error) throw error
        clientId = data.id
      }

      // ── Save contacts ──
      if (deletedContactIds.length) {
        await supabase.from('client_contacts').delete().in('id', deletedContactIds)
      }
      for (const c of contacts) {
        const hasData = c.prenom || c.nom || c.fonction || c.email
        if (!hasData) continue
        if (c.id) {
          const { id, ...cp } = c
          await supabase.from('client_contacts').update(cp).eq('id', id)
        } else {
          await supabase.from('client_contacts').insert({ ...c, client_id: clientId })
        }
      }

      toast(editing ? 'Client mis à jour' : 'Client créé', 'success')
      close(); fetch()
    } catch (err) {
      toast('Erreur : ' + err.message, 'error')
    }
    setSaving(false)
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

  // ── Read-only row helper ──
  const ReadRow = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ width: 140, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '—'}</span>
    </div>
  )

  // ── Section header with pencil ──
  const SectionHeader = ({ label, isEditing, onEdit }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>{label}</span>
      {!isEditing && editing && (
        <button className="btn-icon" onClick={onEdit} title="Modifier"><Edit2 size={14} /></button>
      )}
    </div>
  )

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
                      <td>{row.client_contacts?.length || 0}</td>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{editing ? form.nom : 'Nouveau client'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
              {[
                { key: 'infos', label: 'Infos générales' },
                { key: 'contacts', label: `Contacts (${contacts.filter(c => c.prenom || c.nom || c.email).length})` },
                { key: 'logistique', label: 'Logistique' },
                { key: 'facturation', label: 'Facturation' },
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

              {/* ── TAB INFOS GÉNÉRALES ── */}
              {tab === 'infos' && !editingInfos && editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <SectionHeader label="Informations générales" isEditing={false} onEdit={() => setEditingInfos(true)} />
                  <ReadRow label="Code" value={form.code} />
                  <ReadRow label="Type" value={form.type} />
                  <ReadRow label="Enseigne" value={form.enseigne} />
                  <ReadRow label="SIRET" value={form.siret} />
                  <ReadRow label="TVA intracomm." value={form.tva_intracommunautaire} />
                  <ReadRow label="Pays" value={form.pays} />
                  <ReadRow label="Notes" value={form.notes} />
                  <div style={{ display: 'flex', padding: '7px 0', fontSize: 13 }}>
                    <span style={{ width: 140, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>Statut</span>
                    <span className={`badge ${form.actif ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 11 }}>{form.actif ? 'Actif' : 'Inactif'}</span>
                  </div>
                </div>
              )}

              {tab === 'infos' && (editingInfos || !editing) && (
                <>
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
                    <div className="form-group">
                      <label>Pays</label>
                      <input value={form.pays || ''} onChange={e => set('pays', e.target.value)} />
                    </div>
                    <div className="form-group form-full">
                      <label>Notes internes</label>
                      <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={form.actif} onChange={e => set('actif', e.target.checked)} />
                      Client actif
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

              {/* ── TAB LOGISTIQUE ── */}
              {tab === 'logistique' && !editingLogistique && editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <SectionHeader label="Logistique" isEditing={false} onEdit={() => setEditingLogistique(true)} />
                  <ReadRow label="Adresse livraison" value={form.adresse_livraison_principale} />
                  <ReadRow label="Code postal" value={form.code_postal} />
                  <ReadRow label="Ville" value={form.ville} />
                  <ReadRow label="Mode commande" value={form.mode_transmission_commande} />
                  <ReadRow label="Code EDI (GLN)" value={form.code_edi} />
                </div>
              )}

              {tab === 'logistique' && (editingLogistique || !editing) && (
                <>
                  <div className="form-grid">
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
                </>
              )}

              {/* ── TAB FACTURATION ── */}
              {tab === 'facturation' && !editingFacturation && editing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <SectionHeader label="Facturation" isEditing={false} onEdit={() => setEditingFacturation(true)} />
                  <ReadRow label="Adresse facturation" value={form.adresse_facturation} />
                  <ReadRow label="Conditions paiement" value={form.conditions_paiement} />
                  <ReadRow label="Délai paiement" value={form.delai_paiement_jours ? `${form.delai_paiement_jours} jours` : null} />
                </div>
              )}

              {tab === 'facturation' && (editingFacturation || !editing) && (
                <>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Adresse de facturation</label>
                      <textarea value={form.adresse_facturation || ''} onChange={e => set('adresse_facturation', e.target.value)} rows={2} />
                    </div>
                    <div className="form-group">
                      <label>Conditions de paiement</label>
                      <input value={form.conditions_paiement || ''} onChange={e => set('conditions_paiement', e.target.value)} placeholder="30 jours fin de mois" />
                    </div>
                    <div className="form-group">
                      <label>Délai paiement (jours)</label>
                      <input type="number" value={form.delai_paiement_jours} onChange={e => set('delai_paiement_jours', +e.target.value)} />
                    </div>
                  </div>
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
