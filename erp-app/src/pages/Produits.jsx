import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Package, Edit2, Trash2, Settings2, Download, Upload, CheckSquare, Square, Info, Languages, Save, GripVertical, Power, Eye, EyeOff, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import ImportProduits from './ImportProduits'
import LangToggle from '../components/LangToggle'
import { displayLibelle, displayLibelleCourt, displayCategorieNom, displayCategoriePath, categorieSortKey, formatEan, loadLang, saveLang, translateToFr, buildCategoryTree } from '../lib/i18n'
import FamillePath from '../components/FamillePath'
import LogoUploader from '../components/LogoUploader'
import PdfThumb from '../components/PdfThumb'

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
function DetailPanel({ product, marques, categories, lang, langFamille, onClose, onSaved, onDelete }) {
  const [panelTab, setPanelTab] = useState('general')
  const [editSection, setEditSection] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [tarifAchat, setTarifAchat] = useState(null)
  const [tarifVenteGeneral, setTarifVenteGeneral] = useState(null)
  const [loadingTarifs, setLoadingTarifs] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const prevIdRef = useRef(null)
  useEffect(() => {
    if (product) {
      setForm({ ...product })
      if (prevIdRef.current !== product.id) {
        setPanelTab('general')
        setEditSection(null)
      }
      prevIdRef.current = product.id
    }
  }, [product])

  useEffect(() => {
    if (product && panelTab === 'tarifs') fetchTarifs(product.id)
  }, [panelTab])

  async function fetchTarifs(produitId) {
    setLoadingTarifs(true)
    const [{ data: achats }, { data: ventes }] = await Promise.all([
      supabase.from('tarifs_achat').select('*').eq('produit_id', produitId).order('date_debut', { ascending: false }).limit(1),
      supabase.from('tarifs_vente').select('*').eq('produit_id', produitId).is('client_id', null).order('date_debut', { ascending: false }).limit(1),
    ])
    setTarifAchat(achats?.[0] || null)
    setTarifVenteGeneral(ventes?.[0] || null)
    setLoadingTarifs(false)
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
    ;['taux_tva','pvpr'].forEach(f => {
      if (payload[f] != null && payload[f] !== '') payload[f] = Math.round(parseFloat(payload[f]) * 100) / 100
    })
    const { error } = await supabase.from('produits').update(payload).eq('id', product.id)
    setSaving(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    toast('Produit mis à jour', 'success')
    setEditSection(null)
    onSaved(panelTab)
  }

  const [photoZoom, setPhotoZoom] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [togglingStatut, setTogglingStatut] = useState(false)

  async function toggleStatut() {
    const isActive = form.statut === 'actif'
    const next = isActive ? 'inactif' : 'actif'
    if (isActive && !confirm('Désactiver ce produit ? Il restera dans la base mais ne sera plus référenceable.')) return
    setTogglingStatut(true)
    const { error } = await supabase.from('produits').update({ statut: next }).eq('id', product.id)
    setTogglingStatut(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    set('statut', next)
    toast(isActive ? 'Produit désactivé' : 'Produit réactivé', 'success')
    onSaved(panelTab)
  }

  async function translateText(sourceField, targetField) {
    const text = form[sourceField]
    if (!text?.trim()) return toast('Rien à traduire', 'error')
    setTranslating(true)
    const translated = await translateToFr(text)
    setTranslating(false)
    if (translated) { set(targetField, translated); toast('Traduction effectuée', 'success') }
    else toast('Erreur de traduction', 'error')
  }

  if (!product) return null

  const marqueName = product.marques?.nom || marques.find(m => m.id === form.marque_id)?.nom || ''
  const catFromList = categories.find(c => c.id === form.categorie_id)
  const categorieName = displayCategoriePath(catFromList, categories, langFamille)

  const PANEL_TABS = [
    ['general', 'Général'],
    ['colisage', 'Colisage'],
    ['conservation', 'Conservation'],
    ['ingredients', 'Ingrédients'],
    ['etiquette', 'Packaging'],
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
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 620, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLibelle(product, lang)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{marqueName}{product.ean13 ? ` · ${formatEan(product.ean13)}` : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn-icon"
              onClick={toggleStatut}
              disabled={togglingStatut}
              title={form.statut === 'actif' ? 'Désactiver ce produit' : 'Réactiver ce produit'}
              style={{ color: form.statut === 'actif' ? 'var(--success)' : 'var(--danger)' }}
            >
              <Power size={15} />
            </button>
            <button className="btn-icon" onClick={() => { if (confirm('Supprimer ce produit ?')) { onDelete(product.id); onClose() } }} title="Supprimer"><Trash2 size={15} /></button>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Photo produit en haut — packaging/étiquette FR sont dans l'onglet Packaging */}
        {product.photo_url && (
          <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'center' }}>
            <div onClick={() => setPhotoZoom('photo')} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, cursor: 'zoom-in', maxWidth: 240 }}>
              <img src={product.photo_url} alt={product.libelle} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, display: 'block' }} />
            </div>
          </div>
        )}
        {photoZoom && (() => {
          // Pour zoom : on préfère le preview PNG (rendu fiable, pas de download forcé)
          // et on garde l'URL du PDF d'origine pour le bouton "ouvrir"
          const pdfUrl = photoZoom === 'packaging' ? product.etiquette_originale_url
                       : photoZoom === 'etiquette_fr' ? product.etiquette_fr_url
                       : null
          const previewUrl = photoZoom === 'packaging' ? product.etiquette_originale_preview_url
                           : photoZoom === 'etiquette_fr' ? product.etiquette_fr_preview_url
                           : null
          const displayUrl = previewUrl || pdfUrl || product.photo_url
          return (
            <div onClick={() => setPhotoZoom(false)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
              <img onClick={e => e.stopPropagation()} src={displayUrl} alt={product.libelle} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, background: '#fff' }} />
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 24, right: 24, padding: '8px 16px', background: 'rgba(255,255,255,0.95)', color: '#222', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  Ouvrir le PDF
                </a>
              )}
            </div>
          )
        })()}

        {/* Tabs bar */}
        <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          {PANEL_TABS.map(([key, label]) => (
            <button key={key} onClick={() => setPanelTab(key)} style={{
              padding: '9px 14px', fontSize: 12, fontWeight: panelTab === key ? 600 : 400,
              color: panelTab === key ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'none', border: 'none', fontFamily: 'var(--font)',
              borderBottom: panelTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* ── Général ── */}
          {panelTab === 'general' && (
            <>
              <SectionHeader section="general" title="Informations générales" />
              {editSection !== 'general' ? (
                <div>
                  <ReadRow label="Libellé (VO)" value={form.libelle} />
                  <ReadRow label="Libellé (FR)" value={form.libelle_fr} />
                  <ReadRow label="Libellé court (VO)" value={form.libelle_court} />
                  <ReadRow label="Libellé court (FR)" value={form.libelle_court_fr} />
                  <ReadRow label="Marque" value={marqueName} />
                  <ReadRow label="Famille" value={form.categorie_id ? <FamillePath categorieId={form.categorie_id} categories={categories} lang={langFamille} /> : null} />
                  <ReadRow label="EAN13" value={formatEan(form.ean13)} mono />
                  <ReadRow label="Réf. interne" value={form.ref_marque} mono />
                  <ReadRow label="Statut" value={formatStatut(form.statut)} />
                  <ReadRow label="Description (VO)" value={form.description} />
                  <ReadRow label="Description (FR)" value={form.description_fr} />
                  <ReadRow label="Photo" value={form.photo_url ? <img src={form.photo_url} alt="" style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} /> : null} />
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group form-full"><label>Libellé * (VO)</label><input value={form.libelle || ''} onChange={e => set('libelle', e.target.value)} /></div>
                  <div className="form-group form-full">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Libellé (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translating} onClick={() => translateText('libelle', 'libelle_fr')}>
                        <Languages size={13} /> {translating ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <input value={form.libelle_fr || ''} onChange={e => set('libelle_fr', e.target.value)} placeholder="Libellé traduit en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group"><label>Libellé court (VO)</label><input value={form.libelle_court || ''} onChange={e => set('libelle_court', e.target.value)} /></div>
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Libellé court (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translating} onClick={() => translateText('libelle_court', 'libelle_court_fr')}>
                        <Languages size={13} /> {translating ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <input value={form.libelle_court_fr || ''} onChange={e => set('libelle_court_fr', e.target.value)} style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group"><label>Marque *</label>
                    <select value={form.marque_id || ''} onChange={e => set('marque_id', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {marques.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Famille</label>
                    <select value={form.categorie_id || ''} onChange={e => set('categorie_id', e.target.value)}>
                      <option value="">Aucune</option>
                      {buildCategoryTree(categories.filter(c => {
                        if (!form.marque_id) return true
                        const mq = marques.find(m => m.id === form.marque_id)
                        return mq?.nomenclature_specifique ? c.marque_id === form.marque_id : !c.marque_id
                      }), langFamille).map(({ cat, depth }) => (
                        <option key={cat.id} value={cat.id}>
                          {depth > 0 ? '\u00a0\u00a0\u00a0\u00a0↳ ' : ''}{displayCategorieNom(cat, langFamille)}
                        </option>
                      ))}
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
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translating} onClick={() => translateText('description', 'description_fr')}>
                        <Languages size={13} /> {translating ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <textarea value={form.description_fr || ''} onChange={e => set('description_fr', e.target.value)} rows={3} placeholder="Description traduite en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group form-full">
                    <label>Photo produit</label>
                    <LogoUploader value={form.photo_url} onChange={url => set('photo_url', url)} folder="produits" />
                  </div>
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
                  <ReadRow label="Type cdt" value={form.type_conditionnement === 'kg' ? 'Au poids (kg)' : 'À l\'unité'} />
                  {form.type_conditionnement === 'kg'
                    ? <ReadRow label="Poids colis (kg)" value={form.poids_colis_kg} />
                    : <ReadRow label="PCB" value={form.pcb ? `${form.pcb} unités` : ''} />
                  }
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Dimensions colis</div>
                  <ReadRow label="Longueur (cm)" value={form.longueur_colis_cm} />
                  <ReadRow label="Largeur (cm)" value={form.largeur_colis_cm} />
                  <ReadRow label="Hauteur (cm)" value={form.hauteur_colis_cm} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Produit unitaire</div>
                  <ReadRow label="Poids brut (kg)" value={form.poids_produit_brut_kg} />
                  <ReadRow label="Poids net (kg)" value={form.poids_produit_net_kg} />
                </div>
              ) : (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Type de conditionnement</label>
                      <select value={form.type_conditionnement || 'unites'} onChange={e => set('type_conditionnement', e.target.value)}>
                        <option value="unites">À l'unité</option>
                        <option value="kg">Au poids (kg)</option>
                      </select>
                    </div>
                    {(form.type_conditionnement || 'unites') === 'unites' ? (
                      <div className="form-group"><label>PCB (unités par colis)</label><input type="number" value={form.pcb || ''} onChange={e => set('pcb', e.target.value)} placeholder="Ex: 6, 12, 24..." /></div>
                    ) : (
                      <div className="form-group"><label>Poids d'un colis (kg)</label><input type="number" step="0.001" value={form.poids_colis_kg || ''} onChange={e => set('poids_colis_kg', e.target.value)} /></div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Dimensions colis</div>
                  <div className="form-grid-3">
                    <div className="form-group"><label>Longueur (cm)</label><input type="number" step="0.1" value={form.longueur_colis_cm || ''} onChange={e => set('longueur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Largeur (cm)</label><input type="number" step="0.1" value={form.largeur_colis_cm || ''} onChange={e => set('largeur_colis_cm', e.target.value)} /></div>
                    <div className="form-group"><label>Hauteur (cm)</label><input type="number" step="0.1" value={form.hauteur_colis_cm || ''} onChange={e => set('hauteur_colis_cm', e.target.value)} /></div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 16, marginBottom: 8 }}>Produit unitaire</div>
                  <div className="form-grid">
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
                  <div className="form-group form-full">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Ingrédients (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translating} onClick={() => translateText('ingredients_vo', 'ingredients_fr')}>
                        <Languages size={13} /> {translating ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <textarea value={form.ingredients_fr || ''} onChange={e => set('ingredients_fr', e.target.value)} rows={4} placeholder="Eau, Sucre, Sel..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group form-full"><label>Allergènes</label><input value={form.allergenes || ''} onChange={e => set('allergenes', e.target.value)} placeholder="Gluten, Lait, Fruits à coque..." /></div>
                  <div className="form-group form-full"><label>URL Fiche technique</label><input value={form.fiche_technique_url || ''} onChange={e => set('fiche_technique_url', e.target.value)} placeholder="https://..." /></div>
                  {form.fiche_technique_url && <div className="form-full"><a href={form.fiche_technique_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex' }}>Voir le document</a></div>}
                </div>
              )}
            </>
          )}

          {/* ── Packaging ── */}
          {panelTab === 'etiquette' && (() => {
            const isPdf = (u) => u && /\.pdf(\?|$)/i.test(u)
            // Choix de l'URL d'affichage : preview PNG si dispo, sinon URL d'origine
            const voThumb = product.etiquette_originale_preview_url || product.etiquette_originale_url
            const frThumb = product.etiquette_fr_preview_url || product.etiquette_fr_url
            const tiles = [
              product.photo_url && { key: 'photo', thumb: product.photo_url, full: product.photo_url, label: 'Photo produit', sub: null },
              voThumb && { key: 'packaging', thumb: voThumb, full: product.etiquette_originale_url, label: 'Packaging VO', sub: null },
              frThumb && { key: 'etiquette_fr', thumb: frThumb, full: product.etiquette_fr_url, label: 'Étiquette FR', sub: product.etiquette_fr_format },
            ].filter(Boolean)
            return (
              <>
                <SectionHeader section="etiquette" title="Packaging produit" />
                {tiles.length > 0 && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    {tiles.map(t => (
                      <div key={t.key} onClick={() => setPhotoZoom(t.key)} style={{ flex: '1 1 0', minWidth: 140, background: 'var(--surface-2)', borderRadius: 12, padding: 12, cursor: 'zoom-in', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, width: '100%' }}>
                          {isPdf(t.thumb) ? (
                            <PdfThumb url={t.thumb} maxHeight={180} />
                          ) : (
                            <img src={t.thumb} alt={t.label} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8 }} />
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 600, textAlign: 'center' }}>{t.label}</div>
                        {t.sub && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t.sub}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Packaging original (VO)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Image ou PDF du packaging d'origine tel qu'il apparaît sur le produit.
                    </div>
                    <LogoUploader
                      value={form.etiquette_originale_url}
                      onChange={url => set('etiquette_originale_url', url)}
                      folder="etiquettes/originales"
                      accept="image/*,application/pdf"
                    />
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Étiquette FR (à superposer)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Étiquette française à coller par dessus le packaging — mentions réglementaires pour la distribution en France (ingrédients, allergènes, DLC, conservation, opérateur, etc.). À générer dans un second temps.
                    </div>
                    <LogoUploader
                      value={form.etiquette_fr_url}
                      onChange={url => set('etiquette_fr_url', url)}
                      folder="etiquettes/fr"
                      accept="image/*,application/pdf"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <button className="btn btn-primary" onClick={saveSection} disabled={saving} style={{ fontSize: 12, padding: '6px 14px', gap: 4 }}>
                    <Save size={13} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </>
            )
          })()}

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

          {/* ── Tarifs (lecture seule) ── */}
          {panelTab === 'tarifs' && (() => {
            const tva = product.taux_tva ?? 5.5
            const achatHT = tarifAchat?.prix_achat_ht
            const cessionHT = tarifVenteGeneral?.prix_vente_ht
            const pvpTTC = product.pvpr != null && product.pvpr !== '' ? Number(product.pvpr) : null
            const pvpHT = pvpTTC ? pvpTTC / (1 + tva / 100) : null
            const fmt = v => v != null ? `${Number(v).toFixed(2)} €` : null
            const ttc = (ht) => ht != null ? `${(Number(ht) * (1 + tva / 100)).toFixed(2)} €` : null
            const margeHW = (achatHT && cessionHT && cessionHT !== 0) ? ((cessionHT - achatHT) / cessionHT * 100) : null
            const margeHWVal = (achatHT != null && cessionHT != null) ? cessionHT - achatHT : null
            const margeClient = (cessionHT && pvpHT && pvpHT !== 0) ? ((pvpHT - cessionHT) / pvpHT * 100) : null
            const margeClientVal = (cessionHT != null && pvpHT != null) ? pvpHT - cessionHT : null
            const badgeColor = v => v >= 28 ? '#27AE60' : v >= 23 ? '#D4840A' : '#C0392B'
            return loadingTarifs ? <div className="loading">Chargement des tarifs...</div> : (
              <>
                <ReadRow label="TVA" value={`${tva} %`} />
                <ReadRow label="Prix achat HT" value={fmt(achatHT)} />
                <ReadRow label="Prix achat TTC" value={ttc(achatHT)} />

                <hr className="divider" />

                <ReadRow label="Prix de cession HT" value={fmt(cessionHT)} />
                <ReadRow label="Prix de cession TTC" value={ttc(cessionHT)} />
                <ReadRow label="Marge HW" value={
                  margeHW != null
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: badgeColor(margeHW), fontWeight: 600 }}>{margeHW.toFixed(2)} %</span>
                        {margeHWVal != null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({margeHWVal.toFixed(2)} €)</span>}
                      </span>
                    : null
                } />

                <hr className="divider" />

                <ReadRow label="PVC HT" value={fmt(pvpHT)} />
                <ReadRow label="PVC TTC" value={fmt(pvpTTC)} />
                <ReadRow label="Marge Client" value={
                  margeClient != null
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: badgeColor(margeClient), fontWeight: 600 }}>{margeClient.toFixed(2)} %</span>
                        {margeClientVal != null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({margeClientVal.toFixed(2)} €)</span>}
                      </span>
                    : null
                } />

                <div style={{ marginTop: 16 }}>
                  <a href="/tarifs" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Modifier dans Référencement & Tarifs →</a>
                </div>
              </>
            )
          })()}
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
  { key: 'categorie_nom',       label: 'Famille',         group: 'Général',  default: true,  exportKey: 'categorie_nom' },
  { key: 'ref_marque',          label: 'Réf. interne',    group: 'Général',  default: false, exportKey: 'ref_marque' },
  { key: 'statut',              label: 'Statut',          group: 'Général',  default: true,  exportKey: 'statut' },
  { key: 'etiquettes',          label: 'Étiquettes',      group: 'Général',  default: true,  exportKey: null },
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

// ─── Panneau colonnes (visibilité + ordre par drag & drop) ────────────────────
function ColumnPanel({ colOrder, visibleCols, onChange, onClose }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const toggle = key => {
    if (key === 'photo' || key === 'libelle') return
    const next = visibleCols.includes(key) ? visibleCols.filter(k => k !== key) : [...visibleCols, key]
    onChange({ visible: next })
  }

  const handleDragStart = (e, idx) => {
    const col = ALL_COLUMNS.find(c => c.key === colOrder[idx])
    if (col && (col.key === 'photo' || col.key === 'libelle')) { e.preventDefault(); return }
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx) }
  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx == null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return }
    const newOrder = [...colOrder]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(dropIdx, 0, moved)
    onChange({ order: newOrder })
    setDragIdx(null); setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  // Show columns in current order, grouped visually
  const orderedCols = colOrder.map(key => ALL_COLUMNS.find(c => c.key === key)).filter(Boolean)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 300, background: 'var(--surface)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Colonnes</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '10px 20px 0', fontSize: 11, color: 'var(--text-muted)' }}>Glissez pour réordonner · cochez pour afficher</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {orderedCols.map((col, idx) => {
            const active = visibleCols.includes(col.key)
            const locked = col.key === 'photo' || col.key === 'libelle'
            const isDragging = dragIdx === idx
            const isOver = overIdx === idx && dragIdx !== idx
            return (
              <div key={col.key}
                draggable={!locked}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7,
                  cursor: locked ? 'default' : 'grab',
                  background: isDragging ? 'var(--primary-light)' : active ? '#e8f0eb' : 'transparent',
                  opacity: isDragging ? 0.5 : locked && !active ? 0.5 : 1,
                  borderTop: isOver ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'background .15s',
                }}>
                <span style={{ color: 'var(--text-muted)', cursor: locked ? 'default' : 'grab', display: 'flex' }}>
                  {locked ? <span style={{ width: 16 }} /> : <GripVertical size={14} />}
                </span>
                <div onClick={e => { e.stopPropagation(); !locked && toggle(col.key) }} style={{ display: 'flex', alignItems: 'center', cursor: locked ? 'default' : 'pointer' }}>
                  {active ? <CheckSquare size={15} color="var(--primary)" /> : <Square size={15} color="var(--text-muted)" />}
                </div>
                <span style={{ fontSize: 13, flex: 1, opacity: active ? 1 : 0.45 }}>{col.label}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{col.group}</span>
                {locked && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>fixe</span>}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onChange({ visible: ALL_COLUMNS.filter(c => c.default).map(c => c.key), order: ALL_COLUMNS.map(c => c.key) })}>Réinitialiser</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>Appliquer</button>
        </div>
      </div>
    </>
  )
}

// ─── Modale Export Excel ───────────────────────────────────────────────────────
function ExportModal({ products, allProducts, categories, lang, langFamille, onClose }) {
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
        if (col.key === 'libelle') obj[col.label] = displayLibelle(row, lang)
        else if (col.key === 'categorie_nom') obj[col.label] = displayCategoriePath(categories.find(c => c.id === row.categorie_id), categories, langFamille)
        else if (col.key === 'ean13') obj[col.label] = formatEan(row.ean13)
        else if (typeof col.exportKey === 'function') obj[col.label] = col.exportKey(row)
        else obj[col.label] = row[col.exportKey] ?? ''
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
  ean13: '', libelle: '', libelle_fr: '', libelle_court: '', libelle_court_fr: '', description: '', description_fr: '',
  marque_id: '', categorie_id: '',
  unite_vente: 'unité', pcb: 1,
  poids_brut_kg: '', poids_net_kg: '', volume_m3: '',
  longueur_cm: '', largeur_cm: '', hauteur_cm: '',
  poids_colis_kg: '', longueur_colis_cm: '', largeur_colis_cm: '', hauteur_colis_cm: '',
  poids_produit_brut_kg: '', poids_produit_net_kg: '',
  temperature_stockage: 'ambiant',
  dlc_type: 'DLC', dlc_duree_jours: '',
  ref_marque: '', photo_url: '', fiche_technique_url: '',
  statut: 'actif', code_douanier: '', pays_origine: '', meursing_code: '', etiquette_originale_url: '', etiquette_fr_url: '',
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
  const [hideInactifs, setHideInactifs] = useState(() => {
    try { const v = localStorage.getItem('highway_hide_inactifs'); return v == null ? true : v === '1' } catch { return true }
  })
  function toggleHideInactifs() {
    setHideInactifs(v => {
      const next = !v
      try { localStorage.setItem('highway_hide_inactifs', next ? '1' : '0') } catch {}
      return next
    })
  }
  const [modal, setModal]             = useState(false)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [activeTab, setActiveTab]     = useState('general')
  const [photoZoomUrl, setPhotoZoomUrl] = useState(null)
  const [detailPanel, setDetailPanel] = useState(null)
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = localStorage.getItem('highway_cols')
      const parsed = stored ? JSON.parse(stored) : null
      const defaults = ALL_COLUMNS.filter(c => c.default).map(c => c.key)
      if (!parsed) return defaults
      // Merge : on garde le choix user mais on ajoute les nouvelles colonnes default ajoutées au code
      const knownKeys = new Set(ALL_COLUMNS.map(c => c.key))
      const seen = new Set(parsed.filter(k => knownKeys.has(k)))
      const knownStored = JSON.parse(localStorage.getItem('highway_cols_known') || '[]')
      const knownStoredSet = new Set(knownStored)
      defaults.forEach(k => { if (!knownStoredSet.has(k)) seen.add(k) })
      localStorage.setItem('highway_cols_known', JSON.stringify(ALL_COLUMNS.map(c => c.key)))
      return Array.from(seen)
    } catch { return ALL_COLUMNS.filter(c => c.default).map(c => c.key) }
  })
  const [colOrder, setColOrder] = useState(() => {
    try {
      const stored = localStorage.getItem('highway_cols_order')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Ensure all columns are present
        const allKeys = ALL_COLUMNS.map(c => c.key)
        const order = parsed.filter(k => allKeys.includes(k))
        allKeys.forEach(k => { if (!order.includes(k)) order.push(k) })
        return order
      }
    } catch {}
    return ALL_COLUMNS.map(c => c.key)
  })

  function updateVisibleCols(val) {
    const next = typeof val === 'function' ? val(visibleCols) : val
    localStorage.setItem('highway_cols', JSON.stringify(next))
    setVisibleCols(next)
  }
  function updateColConfig({ visible, order }) {
    if (visible !== undefined) {
      localStorage.setItem('highway_cols', JSON.stringify(visible))
      setVisibleCols(visible)
    }
    if (order !== undefined) {
      localStorage.setItem('highway_cols_order', JSON.stringify(order))
      setColOrder(order)
    }
  }
  const [showColPanel, setShowColPanel] = useState(false)
  const [bulkFamille, setBulkFamille] = useState(null) // { categorieId, marqueId } | null
  const [savingBulk, setSavingBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExport, setShowExport]   = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [sortConfig, setSortConfig]   = useState({ key: 'marque_nom', dir: 'asc' })
  const [colFilters, setColFilters]   = useState({})
  const [tooltipDlc, setTooltipDlc]   = useState(false)
  const [translatingMain, setTranslatingMain] = useState(false)
  const [lang, setLang] = useState(() => loadLang('produits'))
  const [langFamille, setLangFamille] = useState(() => loadLang('produits_famille'))

  function changeLang(v) { setLang(v); saveLang('produits', v) }
  function changeLangFamille(v) { setLangFamille(v); saveLang('produits_famille', v) }

  async function translateTextMain(sourceField, targetField) {
    const text = form[sourceField]
    if (!text?.trim()) return toast('Rien à traduire', 'error')
    setTranslatingMain(true)
    const translated = await translateToFr(text)
    setTranslatingMain(false)
    if (translated) { set(targetField, translated); toast('Traduction effectuée', 'success') }
    else toast('Erreur de traduction', 'error')
  }

  function handleSort(key) {
    if (key === 'photo') return
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function getSortValue(row, key) {
    switch (key) {
      case 'libelle':          return displayLibelle(row, lang).toLowerCase()
      case 'ean13':            return row.ean13 || ''
      case 'marque_nom': {
        // Tri composite : marque → famille (ordre) → sous-famille (ordre) → libellé FR alphabétique
        const m = (row.marques?.nom || 'zzz').toLowerCase()
        return m + '|' + categorieSortKey(row.categorie_id, categories, displayLibelle(row, 'fr'))
      }
      case 'categorie_nom':    return categorieSortKey(row.categorie_id, categories, displayLibelle(row, 'fr'))
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
      supabase.from('produits').select('*, marques(nom), categories(nom, nom_fr)').order('libelle'),
      supabase.from('marques').select('id, nom, nomenclature_specifique').eq('actif', true).order('nom'),
      supabase.from('categories').select('id, nom, nom_fr, marque_id, parent_id, ordre').order('ordre', { ascending: true }),
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
    ;['taux_tva','pvpr'].forEach(f => {
      if (payload[f] != null && payload[f] !== '') payload[f] = Math.round(parseFloat(payload[f]) * 100) / 100
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
    const matchSearch    = (r.libelle||'').toLowerCase().includes(s) || (r.libelle_fr||'').toLowerCase().includes(s) || (r.libelle_court||'').toLowerCase().includes(s) || (r.libelle_court_fr||'').toLowerCase().includes(s) || (r.ean13||'').includes(s) || (r.marques?.nom||'').toLowerCase().includes(s)
    const matchMarque    = !filterMarque    || r.marque_id    === filterMarque
    const matchCategorie = !filterCategorie
      || r.categorie_id === filterCategorie
      || categories.some(c => c.id === r.categorie_id && c.parent_id === filterCategorie)
    const matchStatut    = !filterStatut    || r.statut       === filterStatut
    // Si "Masquer inactifs" est actif ET pas de filtre statut explicite → on cache les inactifs
    const matchHide      = !hideInactifs || filterStatut || r.statut !== 'inactif'
    return matchSearch && matchMarque && matchCategorie && matchStatut && matchHide
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
        case 'libelle':          return (row.libelle || '').toLowerCase().includes(v) || (row.libelle_fr || '').toLowerCase().includes(v)
        case 'ean13':            return (row.ean13 || '').includes(v)
        case 'marque_nom':       return (row.marques?.nom || '').toLowerCase().includes(v)
        case 'categorie_nom':    return categorieSortKey(row.categorie_id, categories, displayLibelle(row, 'fr')).includes(v)
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
  const activeCols   = colOrder.map(key => ALL_COLUMNS.find(c => c.key === key)).filter(c => c && visibleCols.includes(c.key))
  const allSelected  = displayed.length > 0 && selectedIds.size === displayed.length
  const tempBadge    = t => t === 'surgelé' || t === 'frais' ? 'badge-blue' : 'badge-gray'
  const statutBadge  = s => s === 'actif' ? 'badge-green' : s === 'inactif' ? 'badge-red' : 'badge-orange'

  function renderCell(col, row) {
    switch (col.key) {
      case 'photo':
        return row.photo_url
          ? <img src={row.photo_url} alt="" onClick={e => { e.stopPropagation(); setPhotoZoomUrl(row.photo_url) }} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
          : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={12} color="var(--text-muted)" /></div>
      case 'libelle': {
        const lib = displayLibelle(row, lang)
        const libCourt = displayLibelleCourt(row, lang)
        return <div><div style={{ fontWeight: 500, fontSize: 12 }}>{lib}</div>{libCourt && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{libCourt}</div>}</div>
      }
      case 'ean13':          return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{formatEan(row.ean13) || '—'}</span>
      case 'marque_nom':     return row.marques?.nom || '—'
      case 'categorie_nom':
        return <FamillePath categorieId={row.categorie_id} categories={categories} lang={langFamille} />
      case 'ref_marque':     return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.ref_marque || '—'}</span>
      case 'statut':         return <span className={`badge ${statutBadge(row.statut)}`}>{formatStatut(row.statut)}</span>
      case 'etiquettes': {
        const hasVO = !!row.etiquette_originale_url
        const hasFR = !!row.etiquette_fr_url
        if (!hasVO && !hasFR) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
        return (
          <span style={{ display: 'inline-flex', gap: 4 }} title={`Étiquette VO : ${hasVO ? 'OK' : 'absente'}\nÉtiquette FR : ${hasFR ? 'OK' : 'absente'}`}>
            <span title="Étiquette originale" style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: hasVO ? '#e8f0eb' : 'var(--surface-2)', color: hasVO ? '#2D5A3D' : 'var(--text-muted)' }}>VO</span>
            <span title="Étiquette FR" style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: hasFR ? '#e8f0eb' : 'var(--surface-2)', color: hasFR ? '#2D5A3D' : 'var(--text-muted)' }}>FR</span>
          </span>
        )
      }
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
      case 'code_douanier':  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.code_douanier || '—'}</span>
      case 'pays_origine':   return row.pays_origine   || '—'
      case 'meursing_code':  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{row.meursing_code || '—'}</span>
      default: return '—'
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Articles</h2>
          <p>
            {filtered.length} produit{filtered.length > 1 ? 's' : ''}
            {selectedIds.size > 0 && <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>· {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && (
            <button className="btn btn-secondary" onClick={() => setBulkFamille({ categorieId: '', marqueId: '' })} title="Affecter une famille à la sélection">
              <Settings2 size={15} /> Affecter une famille
            </button>
          )}
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
            <option value="">Toutes les familles</option>
            {buildCategoryTree(categories.filter(c => {
              if (!filterMarque) return true
              const mq = marques.find(m => m.id === filterMarque)
              return mq?.nomenclature_specifique ? c.marque_id === filterMarque : !c.marque_id
            }), langFamille).map(({ cat, depth }) => (
              <option key={cat.id} value={cat.id}>
                {depth > 0 ? '\u00a0\u00a0\u00a0\u00a0↳ ' : ''}{displayCategorieNom(cat, langFamille)}
              </option>
            ))}
          </select>
          <select className="filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{formatStatut(s)}</option>)}
          </select>
          <button
            className="btn btn-secondary"
            onClick={toggleHideInactifs}
            title={hideInactifs ? 'Afficher les produits inactifs' : 'Masquer les produits inactifs'}
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            {hideInactifs ? <EyeOff size={14} /> : <Eye size={14} />}
            {hideInactifs ? 'Inactifs masqués' : 'Inactifs affichés'}
          </button>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? <div className="loading">Chargement...</div> : (
              <table style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ width: 32, padding: '6px 6px' }}>
                      <div onClick={toggleSelectAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {allSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                      </div>
                    </th>
                    {activeCols.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        style={{ cursor: col.key === 'photo' ? 'default' : 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {col.label}
                          {col.key === 'libelle' && <LangToggle value={lang} onChange={changeLang} compact />}
                          {col.key === 'categorie_nom' && <LangToggle value={langFamille} onChange={changeLangFamille} compact />}
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
                        <td style={{ padding: '3px 6px' }} onClick={e => toggleSelect(row.id, e)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {isSel ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} color="var(--text-muted)" />}
                          </div>
                        </td>
                        {activeCols.map(col => <td key={col.key} style={{ padding: '3px 6px' }}>{renderCell(col, row)}</td>)}
                        <td style={{ padding: '3px 6px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button className="btn-icon" onClick={() => openDetail(row)}><Edit2 size={13} /></button>
                            <button className="btn-icon" onClick={() => remove(row.id)}><Trash2 size={13} /></button>
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
                  <div className="form-group form-full"><label>Libellé * (VO)</label><input value={form.libelle} onChange={e => set('libelle', e.target.value)} placeholder="Nom complet du produit" /></div>
                  <div className="form-group form-full">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Libellé (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translatingMain} onClick={() => translateTextMain('libelle', 'libelle_fr')}>
                        <Languages size={13} /> {translatingMain ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <input value={form.libelle_fr || ''} onChange={e => set('libelle_fr', e.target.value)} placeholder="Libellé traduit en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group"><label>Libellé court (VO)</label><input value={form.libelle_court || ''} onChange={e => set('libelle_court', e.target.value)} /></div>
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ margin: 0 }}>Libellé court (FR)</label>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translatingMain} onClick={() => translateTextMain('libelle_court', 'libelle_court_fr')}>
                        <Languages size={13} /> {translatingMain ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <input value={form.libelle_court_fr || ''} onChange={e => set('libelle_court_fr', e.target.value)} style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group"><label>Marque *</label>
                    <select value={form.marque_id} onChange={e => set('marque_id', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {marques.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Famille</label>
                    <select value={form.categorie_id || ''} onChange={e => set('categorie_id', e.target.value)}>
                      <option value="">Aucune</option>
                      {buildCategoryTree(categories.filter(c => {
                        if (!form.marque_id) return true
                        const mq = marques.find(m => m.id === form.marque_id)
                        return mq?.nomenclature_specifique ? c.marque_id === form.marque_id : !c.marque_id
                      }), langFamille).map(({ cat, depth }) => (
                        <option key={cat.id} value={cat.id}>
                          {depth > 0 ? '\u00a0\u00a0\u00a0\u00a0↳ ' : ''}{displayCategorieNom(cat, langFamille)}
                        </option>
                      ))}
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
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translatingMain} onClick={() => translateTextMain('description', 'description_fr')}>
                        <Languages size={13} /> {translatingMain ? 'Traduction...' : 'Traduire'}
                      </button>
                    </div>
                    <textarea value={form.description_fr || ''} onChange={e => set('description_fr', e.target.value)} rows={3} placeholder="Description traduite en français..." style={{ marginTop: 6 }} />
                  </div>
                  <div className="form-group form-full">
                    <label>Photo produit</label>
                    <LogoUploader value={form.photo_url} onChange={url => set('photo_url', url)} folder="produits" />
                  </div>
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
                    <div className="form-group form-full">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ margin: 0 }}>Ingrédients (FR)</label>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 10px', gap: 4 }} disabled={translatingMain} onClick={() => translateTextMain('ingredients_vo', 'ingredients_fr')}>
                          <Languages size={13} /> {translatingMain ? 'Traduction...' : 'Traduire'}
                        </button>
                      </div>
                      <textarea value={form.ingredients_fr || ''} onChange={e => set('ingredients_fr', e.target.value)} rows={4} placeholder="Eau, Sucre, Sel..." style={{ marginTop: 6 }} />
                    </div>
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
      {showColPanel && <ColumnPanel colOrder={colOrder} visibleCols={visibleCols} onChange={updateColConfig} onClose={() => setShowColPanel(false)} />}
      {showExport   && <ExportModal products={selectedRows} allProducts={filtered} categories={categories} lang={lang} langFamille={langFamille} onClose={() => setShowExport(false)} />}

      {bulkFamille && (() => {
        // Marques uniques des produits sélectionnés
        const selectedMarqueIds = [...new Set(selectedRows.map(p => p.marque_id).filter(Boolean))]
        const oneBrand = selectedMarqueIds.length === 1 ? selectedMarqueIds[0] : null
        const brandObj = oneBrand ? marques.find(m => m.id === oneBrand) : null
        // Familles utilisables : si toutes la même marque ET nomenclature spécifique → familles de cette marque ;
        // sinon, on propose les familles générales (compatibles avec n'importe quelle marque)
        let availableCats = []
        if (oneBrand && brandObj?.nomenclature_specifique) {
          availableCats = categories.filter(c => c.marque_id === oneBrand)
        } else if (oneBrand && !brandObj?.nomenclature_specifique) {
          availableCats = categories.filter(c => !c.marque_id)
        } else {
          // Multi-marques : on n'autorise que les familles générales pour éviter les incohérences
          availableCats = categories.filter(c => !c.marque_id)
        }
        const tree = buildCategoryTree(availableCats, langFamille)
        async function applyBulk() {
          setSavingBulk(true)
          const ids = [...selectedIds]
          const newCatId = bulkFamille.categorieId || null
          const { error } = await supabase.from('produits').update({ categorie_id: newCatId }).in('id', ids)
          setSavingBulk(false)
          if (error) { toast('Erreur : ' + error.message, 'error'); return }
          toast(`${ids.length} produit(s) mis à jour`, 'success')
          setBulkFamille(null)
          setSelectedIds(new Set())
          fetchAll()
        }
        return (
          <div className="modal-overlay" onClick={() => !savingBulk && setBulkFamille(null)}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Affecter une famille</h3>
                <button className="btn-icon" onClick={() => setBulkFamille(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {selectedIds.size} produit(s) sélectionné(s){oneBrand && brandObj ? ` — marque : ${brandObj.nom}` : selectedMarqueIds.length > 1 ? ` — marques mixtes (familles générales uniquement)` : ''}
                </p>
                <div className="form-group form-full">
                  <label>Famille à affecter</label>
                  <select value={bulkFamille.categorieId} onChange={e => setBulkFamille(b => ({ ...b, categorieId: e.target.value }))}>
                    <option value="">— Retirer la famille —</option>
                    {tree.map(({ cat, depth }) => (
                      <option key={cat.id} value={cat.id}>
                        {depth > 0 ? '    ↳ ' : ''}{displayCategorieNom(cat, langFamille)}
                      </option>
                    ))}
                  </select>
                  {tree.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 6 }}>
                      Aucune famille disponible pour cette sélection. Crée des familles dans la rubrique Marques.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setBulkFamille(null)} disabled={savingBulk}>Annuler</button>
                <button className="btn btn-primary" onClick={applyBulk} disabled={savingBulk}>
                  {savingBulk ? 'Application...' : 'Appliquer'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      {photoZoomUrl && (
        <div onClick={() => setPhotoZoomUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={photoZoomUrl} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
        </div>
      )}
      {detailPanel  && <DetailPanel product={detailPanel} marques={marques} categories={categories} lang={lang} langFamille={langFamille} onClose={() => setDetailPanel(null)} onSaved={async (currentTab) => { await fetchAll(); const { data } = await supabase.from('produits').select('*, marques(nom), categories(nom, nom_fr)').eq('id', detailPanel.id).single(); if (data) setDetailPanel(data) }} onDelete={(id) => { remove(id); setDetailPanel(null) }} />}
    </div>
  )
}
