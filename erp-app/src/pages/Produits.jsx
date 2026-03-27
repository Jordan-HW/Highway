import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Package, Edit2, Trash2, Settings2, Download, Upload, CheckSquare, Square, Info, Languages, Save } from 'lucide-react'
import * as XLSX from 'xlsx'
import ImportProduits from './ImportProduits'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatStatut(s) {
  if (!s) return ''
  const map = {
    'actif': 'Actif',
    'inactif': 'Inactif',
    'en_référencement': 'En référencement',
    'arrêté': 'Arrêté',
  }
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── ReadRow ──────────────────────────────────────────────────────────────────
function ReadRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ width: 120, flexShrink: 0, color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font)', fontWeight: 450 }}>{value || '—'}</span>
    </div>
  )
}

// ─── DetailPanel (right panel on row click) ──────────────────────────────────
function DetailPanel({ product, marques, categories, onClose, onSaved, onDelete }) {
  const [panelTab, setPanelTab] = useState('general')
  const [editSection, setEditSection] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [tarifAchat, setTarifAchat] = useState({ prix_unitaire_ht: '', taux_tva: 5.5 })
  const [tarifVenteGeneral, setTarifVenteGeneral] = useState({ prix_unitaire_ht: '', remise_pourcent: '' })
  const [tarifsVenteClients, setTarifsVenteClients] = useState([])
  const [loadingTarifs, setLoadingTarifs] = useState(false)
  const [savingTarif, setSavingTarif] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({ ...product })
      setPanelTab('general')
      setEditSection(null)
    }
  }, [product?.id])

  useEffect(() => {
    if (product && panelTab === 'tarifs') fetchTarifs(product.id)
  }, [panelTab])

  async function fetchTarifs(produitId) {
    setLoadingTarifs(true)
    const [{ data: achats }, { data: ventes }] = await Promise.all([
      supabase.from('tarifs_achat').select('*').eq('produit_id', produitId).order('date_debut', { ascending: false }).limit(1),
      supabase.from('tarifs_vente').select('*, clients(nom)').eq('produit_id', produitId).order('date_debut', { ascending: false }),
    ])
    if (achats && achats.length > 0) {
      setTarifAchat({ prix_unitaire_ht: achats[0].prix_unitaire_ht ?? '', taux_tva: achats[0].taux_tva ?? 5.5 })
    } else {
      setTarifAchat({ prix_unitaire_ht: '', taux_tva: 5.5 })
    }
    const general = ventes?.find(v => !v.client_id)
    setTarifVenteGeneral(general ? { prix_unitaire_ht: general.prix_unitaire_ht ?? '', remise_pourcent: general.remise_pourcent ?? '' } : { prix_unitaire_ht: '', remise_pourcent: '' })
    setTarifsVenteClients(ventes?.filter(v => v.client_id) || [])
    setLoadingTarifs(false)
  }

  async function saveTarifAchat() {
    if (!product) return
    if (!tarifAchat.prix_unitaire_ht && tarifAchat.prix_unitaire_ht !== 0) return toast('Saisissez un prix HT', 'error')
    setSavingTarif(true)
    const payload = {
      produit_id: product.id,
      prix_unitaire_ht: parseFloat(tarifAchat.prix_unitaire_ht),
      taux_tva: parseFloat(tarifAchat.taux_tva),
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const { data: existing } = await supabase.from('tarifs_achat').select('id').eq('produit_id', product.id).order('date_debut', { ascending: false }).limit(1)
    let error
    if (existing && existing.length > 0) {
      const { error: e } = await supabase.from('tarifs_achat').update(payload).eq('id', existing[0].id)
      error = e
    } else {
      const { error: e } = await supabase.from('tarifs_achat').insert(payload)
      error = e
    }
    setSavingTarif(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Prix d\'achat enregistré', 'success')
  }

  async function saveTarifVenteGeneral() {
    if (!product) return
    if (!tarifVenteGeneral.prix_unitaire_ht && tarifVenteGeneral.prix_unitaire_ht !== 0) return toast('Saisissez un prix HT', 'error')
    setSavingTarif(true)
    const payload = {
      produit_id: product.id,
      client_id: null,
      prix_unitaire_ht: parseFloat(tarifVenteGeneral.prix_unitaire_ht),
      remise_pourcent: tarifVenteGeneral.remise_pourcent ? parseFloat(tarifVenteGeneral.remise_pourcent) : null,
      date_debut: new Date().toISOString().slice(0, 10),
    }
    const { data: existing } = await supabase.from('tarifs_vente').select('id').eq('produit_id', product.id).is('client_id', null).order('date_debut', { ascending: false }).limit(1)
    let error
    if (existing && existing.length > 0) {
      const { error: e } = await supabase.from('tarifs_vente').update(payload).eq('id', existing[0].id)
      error = e
    } else {
      const { error: e } = await supabase.from('tarifs_vente').insert(payload)
      error = e
    }
    setSavingTarif(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Tarif général enregistré', 'success')
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function saveSection() {
    if (!form.libelle?.trim()) return toast('Le libellé est obligatoire', 'error')
    if (!form.marque_id) return toast('La marque est obligatoire', 'error')
    setSaving(true)
    const { marques: _m, categories: _c, fournisseurs: _f, ...payload } = { ...form }
    ;['poids_brut_kg','poids_net_kg','volume_m3','longueur_cm','largeur_cm','hauteur_cm',
      'dlc_duree_jours','pcb','taux_tva','pvpr',
      'poids_colis_kg','longueur_colis_cm','largeur_colis_cm','hauteur_colis_cm',
      'poids_produit_brut_kg','poids_produit_net_kg'].forEach(f => {
      if (payload[f] === '') payload[f] = null
    })
    const { error } = await supabase.from('produits').update(payload).eq('id', product.id)
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Produit mis à jour', 'success')
    setEditSection(null)
    onSaved()
  }

  if (!product) return null

  const marqueName = product.marques?.nom || marques.find(m => m.id === form.marque_id)?.nom || ''
  const categorieName = product.categories?.nom || categories.find(c => c.id === form.categorie_id)?.nom || ''

  const PANEL_TABS = [
    ['general', 'Général'],
    ['colisage', 'Colisage'],
    ['conservation', 'Conservation'],
    ['ingredients', 'Ingrédients'],
    ['douane', 'Douane'],
    ['tarifs', 'Tarifs'],
  ]

  function SectionHeader({ section, title }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
        {editSection !== section ? (
          <button className="btn-icon" onClick={() => setEditSection(section)} title="Modifier"><Edit2 size={14} /></button>
        ) : (
          <button className="btn btn-primary" onClick={saveSection} disabled={saving} style={{ fontSize: 12, padding: '4px 14px', gap: 4 }}>
            <Save size={13} /> {saving ? '...' : 'Enregistrer'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 480, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.libelle}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{marqueName}{product.ean13 ? ` · ${product.ean13}` : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn-icon" onClick={() => { if (confirm('Supprimer ce produit ?')) { onDelete(product.id); onClose() } }} title="Supprimer"><Trash2 size={15} /></button>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Photo */}
        {product.photo_url && (
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxHeight: 200 }}>
              <img src={product.photo_url} alt={product.libelle} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        )}

        {/* Tabs bar */}
        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {PANEL_TABS.map(([key, label]) => (
              <button key={key} className={`tab ${panelTab === key ? 'active' : ''}`} onClick={() => setPanelTab(key)}>{label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* ── Général ── */}
          {panelTab === 'general' && (
            <>
              <SectionHeader section="general" title="Informations générales" />
              {editSection !== 'general' ? (
                <div>
                  <ReadRow label="Libellé" value={form.libelle} />
                  <ReadRow label="Libellé court" value={form.libelle_court} />
                  <ReadRow label="Marque" value={marqueName} />
                  <ReadRow label="Catégorie" value={categorieName} />
                  <ReadRow label="EAN13" value={form.ean13} mono />
                  <ReadRow label="Réf. interne" value={form.ref_marque} mono />
                  <ReadRow label="Statut" value={formatStatut(form.statut)} />
                  <ReadRow label="Description (VO)" value={form.description} />
                  <ReadRow label="Description (FR)" value={form.description_fr} />
                  <ReadRow label="Photo URL" value={form.photo_url} />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group form-full"><label>Libellé *</label><input value={form.libelle || ''} onChange={e => set('libelle', e.target.value)} /></div>
                  <div className="form-group"><label>Libellé court</label><input value={form.libelle_court || ''} onChange={e => set('libelle_court', e.target.value)} /></div>
                  <div className="form-group"><label>Marque *</label>
                    <select value={form.marque_id || ''} onChange={e => set('marque_id', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {marques.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Catégorie</label>
                    <select value={form.categorie_id || ''} onChange={e => set('categorie_id', e.target.value)}>
                      <option value="">Aucune</option>
                      {categories.filter(c => {
                        if (!form.marque_id) return true
                        const mq = marques.find(m => m.id === form.marque_id)
                        return mq?.nomenclature_specifique ? c.marque_id === form.marque_id : !c.marque_id
                      }).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>EAN13</label><input value={form.ean13 || ''} onChange={e => set('ean13', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  <div className="form-group"><label>Référence interne</label><input value={form.ref_marque || ''} onChange={e => set('ref_marque', e.target.value)} /></div>
                  <div className="form-group"><label>Statut</label>
                    <select value={form.statut || 'actif'} onChange={e => set('statut', e.target.value)}>
                      {['actif', 'inactif', 'en_référencement', 'arrêté'].map(s => <option key={s} value={s}>{formatStatut(s)}</option>)}
                    </select>
                  </div>
                  <div className="form-group form-full">
                    <label>Description (VO)</label>
                    <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} />
                  </div>
                  <div className="form-group form-full">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Description (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} onClick={() => toast('Traduction automatique bientôt disponible', 'info')}>
                        <Languages size={13} /> Traduire en français
                      </button>
                    </div>
                    <textarea value={form.description_fr || ''} onChange={e => set('description_fr', e.target.value)} rows={3} placeholder="Description traduite en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group form-full"><label>URL Photo</label><input value={form.photo_url || ''} onChange={e => set('photo_url', e.target.value)} placeholder="https://..." /></div>
                </div>
              )}
            </>
          )}

          {/* ── Colisage ── */}
          {panelTab === 'colisage' && (
            <>
              <SectionHeader section="colisage" title="Colisage" />
              {editSection !== 'colisage' ? (
                <div>
                  <ReadRow label="Conditionnement" value={form.pcb ? `${form.pcb}` : ''} />
                  <ReadRow label="Unité de vente" value={form.unite_vente} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Colis</div>
                  <ReadRow label="Poids colis (kg)" value={form.poids_colis_kg} />
                  <ReadRow label="Longueur (cm)" value={form.longueur_colis_cm} />
                  <ReadRow label="Largeur (cm)" value={form.largeur_colis_cm} />
                  <ReadRow label="Hauteur (cm)" value={form.hauteur_colis_cm} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Produit unitaire</div>
                  <ReadRow label="Poids brut (kg)" value={form.poids_produit_brut_kg} />
                  <ReadRow label="Poids net (kg)" value={form.poids_produit_net_kg} />
                </div>
              ) : (
                <>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Conditionnement</label><input type="number" value={form.pcb || ''} onChange={e => set('pcb', e.target.value)} placeholder="Nb unités/colis" /></div>
                    <div className="form-group"><label>Unité de vente</label><select value={form.unite_vente || 'unité'} onChange={e => set('unite_vente', e.target.value)}>{['unité','carton','palette','kg'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Colis</div>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Poids colis (kg)</label><input type="number" step="0.001" value={form.poids_colis_kg || ''} onChange={e => set('poids_colis_kg', e.target.value)} /></div>
                    <div className="form-group"><label>Longueur (cm)</label><input type="number" step="0.1" value={form.longueur_colis_cm || ''} onChange={e => set('longueur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Largeur (cm)</label><input type="number" step="0.1" value={form.largeur_colis_cm || ''} onChange={e => set('largeur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Hauteur (cm)</label><input type="number" step="0.1" value={form.hauteur_colis_cm || ''} onChange={e => set('hauteur_colis_cm', e.target.value)} /></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Produit unitaire</div>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Poids brut (kg)</label><input type="number" step="0.001" value={form.poids_produit_brut_kg || ''} onChange={e => set('poids_produit_brut_kg', e.target.value)} placeholder="Avec packaging" /></div>
                    <div className="form-group"><label>Poids net (kg)</label><input type="number" step="0.001" value={form.poids_produit_net_kg || ''} onChange={e => set('poids_produit_net_kg', e.target.value)} placeholder="Alimentaire" /></div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Conservation ── */}
          {panelTab === 'conservation' && (
            <>
              <SectionHeader section="conservation" title="Stockage & Conservation" />
              {editSection !== 'conservation' ? (
                <div>
                  <ReadRow label="Température" value={form.temperature_stockage} />
                  <ReadRow label="Type DLC" value={form.dlc_type} />
                  <ReadRow label="Durée DLC (j)" value={form.dlc_duree_jours} />
                </div>
              ) : (
                <div className="form-grid-3">
                  <div className="form-group"><label>Température</label><select value={form.temperature_stockage || 'ambiant'} onChange={e => set('temperature_stockage', e.target.value)}>{['ambiant', 'frais', 'surgelé'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <label style={{ margin: 0 }}>Type DLC</label>
                      <div style={{ position: 'relative', display: 'inline-block' }}
                        onMouseEnter={() => setTooltipVisible(true)}
                        onMouseLeave={() => setTooltipVisible(false)}>
                        <Info size={13} color="var(--text-muted)" style={{ cursor: 'help' }} />
                        {tooltipVisible && (
                          <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, width: 280, padding: '10px 12px', background: '#1a1a1a', color: '#fff', borderRadius: 8, fontSize: 11, lineHeight: 1.5, zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div style={{ marginBottom: 4 }}><strong>DLC</strong> = Date Limite de Consommation (à respecter impérativement)</div>
                            <div style={{ marginBottom: 4 }}><strong>DLUO</strong> = Date Limite d'Utilisation Optimale (peut être dépassée)</div>
                            <div><strong>DDM</strong> = Date de Durabilité Minimale (remplace DLUO)</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <select value={form.dlc_type || 'DLC'} onChange={e => set('dlc_type', e.target.value)} style={{ marginTop: 6 }}>{['DLC', 'DLUO', 'DDM'].map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div className="form-group"><label>Durée DLC (jours)</label><input type="number" value={form.dlc_duree_jours || ''} onChange={e => set('dlc_duree_jours', e.target.value)} /></div>
                </div>
              )}
            </>
          )}

          {/* ── Ingrédients ── */}
          {panelTab === 'ingredients' && (
            <>
              <SectionHeader section="ingredients" title="Ingrédients & Étiquetage" />
              {editSection !== 'ingredients' ? (
                <div>
                  <ReadRow label="Ingrédients (VO)" value={form.ingredients_vo} />
                  <ReadRow label="Langue VO" value={form.langue_vo} />
                  <ReadRow label="Ingrédients (FR)" value={form.ingredients_fr} />
                  <ReadRow label="Allergènes" value={form.allergenes} />
                  <ReadRow label="Fiche technique" value={form.fiche_technique_url ? 'Voir le document' : ''} />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group form-full"><label>Ingrédients (VO)</label><textarea value={form.ingredients_vo || ''} onChange={e => set('ingredients_vo', e.target.value)} rows={4} placeholder="Water, Sugar, Salt..." /></div>
                  <div className="form-group"><label>Langue originale</label><select value={form.langue_vo || 'en'} onChange={e => set('langue_vo', e.target.value)}>{[['en','Anglais'],['es','Espagnol'],['de','Allemand'],['it','Italien'],['zh','Chinois'],['ar','Arabe'],['other','Autre']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div className="form-group form-full"><label>Ingrédients (FR)</label><textarea value={form.ingredients_fr || ''} onChange={e => set('ingredients_fr', e.target.value)} rows={4} placeholder="Eau, Sucre, Sel..." /></div>
                  <div className="form-group form-full"><label>Allergènes</label><input value={form.allergenes || ''} onChange={e => set('allergenes', e.target.value)} placeholder="Gluten, Lait, Fruits à coque..." /></div>
                  <div className="form-group form-full"><label>URL Fiche technique</label><input value={form.fiche_technique_url || ''} onChange={e => set('fiche_technique_url', e.target.value)} placeholder="https://..." /></div>
                  {form.fiche_technique_url && <div className="form-full"><a href={form.fiche_technique_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>Voir le document</a></div>}
                </div>
              )}
            </>
          )}

          {/* ── Douane ── */}
          {panelTab === 'douane' && (
            <>
              <SectionHeader section="douane" title="Informations douanières" />
              {editSection !== 'douane' ? (
                <div>
                  <ReadRow label="Code douanier" value={form.code_douanier} mono />
                  <ReadRow label="Pays d'origine" value={form.pays_origine} />
                  <ReadRow label="Code Meursing" value={form.meursing_code} mono />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group"><label>Code douanier (SH)</label><input value={form.code_douanier || ''} onChange={e => set('code_douanier', e.target.value)} placeholder="ex: 1806310000" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  <div className="form-group"><label>Pays d'origine</label><input value={form.pays_origine || ''} onChange={e => set('pays_origine', e.target.value)} placeholder="GB, FR, DE..." /></div>
                  <div className="form-group"><label>Code Meursing</label><input value={form.meursing_code || ''} onChange={e => set('meursing_code', e.target.value)} placeholder="ex: 7126" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                </div>
              )}
            </>
          )}

          {/* ── Tarifs ── */}
          {panelTab === 'tarifs' && (
            loadingTarifs ? <div className="loading">Chargement des tarifs...</div> : (
              <>
                <p className="section-title">Prix d'achat fournisseur</p>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Prix HT (€)</label>
                    <input type="number" step="0.01" value={tarifAchat.prix_unitaire_ht} onChange={e => setTarifAchat(p => ({ ...p, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>TVA (%)</label>
                    <select value={tarifAchat.taux_tva} onChange={e => setTarifAchat(p => ({ ...p, taux_tva: parseFloat(e.target.value) }))}>
                      <option value="0">0%</option>
                      <option value="5.5">5.5%</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Prix TTC (€)</label>
                    <input type="text" disabled value={tarifAchat.prix_unitaire_ht ? (parseFloat(tarifAchat.prix_unitaire_ht) * (1 + tarifAchat.taux_tva / 100)).toFixed(2) : '—'} style={{ background: 'var(--surface-2)' }} />
                  </div>
                </div>
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                  <button className="btn btn-primary" onClick={saveTarifAchat} disabled={savingTarif} style={{ fontSize: 13 }}>
                    {savingTarif ? 'Enregistrement...' : 'Enregistrer prix d\'achat'}
                  </button>
                </div>

                <hr className="divider" />
                <p className="section-title">Tarif général de vente</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Prix vente HT (€)</label>
                    <input type="number" step="0.01" value={tarifVenteGeneral.prix_unitaire_ht} onChange={e => setTarifVenteGeneral(p => ({ ...p, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Remise (%)</label>
                    <input type="number" step="0.1" value={tarifVenteGeneral.remise_pourcent} onChange={e => setTarifVenteGeneral(p => ({ ...p, remise_pourcent: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                  <button className="btn btn-primary" onClick={saveTarifVenteGeneral} disabled={savingTarif} style={{ fontSize: 13 }}>
                    {savingTarif ? 'Enregistrement...' : 'Enregistrer tarif général'}
                  </button>
                </div>

                <hr className="divider" />
                <p className="section-title">Prix de vente public recommandé (PVPR)</p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>PVPR TTC (€)</label>
                    <input type="number" step="0.01" value={form.pvpr || ''} onChange={e => set('pvpr', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Marge Highway</label>
                    <input type="text" disabled value={
                      tarifAchat.prix_unitaire_ht && tarifVenteGeneral.prix_unitaire_ht
                        ? `${(((parseFloat(tarifVenteGeneral.prix_unitaire_ht) - parseFloat(tarifAchat.prix_unitaire_ht)) / parseFloat(tarifAchat.prix_unitaire_ht)) * 100).toFixed(1)}%`
                        : '—'
                    } style={{ background: 'var(--surface-2)' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
                  Le PVPR est enregistré avec la fiche produit (bouton "Enregistrer" dans l'onglet Général).
                </div>

                {tarifsVenteClients.length > 0 && (
                  <>
                    <hr className="divider" />
                    <p className="section-title">Tarifs spécifiques clients</p>
                    <div className="table-container" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      <table>
                        <thead><tr><th>Client</th><th>Prix HT</th><th>Remise %</th><th>Depuis</th></tr></thead>
                        <tbody>
                          {tarifsVenteClients.map(t => (
                            <tr key={t.id}>
                              <td>{t.clients?.nom || '—'}</td>
                              <td>{t.prix_unitaire_ht != null ? `${Number(t.prix_unitaire_ht).toFixed(2)} €` : '—'}</td>
                              <td>{t.remise_pourcent != null ? `${t.remise_pourcent}%` : '—'}</td>
                              <td>{t.date_debut || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <a href="/tarifs" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Gérer les tarifs clients →</a>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  )
}

// ─── PhotoPanel ────────────────────────────────────────────────────────────────
function PhotoPanel({ product, onClose }) {
  if (!product) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 380, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Photo produit</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {product.photo_url ? (
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
              <img src={product.photo_url} alt={product.libelle} style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          ) : (
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
              <Package size={40} /><span style={{ fontSize: 13 }}>Aucune photo disponible</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Produit</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{product.libelle}</div>
            </div>
            {product.marques?.nom && <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Marque</div><div style={{ fontSize: 13 }}>{product.marques.nom}</div></div>}
            {product.ean13 && <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>EAN13</div><div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{product.ean13}</div></div>}
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Fermer</button>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  )
}

// ─── Définition de toutes les colonnes ─────────────────────────────────────────
const ALL_COLUMNS = [
  { key: 'photo',               label: 'Photo',           group: 'Général',  default: true,  exportKey: null },
  { key: 'libelle',             label: 'Produit',         group: 'Général',  default: true,  exportKey: 'libelle' },
  { key: 'ean13',               label: 'EAN13',           group: 'Général',  default: true,  exportKey: 'ean13' },
  { key: 'marque_nom',          label: 'Marque',          group: 'Général',  default: true,  exportKey: r => r.marques?.nom || '' },
  { key: 'categorie_nom',       label: 'Catégorie',       group: 'Général',  default: true,  exportKey: r => r.categories?.nom || '' },
  { key: 'ref_marque',          label: 'Réf. interne',    group: 'Général',  default: false, exportKey: 'ref_marque' },
  { key: 'statut',              label: 'Statut',          group: 'Général',  default: true,  exportKey: 'statut' },
  { key: 'pcb',                 label: 'Cdt',             group: 'Colisage', default: true,  exportKey: 'pcb' },
  { key: 'poids_brut_kg',       label: 'Poids brut (kg)', group: 'Colisage', default: false, exportKey: 'poids_brut_kg' },
  { key: 'poids_net_kg',        label: 'Poids net (kg)',  group: 'Colisage', default: false, exportKey: 'poids_net_kg' },
  { key: 'volume_m3',           label: 'Volume (m³)',     group: 'Colisage', default: false, exportKey: 'volume_m3' },
  { key: 'longueur_cm',         label: 'L (cm)',          group: 'Colisage', default: false, exportKey: 'longueur_cm' },
  { key: 'largeur_cm',          label: 'l (cm)',          group: 'Colisage', default: false, exportKey: 'largeur_cm' },
  { key: 'hauteur_cm',          label: 'H (cm)',          group: 'Colisage', default: false, exportKey: 'hauteur_cm' },
  { key: 'temperature_stockage',label: 'Stockage',        group: 'DLC',      default: true,  exportKey: 'temperature_stockage' },
  { key: 'dlc',                 label: 'DLC',             group: 'DLC',      default: true,  exportKey: r => r.dlc_type && r.dlc_duree_jours ? `${r.dlc_type} ${r.dlc_duree_jours}j` : '' },
  { key: 'dlc_duree_jours',     label: 'Durée DLC (j)',   group: 'DLC',      default: false, exportKey: 'dlc_duree_jours' },
  { key: 'code_douanier',       label: 'Code douanier',   group: 'Douane',   default: false, exportKey: 'code_douanier' },
  { key: 'pays_origine',        label: 'Pays origine',    group: 'Douane',   default: false, exportKey: 'pays_origine' },
  { key: 'meursing_code',       label: 'Meursing',        group: 'Douane',   default: false, exportKey: 'meursing_code' },
]

// ─── Panneau colonnes ──────────────────────────────────────────────────────────
function ColumnPanel({ visibleCols, onChange, onClose }) {
  const groups = [...new Set(ALL_COLUMNS.map(c => c.group))]
  const toggle = key => {
    if (key === 'photo' || key === 'libelle') return
    onChange(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 300, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Colonnes affichées</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ALL_COLUMNS.filter(c => c.group === group).map(col => {
                  const active = visibleCols.includes(col.key)
                  const locked = col.key === 'photo' || col.key === 'libelle'
                  return (
                    <div key={col.key} onClick={() => !locked && toggle(col.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, cursor: locked ? 'default' : 'pointer', background: active ? '#e8f0eb' : 'transparent', opacity: locked ? 0.5 : 1, transition: 'background .15s' }}>
                      {active ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                      <span style={{ fontSize: 13 }}>{col.label}</span>
                      {locked && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>fixe</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onChange(ALL_COLUMNS.filter(c => c.default).map(c => c.key))}>Réinitialiser</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Appliquer</button>
        </div>
      </div>
    </>
  )
}

// ─── Modale Export Excel ───────────────────────────────────────────────────────
function ExportModal({ products, allProducts, onClose }) {
  const [scope, setScope] = useState(products.length > 0 ? 'selected' : 'filtered')
  const [exportCols, setExportCols] = useState(ALL_COLUMNS.filter(c => c.exportKey !== null && c.default).map(c => c.key))
  const groups = [...new Set(ALL_COLUMNS.filter(c => c.exportKey !== null).map(c => c.group))]

  const toggleCol = key => setExportCols(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  const toggleGroup = group => {
    const keys = ALL_COLUMNS.filter(c => c.group === group && c.exportKey !== null).map(c => c.key)
    const allActive = keys.every(k => exportCols.includes(k))
    setExportCols(p => allActive ? p.filter(k => !keys.includes(k)) : [...new Set([...p, ...keys])])
  }

  function doExport() {
    const source = scope === 'selected' && products.length > 0 ? products : allProducts
    const cols = ALL_COLUMNS.filter(c => exportCols.includes(c.key) && c.exportKey !== null)
    const data = source.map(row => {
      const obj = {}
      cols.forEach(col => {
        obj[col.label] = typeof col.exportKey === 'function' ? col.exportKey(row) : (row[col.exportKey] ?? '')
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = cols.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produits')
    XLSX.writeFile(wb, `Highway_Produits_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast('Export téléchargé !', 'success')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Exporter en Excel</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="section-title">Produits à exporter</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { v: 'filtered',  label: `Produits filtrés (${allProducts.length})` },
              { v: 'selected',  label: `Sélectionnés (${products.length})`, disabled: products.length === 0 },
            ].map(opt => (
              <div key={opt.v} onClick={() => !opt.disabled && setScope(opt.v)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `2px solid ${scope === opt.v ? 'var(--primary)' : 'var(--border)'}`, cursor: opt.disabled ? 'not-allowed' : 'pointer', opacity: opt.disabled ? 0.4 : 1, textAlign: 'center', fontSize: 13, fontWeight: scope === opt.v ? 600 : 400, color: scope === opt.v ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all .15s' }}>
                {opt.label}
              </div>
            ))}
          </div>
          <p className="section-title">Colonnes à inclure</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.map(group => {
              const cols = ALL_COLUMNS.filter(c => c.group === group && c.exportKey !== null)
              const allActive = cols.every(c => exportCols.includes(c.key))
              return (
                <div key={group}>
                  <div onClick={() => toggleGroup(group)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                    {allActive ? <CheckSquare size={15} color="var(--primary)" /> : <Square size={15} color="var(--text-muted)" />}
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{group}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 22 }}>
                    {cols.map(col => {
                      const active = exportCols.includes(col.key)
                      return (
                        <div key={col.key} onClick={() => toggleCol(col.key)}
                          style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                            userSelect: 'none', transition: 'all .15s', fontWeight: 500,
                            backgroundColor: active ? '#2D5A3D' : '#e8e8e8',
                            color: active ? '#ffffff' : '#222222',
                            border: active ? '1.5px solid #2D5A3D' : '1.5px solid #bbb',
                            outline: 'none',
                          }}>
                          {active ? '✓ ' : ''}{col.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={doExport} disabled={exportCols.length === 0}>
            <Download size={15} /> Télécharger Excel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const TEMP      = ['ambiant', 'frais', 'surgelé']
const STATUTS   = ['actif', 'inactif', 'en_référencement', 'arrêté']
const DLC_TYPES = ['DLC', 'DLUO', 'DDM']

const emptyForm = {
  ean13: '', libelle: '', libelle_court: '', description: '', description_fr: '',
  marque_id: '', categorie_id: '',
  unite_vente: 'unité', pcb: 1,
  poids_brut_kg: '', poids_net_kg: '', volume_m3: '',
  longueur_cm: '', largeur_cm: '', hauteur_cm: '',
  poids_colis_kg: '', longueur_colis_cm: '', largeur_colis_cm: '', hauteur_colis_cm: '',
  poids_produit_brut_kg: '', poids_produit_net_kg: '',
  temperature_stockage: 'ambiant',
  dlc_type: 'DLC', dlc_duree_jours: '',
  ref_marque: '', photo_url: '', fiche_technique_url: '',
  statut: 'actif', code_douanier: '', pays_origine: '', meursing_code: '',
  taux_tva: 5.5, pvpr: ''
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function Produits() {
  const [rows, setRows]               = useState([])
  const [marques, setMarques]         = useState([])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterMarque, setFilterMarque]         = useState('')
  const [filterCategorie, setFilterCategorie]   = useState('')
  const [filterStatut, setFilterStatut]         = useState('')
  const [modal, setModal]             = useState(false)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [activeTab, setActiveTab]     = useState('general')
  const [photoPanel, setPhotoPanel]   = useState(null)
  const [detailPanel, setDetailPanel] = useState(null)
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = localStorage.getItem('highway_cols')
      return stored ? JSON.parse(stored) : ALL_COLUMNS.filter(c => c.default).map(c => c.key)
    } catch { return ALL_COLUMNS.filter(c => c.default).map(c => c.key) }
  })

  function updateVisibleCols(val) {
    const next = typeof val === 'function' ? val(visibleCols) : val
    localStorage.setItem('highway_cols', JSON.stringify(next))
    setVisibleCols(next)
  }
  const [showColPanel, setShowColPanel] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExport, setShowExport]   = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [sortConfig, setSortConfig]   = useState({ key: null, dir: 'asc' })
  const [colFilters, setColFilters]   = useState({})
  const [tooltipDlc, setTooltipDlc]   = useState(false)

  function handleSort(key) {
    if (key === 'photo') return
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function getSortValue(row, key) {
    switch (key) {
      case 'libelle':          return (row.libelle || '').toLowerCase()
      case 'ean13':            return row.ean13 || ''
      case 'marque_nom':       return (row.marques?.nom || '').toLowerCase()
      case 'categorie_nom':    return (row.categories?.nom || '').toLowerCase()
      case 'ref_marque':       return (row.ref_marque || '').toLowerCase()
      case 'statut':           return row.statut || ''
      case 'pcb':              return row.pcb || 0
      case 'poids_brut_kg':   return row.poids_brut_kg || 0
      case 'poids_net_kg':    return row.poids_net_kg || 0
      case 'volume_m3':       return row.volume_m3 || 0
      case 'longueur_cm':     return row.longueur_cm || 0
      case 'largeur_cm':      return row.largeur_cm || 0
      case 'hauteur_cm':      return row.hauteur_cm || 0
      case 'temperature_stockage': return row.temperature_stockage || ''
      case 'dlc': case 'dlc_duree_jours': return row.dlc_duree_jours || 0
      case 'code_douanier':   return row.code_douanier || ''
      case 'pays_origine':    return row.pays_origine || ''
      case 'meursing_code':   return row.meursing_code || ''
      default: return ''
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: produits }, { data: mqs }, { data: cats }] = await Promise.all([
      supabase.from('produits').select('*, marques(nom), categories(nom)').order('libelle'),
      supabase.from('marques').select('id, nom, nomenclature_specifique').eq('actif', true).order('nom'),
      supabase.from('categories').select('id, nom, marque_id').order('nom'),
    ])
    setRows(produits || [])
    setMarques(mqs || [])
    setCategories(cats || [])
    setLoading(false)
  }

  function openCreate() { setForm(emptyForm); setActiveTab('general'); setModal(true) }
  function openDetail(row) { setDetailPanel(row); setModal(false) }
  function closeModal() { setModal(false); setForm(emptyForm) }
  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function save() {
    if (!form.libelle.trim()) return toast('Le libellé est obligatoire', 'error')
    if (!form.marque_id) return toast('La marque est obligatoire', 'error')
    setSaving(true)
    const { marques: _m, categories: _c, fournisseurs: _f, ...payload } = { ...form }
    ;['poids_brut_kg','poids_net_kg','volume_m3','longueur_cm','largeur_cm','hauteur_cm',
      'dlc_duree_jours','pcb','taux_tva','pvpr',
      'poids_colis_kg','longueur_colis_cm','largeur_colis_cm','hauteur_colis_cm',
      'poids_produit_brut_kg','poids_produit_net_kg'].forEach(f => {
      if (payload[f] === '') payload[f] = null
    })
    const { error } = await supabase.from('produits').insert(payload)
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Produit créé', 'success')
    closeModal(); fetchAll()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce produit ?')) return
    const { error } = await supabase.from('produits').delete().eq('id', id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Produit supprimé', 'success'); fetchAll()
  }

  function toggleSelect(id, e) {
    e.stopPropagation()
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === displayed.length ? new Set() : new Set(displayed.map(r => r.id)))
  }

  const filtered = rows.filter(r => {
    const s = search.toLowerCase()
    const matchSearch    = r.libelle.toLowerCase().includes(s) || (r.ean13||'').includes(s) || (r.marques?.nom||'').toLowerCase().includes(s)
    const matchMarque    = !filterMarque    || r.marque_id    === filterMarque
    const matchCategorie = !filterCategorie || r.categorie_id === filterCategorie
    const matchStatut    = !filterStatut    || r.statut       === filterStatut
    return matchSearch && matchMarque && matchCategorie && matchStatut
  })

  const sorted = sortConfig.key
    ? [...filtered].sort((a, b) => {
        const va = getSortValue(a, sortConfig.key)
        const vb = getSortValue(b, sortConfig.key)
        if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1
        if (va > vb) return sortConfig.dir === 'asc' ? 1 : -1
        return 0
      })
    : filtered

  // Filtre par colonne
  const displayed = Object.keys(colFilters).length === 0 ? sorted : sorted.filter(row => {
    return Object.entries(colFilters).every(([key, val]) => {
      if (!val) return true
      const v = val.toLowerCase()
      switch (key) {
        case 'libelle':          return (row.libelle || '').toLowerCase().includes(v)
        case 'ean13':            return (row.ean13 || '').includes(v)
        case 'marque_nom':       return (row.marques?.nom || '').toLowerCase().includes(v)
        case 'categorie_nom':    return (row.categories?.nom || '').toLowerCase().includes(v)
        case 'ref_marque':       return (row.ref_marque || '').toLowerCase().includes(v)
        case 'statut':           return (row.statut || '').toLowerCase().includes(v) || formatStatut(row.statut).toLowerCase().includes(v)
        case 'code_douanier':    return (row.code_douanier || '').toLowerCase().includes(v)
        case 'pays_origine':     return (row.pays_origine || '').toLowerCase().includes(v)
        case 'meursing_code':    return (row.meursing_code || '').toLowerCase().includes(v)
        default: return String(row[key] || '').toLowerCase().includes(v)
      }
    })
  })

  const selectedRows = displayed.filter(r => selectedIds.has(r.id))
  const activeCols   = ALL_COLUMNS.filter(c => visibleCols.includes(c.key))
  const allSelected  = displayed.length > 0 && selectedIds.size === displayed.length
  const tempBadge    = t => t === 'surgelé' || t === 'frais' ? 'badge-blue' : 'badge-gray'
  const statutBadge  = s => s === 'actif' ? 'badge-green' : s === 'inactif' ? 'badge-red' : 'badge-orange'

  function renderCell(col, row) {
    switch (col.key) {
      case 'photo':
        return row.photo_url
          ? <img src={row.photo_url} alt="" onClick={e => { e.stopPropagation(); setPhotoPanel(row) }} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
          : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="var(--text-muted)" /></div>
      case 'libelle':
        return <div><div style={{ fontWeight: 500 }}>{row.libelle}</div>{row.libelle_court && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.libelle_court}</div>}</div>
      case 'ean13':          return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.ean13 || '—'}</span>
      case 'marque_nom':     return row.marques?.nom || '—'
      case 'categorie_nom':  return row.categories?.nom ? <span className="badge badge-gray">{row.categories.nom}</span> : '—'
      case 'ref_marque':     return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.ref_marque || '—'}</span>
      case 'statut':         return <span className={`badge ${statutBadge(row.statut)}`}>{formatStatut(row.statut)}</span>
      case 'pcb':            return row.pcb || '—'
      case 'poids_brut_kg':  return row.poids_brut_kg  ? `${row.poids_brut_kg} kg`  : '—'
      case 'poids_net_kg':   return row.poids_net_kg   ? `${row.poids_net_kg} kg`   : '—'
      case 'volume_m3':      return row.volume_m3      ? `${row.volume_m3} m³`      : '—'
      case 'longueur_cm':    return row.longueur_cm    ? `${row.longueur_cm} cm`    : '—'
      case 'largeur_cm':     return row.largeur_cm     ? `${row.largeur_cm} cm`     : '—'
      case 'hauteur_cm':     return row.hauteur_cm     ? `${row.hauteur_cm} cm`     : '—'
      case 'temperature_stockage': return <span className={`badge ${tempBadge(row.temperature_stockage)}`}>{row.temperature_stockage}</span>
      case 'dlc':            return row.dlc_type && row.dlc_duree_jours ? `${row.dlc_type} ${row.dlc_duree_jours}j` : '—'
      case 'dlc_duree_jours':return row.dlc_duree_jours ? `${row.dlc_duree_jours} j` : '—'
      case 'code_douanier':  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.code_douanier || '—'}</span>
      case 'pays_origine':   return row.pays_origine   || '—'
      case 'meursing_code':  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.meursing_code || '—'}</span>
      default: return '—'
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Catalogue Produits</h2>
          <p>
            {filtered.length} produit{filtered.length > 1 ? 's' : ''}
            {selectedIds.size > 0 && <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>· {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Upload size={15} /> Importer</button>
          <button className="btn btn-secondary" onClick={() => setShowExport(true)}><Download size={15} /> Exporter</button>
          <button className="btn btn-secondary" onClick={() => setShowColPanel(true)}><Settings2 size={15} /> Colonnes</button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Nouveau produit</button>
        </div>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <div className="search-input" style={{ minWidth: 280 }}>
            <Search />
            <input placeholder="Libellé, EAN, marque..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterMarque} onChange={e => setFilterMarque(e.target.value)}>
            <option value="">Toutes les marques</option>
            {marques.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select className="filter-select" value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.filter(c => {
              if (!filterMarque) return true
              const mq = marques.find(m => m.id === filterMarque)
              return mq?.nomenclature_specifique ? c.marque_id === filterMarque : !c.marque_id
            }).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select className="filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{formatStatut(s)}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36, padding: '10px 8px' }}>
                      <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {allSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                      </div>
                    </th>
                    {activeCols.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{ cursor: col.key === 'photo' ? 'default' : 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {col.label}
                          {col.key !== 'photo' && (
                            <span style={{ fontSize: 10, color: sortConfig.key === col.key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                              {sortConfig.key === col.key ? (sortConfig.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                    <th></th>
                  </tr>
                  <tr>
                    <th style={{ padding: '4px 8px' }} />
                    {activeCols.map(col => (
                      <th key={col.key} style={{ padding: '4px 6px' }}>
                        {col.key !== 'photo' && col.key !== 'statut' && col.key !== 'temperature_stockage' ? (
                          <input
                            value={colFilters[col.key] || ''}
                            onChange={e => setColFilters(p => ({ ...p, [col.key]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            placeholder="Filtrer..."
                            style={{ width: '100%', padding: '3px 7px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 5, background: colFilters[col.key] ? '#fffbe6' : 'var(--surface-2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }}
                          />
                        ) : <div />}
                      </th>
                    ))}
                    <th style={{ padding: '4px 6px' }}>
                      {Object.values(colFilters).some(v => v) && (
                        <button onClick={() => setColFilters({})} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          ✕ Reset
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={activeCols.length + 2}><div className="empty-state"><Package /><p>Aucun produit. Créez votre premier produit !</p></div></td></tr>
                  ) : displayed.map(row => {
                    const isSel = selectedIds.has(row.id)
                    return (
                      <tr key={row.id} onClick={() => openDetail(row)} style={{ background: isSel ? '#e8f0eb' : undefined }}>
                        <td style={{ padding: '10px 8px' }} onClick={e => toggleSelect(row.id, e)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {isSel ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                          </div>
                        </td>
                        {activeCols.map(col => <td key={col.key}>{renderCell(col, row)}</td>)}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => openDetail(row)}><Edit2 size={14} /></button>
                            <button className="btn-icon" onClick={() => remove(row.id)}><Trash2 size={14} /></button>
                          </div>
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

      {/* Modal création produit uniquement */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nouveau produit</h3>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '0 24px' }}>
              <div className="tabs">
                {[['general','Général'],['colisage','Colisage'],['conservation','Conservation'],['ingredients','Ingrédients'],['import','Douane']].map(([key, label]) => (
                  <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="modal-body" style={{ paddingTop: 0 }}>
              {activeTab === 'general' && (
                <div className="form-grid">
                  <div className="form-group form-full"><label>Libellé *</label><input value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Nom complet du produit" /></div>
                  <div className="form-group"><label>Libellé court</label><input value={form.libelle_court || ''} onChange={e => set('libelle_court', e.target.value)} /></div>
                  <div className="form-group"><label>Marque *</label>
                    <select value={form.marque_id} onChange={e => set('marque_id', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {marques.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Catégorie</label>
                    <select value={form.categorie_id || ''} onChange={e => set('categorie_id', e.target.value)}>
                      <option value="">Aucune</option>
                      {categories.filter(c => {
                        if (!form.marque_id) return true
                        const mq = marques.find(m => m.id === form.marque_id)
                        return mq?.nomenclature_specifique ? c.marque_id === form.marque_id : !c.marque_id
                      }).map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>EAN13</label><input value={form.ean13 || ''} onChange={e => set('ean13', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  <div className="form-group"><label>Référence interne</label><input value={form.ref_marque || ''} onChange={e => set('ref_marque', e.target.value)} /></div>
                  <div className="form-group"><label>Statut</label>
                    <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                      {STATUTS.map(s => <option key={s} value={s}>{formatStatut(s)}</option>)}
                    </select>
                  </div>
                  <div className="form-group form-full">
                    <label>Description (VO)</label>
                    <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} />
                  </div>
                  <div className="form-group form-full">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Description (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} onClick={() => toast('Traduction automatique bientôt disponible', 'info')}>
                        <Languages size={13} /> Traduire en français
                      </button>
                    </div>
                    <textarea value={form.description_fr || ''} onChange={e => set('description_fr', e.target.value)} rows={3} placeholder="Description traduite en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group form-full"><label>URL Photo</label><input value={form.photo_url || ''} onChange={e => set('photo_url', e.target.value)} placeholder="https://..." /></div>
                  {form.photo_url && (
                    <div className="form-full" style={{ marginTop: 4 }}>
                      <img src={form.photo_url} alt="" onClick={() => setPhotoPanel(form)} style={{ height: 80, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: 4, cursor: 'zoom-in' }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Cliquez pour agrandir</div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'colisage' && (
                <>
                  <p className="section-title">Colisage</p>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Conditionnement</label><input type="number" value={form.pcb || ''} onChange={e => set('pcb', e.target.value)} placeholder="Nb unités/colis" /></div>
                    <div className="form-group"><label>Unité de vente</label><select value={form.unite_vente} onChange={e => set('unite_vente', e.target.value)}>{['unité','carton','palette','kg'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Colis</div>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Poids colis (kg)</label><input type="number" step="0.001" value={form.poids_colis_kg || ''} onChange={e => set('poids_colis_kg', e.target.value)} /></div>
                    <div className="form-group"><label>Longueur (cm)</label><input type="number" step="0.1" value={form.longueur_colis_cm || ''} onChange={e => set('longueur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Largeur (cm)</label><input type="number" step="0.1" value={form.largeur_colis_cm || ''} onChange={e => set('largeur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Hauteur (cm)</label><input type="number" step="0.1" value={form.hauteur_colis_cm || ''} onChange={e => set('hauteur_colis_cm', e.target.value)} /></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Produit unitaire</div>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Poids brut (kg)</label><input type="number" step="0.001" value={form.poids_produit_brut_kg || ''} onChange={e => set('poids_produit_brut_kg', e.target.value)} placeholder="Avec packaging" /></div>
                    <div className="form-group"><label>Poids net (kg)</label><input type="number" step="0.001" value={form.poids_produit_net_kg || ''} onChange={e => set('poids_produit_net_kg', e.target.value)} placeholder="Alimentaire" /></div>
                  </div>
                </>
              )}
              {activeTab === 'conservation' && (
                <>
                  <p className="section-title">Stockage & Conservation</p>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Température</label><select value={form.temperature_stockage} onChange={e => set('temperature_stockage', e.target.value)}>{TEMP.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <label style={{ margin: 0 }}>Type DLC</label>
                        <div style={{ position: 'relative', display: 'inline-block' }}
                          onMouseEnter={() => setTooltipDlc(true)}
                          onMouseLeave={() => setTooltipDlc(false)}>
                          <Info size={13} color="var(--text-muted)" style={{ cursor: 'help' }} />
                          {tooltipDlc && (
                            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, width: 280, padding: '10px 12px', background: '#1a1a1a', color: '#fff', borderRadius: 8, fontSize: 11, lineHeight: 1.5, zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                              <div style={{ marginBottom: 4 }}><strong>DLC</strong> = Date Limite de Consommation (à respecter impérativement)</div>
                              <div style={{ marginBottom: 4 }}><strong>DLUO</strong> = Date Limite d'Utilisation Optimale (peut être dépassée)</div>
                              <div><strong>DDM</strong> = Date de Durabilité Minimale (remplace DLUO)</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <select value={form.dlc_type} onChange={e => set('dlc_type', e.target.value)} style={{ marginTop: 6 }}>{DLC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div className="form-group"><label>Durée DLC (jours)</label><input type="number" value={form.dlc_duree_jours || ''} onChange={e => set('dlc_duree_jours', e.target.value)} /></div>
                  </div>
                </>
              )}
              {activeTab === 'ingredients' && (
                <>
                  <p className="section-title">Ingrédients & Étiquetage</p>
                  <div className="form-grid">
                    <div className="form-group form-full"><label>Ingrédients (VO)</label><textarea value={form.ingredients_vo || ''} onChange={e => set('ingredients_vo', e.target.value)} rows={4} placeholder="Water, Sugar, Salt..." /></div>
                    <div className="form-group"><label>Langue originale</label><select value={form.langue_vo || 'en'} onChange={e => set('langue_vo', e.target.value)}>{[['en','Anglais'],['es','Espagnol'],['de','Allemand'],['it','Italien'],['zh','Chinois'],['ar','Arabe'],['other','Autre']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div className="form-group form-full"><label>Ingrédients (FR)</label><textarea value={form.ingredients_fr || ''} onChange={e => set('ingredients_fr', e.target.value)} rows={4} placeholder="Eau, Sucre, Sel..." /></div>
                    <div className="form-group form-full"><label>Allergènes</label><input value={form.allergenes || ''} onChange={e => set('allergenes', e.target.value)} placeholder="Gluten, Lait, Fruits à coque..." /></div>
                    <div className="form-group form-full"><label>URL Fiche technique</label><input value={form.fiche_technique_url || ''} onChange={e => set('fiche_technique_url', e.target.value)} placeholder="https://..." /></div>
                    {form.fiche_technique_url && <div className="form-full"><a href={form.fiche_technique_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>Voir le document</a></div>}
                  </div>
                </>
              )}
              {activeTab === 'import' && (
                <>
                  <p className="section-title">Informations douanières</p>
                  <div className="form-grid">
                    <div className="form-group"><label>Code douanier (SH)</label><input value={form.code_douanier || ''} onChange={e => set('code_douanier', e.target.value)} placeholder="ex: 1806310000" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                    <div className="form-group"><label>Pays d'origine</label><input value={form.pays_origine || ''} onChange={e => set('pays_origine', e.target.value)} placeholder="GB, FR, DE..." /></div>
                    <div className="form-group"><label>Code Meursing</label><input value={form.meursing_code || ''} onChange={e => set('meursing_code', e.target.value)} placeholder="ex: 7126" style={{ fontFamily: 'var(--font-mono)' }} /></div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Créer le produit'}</button>
            </div>
          </div>
        </div>
      )}

      {showImport   && <ImportProduits onClose={() => setShowImport(false)} onImported={fetchAll} />}
      {showColPanel && <ColumnPanel visibleCols={visibleCols} onChange={updateVisibleCols} onClose={() => setShowColPanel(false)} />}
      {showExport   && <ExportModal products={selectedRows} allProducts={filtered} onClose={() => setShowExport(false)} />}
      {photoPanel   && <PhotoPanel  product={photoPanel} onClose={() => setPhotoPanel(null)} />}
      {detailPanel  && <DetailPanel product={detailPanel} marques={marques} categories={categories} onClose={() => setDetailPanel(null)} onSaved={() => { fetchAll(); setDetailPanel(null) }} onDelete={(id) => { remove(id); setDetailPanel(null) }} />}
    </div>
  )
}
