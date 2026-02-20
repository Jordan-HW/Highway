import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Package, Edit2, Trash2, ChevronDown } from 'lucide-react'

const TEMP = ['ambiant', 'frais', 'surgelé']
const STATUTS = ['actif', 'inactif', 'en_référencement', 'arrêté']
const DLC_TYPES = ['DLC', 'DLUO', 'DDM']

const emptyForm = {
  ean13: '', libelle: '', libelle_court: '', marque: '', description: '',
  fournisseur_id: '', categorie_id: '',
  conditionnement: '', unite_vente: 'carton', pcb: 1,
  poids_brut_kg: '', poids_net_kg: '', volume_m3: '',
  longueur_cm: '', largeur_cm: '', hauteur_cm: '',
  temperature_stockage: 'ambiant', temperature_min_c: '', temperature_max_c: '',
  dlc_type: 'DLC', dlc_duree_jours: '',
  ref_fournisseur: '', photo_url: '', fiche_technique_url: '',
  statut: 'actif', code_douanier: '', pays_origine: ''
}

export default function Produits() {
  const [rows, setRows] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterFournisseur, setFilterFournisseur] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [modal, setModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: produits }, { data: fours }] = await Promise.all([
      supabase.from('produits').select('*, fournisseurs(nom)').order('libelle'),
      supabase.from('fournisseurs').select('id, nom').eq('actif', true).order('nom')
    ])
    setRows(produits || [])
    setFournisseurs(fours || [])
    setLoading(false)
  }

  function openCreate() {
    setForm(emptyForm)
    setEditing(null)
    setActiveTab('general')
    setModal(true)
  }

  function openEdit(row) {
    setForm({ ...emptyForm, ...row, fournisseur_id: row.fournisseur_id || '' })
    setEditing(row.id)
    setActiveTab('general')
    setModal(true)
  }

  function close() { setModal(false); setForm(emptyForm); setEditing(null) }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function save() {
    if (!form.libelle.trim()) return toast('Le libellé est obligatoire', 'error')
    if (!form.fournisseur_id) return toast('Le fournisseur est obligatoire', 'error')
    setSaving(true)
    const { fournisseurs: _f, ...payload } = { ...form }
    // Clean empty strings to null for numeric fields
    ;['poids_brut_kg','poids_net_kg','volume_m3','longueur_cm','largeur_cm','hauteur_cm',
      'temperature_min_c','temperature_max_c','dlc_duree_jours','pcb'].forEach(f => {
      if (payload[f] === '') payload[f] = null
    })
    let error
    if (editing) {
      const { error: e } = await supabase.from('produits').update(payload).eq('id', editing)
      error = e
    } else {
      const { error: e } = await supabase.from('produits').insert(payload)
      error = e
    }
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast(editing ? 'Produit mis à jour' : 'Produit créé', 'success')
    close(); fetchAll()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce produit ?')) return
    const { error } = await supabase.from('produits').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Produit supprimé', 'success')
    fetchAll()
  }

  const filtered = rows.filter(r => {
    const matchSearch = r.libelle.toLowerCase().includes(search.toLowerCase()) ||
      (r.ean13 || '').includes(search) ||
      (r.marque || '').toLowerCase().includes(search.toLowerCase())
    const matchFour = !filterFournisseur || r.fournisseur_id === filterFournisseur
    const matchStatut = !filterStatut || r.statut === filterStatut
    return matchSearch && matchFour && matchStatut
  })

  const tempBadge = t => t === 'surgelé' ? 'badge-blue' : t === 'frais' ? 'badge-blue' : 'badge-gray'
  const statutBadge = s => s === 'actif' ? 'badge-green' : s === 'inactif' ? 'badge-red' : 'badge-orange'

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Catalogue Produits</h2>
          <p>{filtered.length} produit{filtered.length > 1 ? 's' : ''} {filterFournisseur ? `— ${fournisseurs.find(f=>f.id===filterFournisseur)?.nom}` : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nouveau produit
        </button>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div className="search-input" style={{ minWidth: 280 }}>
            <Search />
            <input placeholder="Libellé, EAN, marque..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterFournisseur} onChange={e => setFilterFournisseur(e.target.value)}>
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select className="filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>EAN</th>
                    <th>Fournisseur</th>
                    <th>Conditionnement</th>
                    <th>Stockage</th>
                    <th>DLC</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8}>
                      <div className="empty-state">
                        <Package />
                        <p>Aucun produit. Créez votre premier produit !</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(row => (
                    <tr key={row.id} onClick={() => openEdit(row)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {row.photo_url ? (
                            <img src={row.photo_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={16} color="var(--text-muted)" />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500 }}>{row.libelle}</div>
                            {row.marque && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.marque}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.ean13 || '—'}</span></td>
                      <td>{row.fournisseurs?.nom || '—'}</td>
                      <td>{row.conditionnement || '—'} {row.pcb > 1 ? `(${row.pcb} pcs)` : ''}</td>
                      <td><span className={`badge ${tempBadge(row.temperature_stockage)}`}>{row.temperature_stockage}</span></td>
                      <td>{row.dlc_type && row.dlc_duree_jours ? `${row.dlc_type} ${row.dlc_duree_jours}j` : '—'}</td>
                      <td><span className={`badge ${statutBadge(row.statut)}`}>{row.statut}</span></td>
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
          <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>

            <div style={{ padding: '0 24px' }}>
              <div className="tabs">
                {[
                  ['general', 'Général'],
                  ['colisage', 'Colisage & Stockage'],
                  ['ingredients', 'Ingrédients'],
                  ['import', 'Import / Douane'],
                ].map(([key, label]) => (
                  <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
                ))}
              </div>
            </div>

            <div className="modal-body" style={{ paddingTop: 0 }}>

              {activeTab === 'general' && (
                <>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Libellé *</label>
                      <input value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Nom complet du produit" />
                    </div>
                    <div className="form-group">
                      <label>Libellé court</label>
                      <input value={form.libelle_court || ''} onChange={e => set('libelle_court', e.target.value)} placeholder="Nom abrégé" />
                    </div>
                    <div className="form-group">
                      <label>Marque</label>
                      <input value={form.marque || ''} onChange={e => set('marque', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Fournisseur *</label>
                      <select value={form.fournisseur_id} onChange={e => set('fournisseur_id', e.target.value)}>
                        <option value="">Sélectionner...</option>
                        {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>EAN13</label>
                      <input value={form.ean13 || ''} onChange={e => set('ean13', e.target.value)} placeholder="Code-barres 13 chiffres" style={{ fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div className="form-group">
                      <label>Référence fournisseur</label>
                      <input value={form.ref_fournisseur || ''} onChange={e => set('ref_fournisseur', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Statut</label>
                      <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                        {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group form-full">
                      <label>Description</label>
                      <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="Description commerciale du produit..." />
                    </div>
                    <div className="form-group form-full">
                      <label>URL Photo</label>
                      <input value={form.photo_url || ''} onChange={e => set('photo_url', e.target.value)} placeholder="https://..." />
                    </div>
                    {form.photo_url && (
                      <div className="form-full" style={{ marginTop: 4 }}>
                        <img src={form.photo_url} alt="" style={{ height: 80, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: 4 }} />
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'colisage' && (
                <>
                  <p className="section-title">Colisage</p>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Conditionnement</label>
                      <input value={form.conditionnement || ''} onChange={e => set('conditionnement', e.target.value)} placeholder="6x1L, 12x500g..." />
                    </div>
                    <div className="form-group">
                      <label>Unité de vente</label>
                      <select value={form.unite_vente} onChange={e => set('unite_vente', e.target.value)}>
                        <option value="carton">Carton</option>
                        <option value="palette">Palette</option>
                        <option value="unité">Unité</option>
                        <option value="kg">Kg</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>PCB (pièces/carton)</label>
                      <input type="number" value={form.pcb} onChange={e => set('pcb', +e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Poids brut (kg)</label>
                      <input type="number" step="0.001" value={form.poids_brut_kg || ''} onChange={e => set('poids_brut_kg', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Poids net (kg)</label>
                      <input type="number" step="0.001" value={form.poids_net_kg || ''} onChange={e => set('poids_net_kg', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Volume (m³)</label>
                      <input type="number" step="0.0001" value={form.volume_m3 || ''} onChange={e => set('volume_m3', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Longueur (cm)</label>
                      <input type="number" step="0.1" value={form.longueur_cm || ''} onChange={e => set('longueur_cm', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Largeur (cm)</label>
                      <input type="number" step="0.1" value={form.largeur_cm || ''} onChange={e => set('largeur_cm', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Hauteur (cm)</label>
                      <input type="number" step="0.1" value={form.hauteur_cm || ''} onChange={e => set('hauteur_cm', e.target.value)} />
                    </div>
                  </div>

                  <hr className="divider" />
                  <p className="section-title">Stockage & Conservation</p>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label>Température stockage</label>
                      <select value={form.temperature_stockage} onChange={e => set('temperature_stockage', e.target.value)}>
                        {TEMP.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Temp. min (°C)</label>
                      <input type="number" step="0.5" value={form.temperature_min_c || ''} onChange={e => set('temperature_min_c', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Temp. max (°C)</label>
                      <input type="number" step="0.5" value={form.temperature_max_c || ''} onChange={e => set('temperature_max_c', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Type DLC</label>
                      <select value={form.dlc_type} onChange={e => set('dlc_type', e.target.value)}>
                        {DLC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Durée DLC (jours)</label>
                      <input type="number" value={form.dlc_duree_jours || ''} onChange={e => set('dlc_duree_jours', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'ingredients' && (
                <>
                  <p className="section-title">Ingrédients & Étiquetage</p>
                  <div className="form-grid">
                    <div className="form-group form-full">
                      <label>Ingrédients (langue originale)</label>
                      <textarea
                        value={form.ingredients_vo || ''}
                        onChange={e => set('ingredients_vo', e.target.value)}
                        rows={4}
                        placeholder="Water, Sugar, Salt..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Langue originale</label>
                      <select value={form.langue_vo || 'en'} onChange={e => set('langue_vo', e.target.value)}>
                        <option value="en">Anglais</option>
                        <option value="es">Espagnol</option>
                        <option value="de">Allemand</option>
                        <option value="it">Italien</option>
                        <option value="zh">Chinois</option>
                        <option value="ar">Arabe</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div className="form-group form-full">
                      <label>Ingrédients (traduction française)</label>
                      <textarea
                        value={form.ingredients_fr || ''}
                        onChange={e => set('ingredients_fr', e.target.value)}
                        rows={4}
                        placeholder="Eau, Sucre, Sel..."
                      />
                    </div>
                    <div className="form-group form-full">
                      <label>Allergènes</label>
                      <input
                        value={form.allergenes || ''}
                        onChange={e => set('allergenes', e.target.value)}
                        placeholder="Gluten, Lait, Fruits à coque..."
                      />
                    </div>
                    <div className="form-group form-full">
                      <label>URL Étiquette / Fiche technique</label>
                      <input
                        value={form.fiche_technique_url || ''}
                        onChange={e => set('fiche_technique_url', e.target.value)}
                        placeholder="https://... (PDF ou image)"
                      />
                    </div>
                    {form.fiche_technique_url && (
                      <div className="form-full">
                        <a href={form.fiche_technique_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
                          Voir le document
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'import' && (
                <>
                  <p className="section-title">Informations douanières</p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Code douanier (SH)</label>
                      <input value={form.code_douanier || ''} onChange={e => set('code_douanier', e.target.value)} placeholder="ex: 2106.90" style={{ fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div className="form-group">
                      <label>Pays d'origine</label>
                      <input value={form.pays_origine || ''} onChange={e => set('pays_origine', e.target.value)} placeholder="Maroc, Espagne..." />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer le produit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
