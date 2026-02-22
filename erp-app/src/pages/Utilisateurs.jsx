import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, X, Edit2, Trash2, Search, Shield, Users, Eye, EyeOff, Key } from 'lucide-react'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Accès complet', color: 'badge-red' },
  { value: 'commercial', label: 'Commercial', desc: 'Lecture seule', color: 'badge-blue' },
  { value: 'comptable', label: 'Comptable', desc: 'Factures uniquement', color: 'badge-orange' },
]

const emptyAdmin = { nom: '', email: '', mot_de_passe: '', role: 'commercial', actif: true }
const emptyPortail = { client_id: '', login: '', mot_de_passe: '', peut_commander: false, actif: true }

export default function Utilisateurs() {
  const [tab, setTab] = useState('admins')
  const [admins, setAdmins] = useState([])
  const [portails, setPortails] = useState([])
  const [clients, setClients] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // 'admin' | 'portail' | 'acces'
  const [formAdmin, setFormAdmin] = useState(emptyAdmin)
  const [formPortail, setFormPortail] = useState(emptyPortail)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [accesModal, setAccesModal] = useState(null) // portail row
  const [accesClient, setAccesClient] = useState([]) // fournisseurs autorisés pour ce client
  const [savingAcces, setSavingAcces] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: p }, { data: c }, { data: f }] = await Promise.all([
      supabase.rpc('list_admin_users'),
      supabase.from('portail_acces').select('*, clients(nom, enseigne)').order('login'),
      supabase.from('clients').select('id, nom, enseigne').eq('actif', true).order('nom'),
      supabase.from('fournisseurs').select('id, nom').eq('actif', true).order('nom'),
    ])
    setAdmins(a || [])
    setPortails(p || [])
    setClients(c || [])
    setFournisseurs(f || [])
    setLoading(false)
  }

  // --- ADMINS ---
  function openCreateAdmin() { setFormAdmin(emptyAdmin); setEditingId(null); setShowPwd(false); setModal('admin') }
  function openEditAdmin(row) { setFormAdmin(row); setEditingId(row.id); setShowPwd(false); setModal('admin') }

  async function saveAdmin() {
    if (!formAdmin.nom.trim()) return toast('Le nom est obligatoire', 'error')
    if (!formAdmin.email.trim()) return toast("L'email est obligatoire", 'error')
    if (!editingId && !formAdmin.mot_de_passe.trim()) return toast('Le mot de passe est obligatoire', 'error')
    setSaving(true)
    let error
    if (editingId) {
      const { error: e } = await supabase.rpc('update_admin_user', {
        p_id: editingId,
        p_nom: formAdmin.nom,
        p_email: formAdmin.email,
        p_mot_de_passe: formAdmin.mot_de_passe || null,
        p_role: formAdmin.role,
        p_actif: formAdmin.actif
      })
      error = e
    } else {
      const { error: e } = await supabase.rpc('create_admin_user', {
        p_nom: formAdmin.nom,
        p_email: formAdmin.email,
        p_mot_de_passe: formAdmin.mot_de_passe,
        p_role: formAdmin.role,
        p_actif: formAdmin.actif
      })
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editingId ? 'Utilisateur mis à jour' : 'Utilisateur créé', 'success')
    setModal(null); fetchAll()
  }

  async function deleteAdmin(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return
    const { error } = await supabase.rpc('delete_admin_user', { p_id: id })
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Utilisateur supprimé', 'success'); fetchAll()
  }

  // --- PORTAIL ---
  function openCreatePortail() { setFormPortail(emptyPortail); setEditingId(null); setShowPwd(false); setModal('portail') }
  function openEditPortail(row) { setFormPortail({ ...row, client_id: row.client_id }); setEditingId(row.id); setShowPwd(false); setModal('portail') }

  async function savePortail() {
    if (!formPortail.client_id) return toast('Le client est obligatoire', 'error')
    if (!formPortail.login.trim()) return toast('Le login est obligatoire', 'error')
    if (!editingId && !formPortail.mot_de_passe.trim()) return toast('Le mot de passe est obligatoire', 'error')
    setSaving(true)
    const payload = { ...formPortail }
    if (editingId && !payload.mot_de_passe) delete payload.mot_de_passe
    let error
    if (editingId) {
      const { error: e } = await supabase.from('portail_acces').update(payload).eq('id', editingId)
      error = e
    } else {
      const { error: e } = await supabase.from('portail_acces').insert(payload)
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editingId ? 'Accès mis à jour' : 'Accès créé', 'success')
    setModal(null); fetchAll()
  }

  async function deletePortail(id) {
    if (!confirm('Supprimer cet accès ?')) return
    const { error } = await supabase.from('portail_acces').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Accès supprimé', 'success'); fetchAll()
  }

  // --- FOURNISSEURS AUTORISES ---
  async function openAcces(portailRow) {
    setAccesModal(portailRow)
    const { data } = await supabase
      .from('client_fournisseurs_autorises')
      .select('fournisseur_id')
      .eq('client_id', portailRow.client_id)
    setAccesClient((data || []).map(d => d.fournisseur_id))
  }

  function toggleFournisseur(fid) {
    setAccesClient(prev =>
      prev.includes(fid) ? prev.filter(f => f !== fid) : [...prev, fid]
    )
  }

  async function saveAcces() {
    setSavingAcces(true)
    // Supprimer tous les accès existants
    await supabase.from('client_fournisseurs_autorises').delete().eq('client_id', accesModal.client_id)
    // Réinsérer les sélectionnés
    if (accesClient.length > 0) {
      const rows = accesClient.map(fid => ({ client_id: accesModal.client_id, fournisseur_id: fid }))
      await supabase.from('client_fournisseurs_autorises').insert(rows)
    }
    setSavingAcces(false)
    toast('Accès fournisseurs mis à jour', 'success')
    setAccesModal(null)
  }

  const filteredAdmins = admins.filter(a =>
    a.nom.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPortails = portails.filter(p =>
    p.login.toLowerCase().includes(search.toLowerCase()) ||
    (p.clients?.nom || '').toLowerCase().includes(search.toLowerCase())
  )

  const roleBadge = r => ROLES.find(x => x.value === r)?.color || 'badge-gray'
  const roleLabel = r => ROLES.find(x => x.value === r)?.label || r

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Utilisateurs & Accès</h2>
          <p>Gestion des admins et des accès portail client</p>
        </div>
        <button className="btn btn-primary" onClick={tab === 'admins' ? openCreateAdmin : openCreatePortail}>
          <Plus size={15} /> {tab === 'admins' ? 'Nouvel admin' : 'Nouvel accès client'}
        </button>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === 'admins' ? 'active' : ''}`} onClick={() => { setTab('admins'); setSearch('') }}>
            <Shield size={14} style={{ marginRight: 6, display: 'inline' }} />Admins ({admins.length})
          </button>
          <button className={`tab ${tab === 'portail' ? 'active' : ''}`} onClick={() => { setTab('portail'); setSearch('') }}>
            <Users size={14} style={{ marginRight: 6, display: 'inline' }} />Accès portail ({portails.length})
          </button>
        </div>

        <div className="filters-bar">
          <div className="search-input">
            <Search />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {tab === 'admins' && (
          <div className="card">
            <div className="table-container">
              {loading ? <div className="loading">Chargement...</div> : (
                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Dernière connexion</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmins.length === 0 ? (
                      <tr><td colSpan={6}><div className="empty-state"><Shield /><p>Aucun utilisateur admin.</p></div></td></tr>
                    ) : filteredAdmins.map(row => (
                      <tr key={row.id} onClick={() => openEditAdmin(row)}>
                        <td><strong>{row.nom}</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.email}</td>
                        <td><span className={`badge ${roleBadge(row.role)}`}>{roleLabel(row.role)}</span></td>
                        <td><span className={`badge ${row.actif ? 'badge-green' : 'badge-gray'}`}>{row.actif ? 'Actif' : 'Inactif'}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {row.derniere_connexion ? new Date(row.derniere_connexion).toLocaleDateString('fr-FR') : 'Jamais'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => openEditAdmin(row)}><Edit2 size={14} /></button>
                            <button className="btn-icon" onClick={() => deleteAdmin(row.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'portail' && (
          <div className="card">
            <div className="table-container">
              {loading ? <div className="loading">Chargement...</div> : (
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Login</th>
                      <th>Peut commander</th>
                      <th>Fournisseurs autorisés</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPortails.length === 0 ? (
                      <tr><td colSpan={6}><div className="empty-state"><Users /><p>Aucun accès portail créé.</p></div></td></tr>
                    ) : filteredPortails.map(row => (
                      <tr key={row.id} onClick={() => openEditPortail(row)}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{row.clients?.nom || '—'}</div>
                          {row.clients?.enseigne && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.clients.enseigne}</div>}
                        </td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.login}</span></td>
                        <td><span className={`badge ${row.peut_commander ? 'badge-green' : 'badge-gray'}`}>{row.peut_commander ? 'Oui' : 'Non'}</span></td>
                        <td>
                          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={e => { e.stopPropagation(); openAcces(row) }}>
                            <Key size={12} /> Gérer
                          </button>
                        </td>
                        <td><span className={`badge ${row.actif ? 'badge-green' : 'badge-gray'}`}>{row.actif ? 'Actif' : 'Inactif'}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => openEditPortail(row)}><Edit2 size={14} /></button>
                            <button className="btn-icon" onClick={() => deletePortail(row.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Admin */}
      {modal === 'admin' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur admin'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Nom *</label>
                  <input value={formAdmin.nom} onChange={e => setFormAdmin(f => ({ ...f, nom: e.target.value }))} placeholder="Prénom Nom" />
                </div>
                <div className="form-group form-full">
                  <label>Email *</label>
                  <input type="email" value={formAdmin.email} onChange={e => setFormAdmin(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group form-full">
                  <label>{editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={formAdmin.mot_de_passe || ''}
                      onChange={e => setFormAdmin(f => ({ ...f, mot_de_passe: e.target.value }))}
                      style={{ paddingRight: 40, width: '100%' }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group form-full">
                  <label>Rôle *</label>
                  <select value={formAdmin.role} onChange={e => setFormAdmin(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
                <div className="form-group form-full">
                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formAdmin.actif} onChange={e => setFormAdmin(f => ({ ...f, actif: e.target.checked }))} />
                    Compte actif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveAdmin} disabled={saving}>
                {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Portail Client */}
      {modal === 'portail' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Modifier l\'accès' : 'Nouvel accès portail client'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Client *</label>
                  <select value={formPortail.client_id} onChange={e => setFormPortail(f => ({ ...f, client_id: e.target.value }))}>
                    <option value="">Sélectionner un client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}{c.enseigne ? ` — ${c.enseigne}` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Login *</label>
                  <input
                    value={formPortail.login}
                    onChange={e => setFormPortail(f => ({ ...f, login: e.target.value.toUpperCase() }))}
                    placeholder="ex: CARREFOUR01"
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label>{editingId ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={formPortail.mot_de_passe || ''}
                      onChange={e => setFormPortail(f => ({ ...f, mot_de_passe: e.target.value }))}
                      style={{ paddingRight: 40, width: '100%' }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group form-full">
                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formPortail.peut_commander} onChange={e => setFormPortail(f => ({ ...f, peut_commander: e.target.checked }))} />
                    Ce client peut passer commande depuis le portail
                  </label>
                </div>
                <div className="form-group form-full">
                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, display: 'flex', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formPortail.actif} onChange={e => setFormPortail(f => ({ ...f, actif: e.target.checked }))} />
                    Accès actif
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={savePortail} disabled={saving}>
                {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fournisseurs Autorisés */}
      {accesModal && (
        <div className="modal-overlay" onClick={() => setAccesModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Fournisseurs autorisés — {accesModal.clients?.nom}</h3>
              <button className="btn-icon" onClick={() => setAccesModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Ce client verra uniquement les produits des fournisseurs cochés sur son portail.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fournisseurs.map(f => (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: accesClient.includes(f.id) ? 'var(--accent-light)' : 'var(--surface)' }}>
                    <input
                      type="checkbox"
                      checked={accesClient.includes(f.id)}
                      onChange={() => toggleFournisseur(f.id)}
                    />
                    <span style={{ fontWeight: 500 }}>{f.nom}</span>
                    {accesClient.includes(f.id) && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Autorisé</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAccesModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveAcces} disabled={savingAcces}>
                {savingAcces ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
