import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { Plus, Search, X, Building2, Edit2, Trash2, UserPlus, Tag, Languages, CornerDownRight, GripVertical } from 'lucide-react'
import { translateToFr, translateBatch, buildCategoryTree } from '../lib/i18n'
import LogoUploader from '../components/LogoUploader'

const emptyMarque = {
  nom: '', code: '', pays: '', devise: 'EUR', delai_livraison_jours: 7,
  conditions_paiement: '', adresse: '', notes: '', actif: true,
  nomenclature_specifique: false, logo_url: ''
}

const emptyContact = { prenom: '', nom: '', fonction: '', email: '' }

function CatRow({ cat, depth, isEditing, onEdit, onEditDone, onChange, onTranslate, onRemove, onAddSub, canAddSub, draggable, dragHandlers, isDragging, isDropTarget }) {
  const indent = depth * 20
  if (isEditing) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '8px 10px', marginLeft: indent,
          border: '1px solid var(--primary)', borderRadius: 'var(--radius)',
          background: 'var(--primary-light)',
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {depth > 0 && <CornerDownRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          <input
            autoFocus
            value={cat.nom || ''}
            onChange={e => onChange('nom', e.target.value)}
            placeholder="Nom (VO)"
            style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
            onKeyDown={e => { if (e.key === 'Enter') onEditDone(); if (e.key === 'Escape') onEditDone() }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: depth > 0 ? 18 : 0 }}>
          <input
            value={cat.nom_fr || ''}
            onChange={e => onChange('nom_fr', e.target.value)}
            placeholder="Traduction FR"
            style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
            onKeyDown={e => { if (e.key === 'Enter') onEditDone(); if (e.key === 'Escape') onEditDone() }}
          />
          <button className="btn btn-secondary" onClick={onTranslate} style={{ fontSize: 11, padding: '4px 8px' }} title="Traduire automatiquement">
            <Languages size={12} />
          </button>
          <button className="btn btn-primary" onClick={onEditDone} style={{ fontSize: 11, padding: '4px 10px' }}>OK</button>
        </div>
      </div>
    )
  }
  return (
    <div
      draggable={draggable}
      {...(dragHandlers || {})}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px', marginLeft: indent,
        border: isDropTarget ? '2px solid var(--primary)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: cat._new ? 'var(--primary-light)' : depth > 0 ? 'var(--surface)' : 'var(--surface-2)',
        opacity: isDragging ? 0.4 : 1,
        transition: 'border-color .15s, opacity .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
        {draggable && (
          <span style={{ color: 'var(--text-muted)', cursor: 'grab', display: 'flex', flexShrink: 0 }} title="Glisser pour réordonner">
            <GripVertical size={12} />
          </span>
        )}
        {depth > 0
          ? <CornerDownRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <Tag size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: depth === 0 ? 500 : 400 }}>{cat.nom}</span>
        {cat.nom_fr && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— {cat.nom_fr}</span>}
        {cat._new && <span style={{ fontSize: 10, color: 'var(--primary)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>Nouveau</span>}
        {cat._dirty && !cat._new && <span style={{ fontSize: 10, color: 'var(--warning)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>Modifié</span>}
      </div>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {canAddSub && (
          <button className="btn-icon" onClick={onAddSub} title="Ajouter une sous-famille">
            <Plus size={13} />
          </button>
        )}
        <button className="btn-icon" onClick={onEdit} title="Modifier"><Edit2 size={13} /></button>
        <button className="btn-icon" onClick={onRemove} title="Supprimer"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

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
  const [editingCatIdx, setEditingCatIdx] = useState(null)
  const [addingSubFor, setAddingSubFor] = useState(null) // id du parent dont on ajoute une sous-famille
  const [newSubName, setNewSubName] = useState('')
  const [translatingCats, setTranslatingCats] = useState(false)
  const [dragCatIdx, setDragCatIdx] = useState(null)
  const [dragOverCatIdx, setDragOverCatIdx] = useState(null)

  // Onglet actif dans la modale
  const [tab, setTab] = useState('infos')
  const [editingInfos, setEditingInfos] = useState(false)

  // Modale catégories générales
  const [catModal, setCatModal] = useState(false)
  const [globalCats, setGlobalCats] = useState([])
  const [newGlobalCatName, setNewGlobalCatName] = useState('')
  const [savingCats, setSavingCats] = useState(false)
  const [editingGlobalIdx, setEditingGlobalIdx] = useState(null)
  const [addingGlobalSubFor, setAddingGlobalSubFor] = useState(null)
  const [newGlobalSubName, setNewGlobalSubName] = useState('')
  const [translatingGlobal, setTranslatingGlobal] = useState(false)
  const [dragGlobalIdx, setDragGlobalIdx] = useState(null)
  const [dragOverGlobalIdx, setDragOverGlobalIdx] = useState(null)

  useEffect(() => { fetchMarques() }, [])

  async function fetchMarques() {
    setLoading(true)
    const { data } = await supabase
      .from('marques')
      .select('*, marque_contacts(id, prenom, nom, fonction, email, telephone), categories(id, nom, nom_fr, parent_id, ordre)')
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
    setEditingCatIdx(null)
    setAddingSubFor(null)
    setNewSubName('')
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
    setEditingCatIdx(null)
    setAddingSubFor(null)
    setNewSubName('')
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
  function nextOrdreInScope(predicate) {
    const ords = categories.filter(predicate).map(c => c.ordre ?? 0)
    return ords.length ? Math.max(...ords) + 10 : 10
  }
  function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    if (categories.some(c => !c.parent_id && c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette famille existe déjà', 'error')
    }
    const ordre = nextOrdreInScope(c => !c.parent_id && !c._parentTempId)
    setCategories(prev => [...prev, { _tempId: `tmp-${Date.now()}-${Math.random()}`, nom: name, nom_fr: '', parent_id: null, ordre, _new: true }])
    setNewCatName('')
  }
  function addSubCategory(parentRef) {
    const name = newSubName.trim()
    if (!name) return
    if (categories.some(c => (c.parent_id === parentRef.id || c._parentTempId === parentRef._tempId) && c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette sous-famille existe déjà', 'error')
    }
    const ordre = nextOrdreInScope(c => parentRef.id ? c.parent_id === parentRef.id : c._parentTempId === parentRef._tempId)
    setCategories(prev => [...prev, {
      _tempId: `tmp-${Date.now()}-${Math.random()}`,
      nom: name,
      nom_fr: '',
      parent_id: parentRef.id || null,
      _parentTempId: parentRef.id ? null : parentRef._tempId,
      ordre,
      _new: true
    }])
    setNewSubName('')
    setAddingSubFor(null)
  }
  function setCategory(idx, field, val) {
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val, _dirty: !c._new ? true : c._dirty } : c))
  }
  function removeCategory(idx) {
    const c = categories[idx]
    if (!c) return
    const children = categories.filter(x => x.parent_id === c.id || x._parentTempId === c._tempId)
    if (children.length && !confirm(`"${c.nom}" contient ${children.length} sous-famille(s). Tout supprimer ?`)) return
    if (c.id) setDeletedCatIds(prev => [...prev, c.id])
    const idsToRemove = new Set([c._tempId, c.id].filter(Boolean))
    for (const child of children) {
      if (child.id) setDeletedCatIds(prev => [...prev, child.id])
      if (child._tempId) idsToRemove.add(child._tempId)
      if (child.id) idsToRemove.add(child.id)
    }
    setCategories(prev => prev.filter(x => !idsToRemove.has(x._tempId) && !idsToRemove.has(x.id)))
    if (editingCatIdx === idx) setEditingCatIdx(null)
  }
  async function translateCategory(idx) {
    const c = categories[idx]
    if (!c?.nom?.trim()) return
    const fr = await translateToFr(c.nom)
    if (fr) setCategory(idx, 'nom_fr', fr)
  }
  async function translateAllCategories() {
    const toTranslate = categories.map((c, i) => ({ idx: i, nom: c.nom })).filter(x => !categories[x.idx].nom_fr && x.nom?.trim())
    if (!toTranslate.length) return toast('Toutes les familles sont déjà traduites', 'info')
    setTranslatingCats(true)
    try {
      const frs = await translateBatch(toTranslate.map(x => x.nom))
      setCategories(prev => prev.map((c, i) => {
        const hit = toTranslate.find(x => x.idx === i)
        return hit ? { ...c, nom_fr: frs[toTranslate.indexOf(hit)], _dirty: !c._new ? true : c._dirty } : c
      }))
      toast(`${toTranslate.length} famille(s) traduite(s)`, 'success')
    } catch {
      toast('Erreur de traduction', 'error')
    }
    setTranslatingCats(false)
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
      // Update existing dirty categories (name / FR translation / ordre)
      for (const c of categories) {
        if (!c._new && c._dirty && c.id) {
          await supabase.from('categories').update({ nom: c.nom, nom_fr: c.nom_fr || null, ordre: c.ordre ?? 0 }).eq('id', c.id)
        }
      }
      // Insert parents first (so we can resolve tempId → real id for children)
      const tempIdToRealId = {}
      for (const c of categories) {
        if (c._new && !c.parent_id && !c._parentTempId) {
          const { data, error } = await supabase.from('categories')
            .insert({ nom: c.nom, nom_fr: c.nom_fr || null, marque_id: marqueId, parent_id: null, ordre: c.ordre ?? 0 })
            .select('id').single()
          if (error) throw error
          if (c._tempId) tempIdToRealId[c._tempId] = data.id
        }
      }
      // Insert children (resolve parent tempIds to real ids)
      for (const c of categories) {
        if (c._new && (c.parent_id || c._parentTempId)) {
          const parentId = c.parent_id || tempIdToRealId[c._parentTempId]
          if (!parentId) continue
          await supabase.from('categories').insert({
            nom: c.nom,
            nom_fr: c.nom_fr || null,
            marque_id: marqueId,
            parent_id: parentId,
            ordre: c.ordre ?? 0,
          })
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
    const { data } = await supabase.from('categories').select('id, nom, nom_fr, parent_id, ordre').is('marque_id', null).order('ordre', { ascending: true })
    setGlobalCats(data || [])
    setNewGlobalCatName('')
    setEditingGlobalIdx(null)
    setAddingGlobalSubFor(null)
    setNewGlobalSubName('')
    setCatModal(true)
  }

  async function addGlobalCat() {
    const name = newGlobalCatName.trim()
    if (!name) return
    if (globalCats.some(c => !c.parent_id && c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette famille existe déjà', 'error')
    }
    const maxOrd = globalCats.filter(c => !c.parent_id).reduce((m, c) => Math.max(m, c.ordre ?? 0), 0)
    setSavingCats(true)
    const { data, error } = await supabase.from('categories').insert({ nom: name, ordre: maxOrd + 10 }).select('id, nom, nom_fr, parent_id, ordre').single()
    setSavingCats(false)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => [...prev, data])
    setNewGlobalCatName('')
  }

  async function addGlobalSubCat(parent) {
    const name = newGlobalSubName.trim()
    if (!name) return
    if (globalCats.some(c => c.parent_id === parent.id && c.nom.toLowerCase() === name.toLowerCase())) {
      return toast('Cette sous-famille existe déjà', 'error')
    }
    const maxOrd = globalCats.filter(c => c.parent_id === parent.id).reduce((m, c) => Math.max(m, c.ordre ?? 0), 0)
    const { data, error } = await supabase.from('categories').insert({ nom: name, parent_id: parent.id, ordre: maxOrd + 10 }).select('id, nom, nom_fr, parent_id, ordre').single()
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => [...prev, data])
    setNewGlobalSubName('')
    setAddingGlobalSubFor(null)
  }

  async function saveGlobalCat(idx, patch) {
    const c = globalCats[idx]
    if (!c?.id) return
    const { error } = await supabase.from('categories').update(patch).eq('id', c.id)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x))
  }

  async function translateGlobalCat(idx) {
    const c = globalCats[idx]
    if (!c?.nom?.trim()) return
    const fr = await translateToFr(c.nom)
    if (fr) saveGlobalCat(idx, { nom_fr: fr })
  }

  async function translateAllGlobalCats() {
    const toTranslate = globalCats.map((c, i) => ({ idx: i, nom: c.nom })).filter(x => !globalCats[x.idx].nom_fr && x.nom?.trim())
    if (!toTranslate.length) return toast('Toutes les familles sont déjà traduites', 'info')
    setTranslatingGlobal(true)
    try {
      const frs = await translateBatch(toTranslate.map(x => x.nom))
      for (let k = 0; k < toTranslate.length; k++) {
        const { idx } = toTranslate[k]
        const c = globalCats[idx]
        if (c?.id && frs[k]) {
          await supabase.from('categories').update({ nom_fr: frs[k] }).eq('id', c.id)
        }
      }
      setGlobalCats(prev => prev.map((c, i) => {
        const hit = toTranslate.find(x => x.idx === i)
        return hit ? { ...c, nom_fr: frs[toTranslate.indexOf(hit)] } : c
      }))
      toast(`${toTranslate.length} famille(s) traduite(s)`, 'success')
    } catch {
      toast('Erreur de traduction', 'error')
    }
    setTranslatingGlobal(false)
  }

  async function removeGlobalCat(cat) {
    const children = globalCats.filter(c => c.parent_id === cat.id)
    const msg = children.length
      ? `"${cat.nom}" contient ${children.length} sous-famille(s). Tout supprimer ?`
      : `Supprimer la famille "${cat.nom}" ?`
    if (!confirm(msg)) return
    const ids = [cat.id, ...children.map(c => c.id)]
    const { error } = await supabase.from('categories').delete().in('id', ids)
    if (error) return toast('Erreur : ' + error.message, 'error')
    setGlobalCats(prev => prev.filter(c => !ids.includes(c.id)))
  }

  // Réordonne un groupe (parents ou enfants d'un même parent) : met à jour _dirty et ordre localement
  function reorderCatGroup(from, to, scope) {
    // scope = { parent_id or null, _parentTempId or null }
    const isInScope = (c) => {
      if (scope.parent_id) return c.parent_id === scope.parent_id
      if (scope._parentTempId) return c._parentTempId === scope._parentTempId
      return !c.parent_id && !c._parentTempId
    }
    const groupWithIdx = categories.map((c, i) => ({ c, i })).filter(({ c }) => isInScope(c))
    groupWithIdx.sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
    const fromPos = groupWithIdx.findIndex(x => x.i === from)
    const toPos = groupWithIdx.findIndex(x => x.i === to)
    if (fromPos < 0 || toPos < 0 || fromPos === toPos) return
    const reordered = [...groupWithIdx]
    const [moved] = reordered.splice(fromPos, 1)
    reordered.splice(toPos, 0, moved)
    setCategories(prev => prev.map((c, i) => {
      const pos = reordered.findIndex(x => x.i === i)
      if (pos < 0) return c
      const newOrdre = (pos + 1) * 10
      if (c.ordre === newOrdre) return c
      return { ...c, ordre: newOrdre, _dirty: !c._new ? true : c._dirty }
    }))
  }

  function dragHandlersCat(idx, scope) {
    return {
      onDragStart: (e) => { setDragCatIdx(idx); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(idx)) } catch {} },
      onDragOver: (e) => {
        if (dragCatIdx === null || dragCatIdx === idx) return
        const from = categories[dragCatIdx], to = categories[idx]
        if (!from || !to) return
        const fromParent = from.parent_id || from._parentTempId || null
        const toParent = to.parent_id || to._parentTempId || null
        if (fromParent !== toParent) return
        e.preventDefault(); setDragOverCatIdx(idx)
      },
      onDrop: (e) => {
        e.preventDefault()
        if (dragCatIdx !== null && dragCatIdx !== idx) reorderCatGroup(dragCatIdx, idx, scope)
        setDragCatIdx(null); setDragOverCatIdx(null)
      },
      onDragEnd: () => { setDragCatIdx(null); setDragOverCatIdx(null) },
    }
  }

  // ── Rendu arborescence familles (pour marque spécifique) ──
  function renderCategoryTree(list) {
    const parents = list
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.parent_id && !c._parentTempId)
      .sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
    return parents.flatMap(({ c: parent, i: parentIdx }) => {
      const children = list
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => (c.parent_id && c.parent_id === parent.id) || (c._parentTempId && c._parentTempId === parent._tempId))
        .sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
      const rows = [
        <CatRow
          key={parent.id || parent._tempId}
          cat={parent}
          idx={parentIdx}
          depth={0}
          isEditing={editingCatIdx === parentIdx}
          onEdit={() => setEditingCatIdx(parentIdx)}
          onEditDone={() => setEditingCatIdx(null)}
          onChange={(field, val) => setCategory(parentIdx, field, val)}
          onTranslate={() => translateCategory(parentIdx)}
          onRemove={() => removeCategory(parentIdx)}
          onAddSub={() => { setAddingSubFor(parent.id || parent._tempId); setNewSubName('') }}
          canAddSub={true}
          draggable={editingCatIdx !== parentIdx}
          dragHandlers={dragHandlersCat(parentIdx, { parent_id: null, _parentTempId: null })}
          isDragging={dragCatIdx === parentIdx}
          isDropTarget={dragOverCatIdx === parentIdx}
        />
      ]
      for (const { c: child, i: childIdx } of children) {
        rows.push(
          <CatRow
            key={child.id || child._tempId}
            cat={child}
            idx={childIdx}
            depth={1}
            isEditing={editingCatIdx === childIdx}
            onEdit={() => setEditingCatIdx(childIdx)}
            onEditDone={() => setEditingCatIdx(null)}
            onChange={(field, val) => setCategory(childIdx, field, val)}
            onTranslate={() => translateCategory(childIdx)}
            onRemove={() => removeCategory(childIdx)}
            canAddSub={false}
            draggable={editingCatIdx !== childIdx}
            dragHandlers={dragHandlersCat(childIdx, { parent_id: parent.id || null, _parentTempId: parent.id ? null : parent._tempId })}
            isDragging={dragCatIdx === childIdx}
            isDropTarget={dragOverCatIdx === childIdx}
          />
        )
      }
      if (addingSubFor === (parent.id || parent._tempId)) {
        rows.push(
          <div key={`add-sub-${parent.id || parent._tempId}`} style={{ display: 'flex', gap: 6, marginLeft: 24, padding: '4px 0' }}>
            <input
              autoFocus
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addSubCategory(parent)
                if (e.key === 'Escape') { setAddingSubFor(null); setNewSubName('') }
              }}
              placeholder="Nom de la sous-famille..."
              style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
            />
            <button className="btn btn-primary" onClick={() => addSubCategory(parent)} style={{ fontSize: 11, padding: '4px 10px' }}>OK</button>
            <button className="btn btn-secondary" onClick={() => { setAddingSubFor(null); setNewSubName('') }} style={{ fontSize: 11, padding: '4px 10px' }}>×</button>
          </div>
        )
      }
      return rows
    })
  }

  async function reorderGlobalGroup(from, to, parentId) {
    const isInScope = (c) => (parentId ? c.parent_id === parentId : !c.parent_id)
    const groupWithIdx = globalCats.map((c, i) => ({ c, i })).filter(({ c }) => isInScope(c))
    groupWithIdx.sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
    const fromPos = groupWithIdx.findIndex(x => x.i === from)
    const toPos = groupWithIdx.findIndex(x => x.i === to)
    if (fromPos < 0 || toPos < 0 || fromPos === toPos) return
    const reordered = [...groupWithIdx]
    const [moved] = reordered.splice(fromPos, 1)
    reordered.splice(toPos, 0, moved)
    const updates = reordered.map((x, pos) => ({ id: globalCats[x.i].id, ordre: (pos + 1) * 10 }))
    setGlobalCats(prev => prev.map((c) => {
      const u = updates.find(x => x.id === c.id)
      return u ? { ...c, ordre: u.ordre } : c
    }))
    for (const u of updates) {
      await supabase.from('categories').update({ ordre: u.ordre }).eq('id', u.id)
    }
  }

  function dragHandlersGlobal(idx, parentId) {
    return {
      onDragStart: (e) => { setDragGlobalIdx(idx); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(idx)) } catch {} },
      onDragOver: (e) => {
        if (dragGlobalIdx === null || dragGlobalIdx === idx) return
        const from = globalCats[dragGlobalIdx], to = globalCats[idx]
        if (!from || !to) return
        if ((from.parent_id || null) !== (to.parent_id || null)) return
        e.preventDefault(); setDragOverGlobalIdx(idx)
      },
      onDrop: (e) => {
        e.preventDefault()
        if (dragGlobalIdx !== null && dragGlobalIdx !== idx) reorderGlobalGroup(dragGlobalIdx, idx, parentId)
        setDragGlobalIdx(null); setDragOverGlobalIdx(null)
      },
      onDragEnd: () => { setDragGlobalIdx(null); setDragOverGlobalIdx(null) },
    }
  }

  // ── Rendu arborescence pour familles générales (persist instantané) ──
  function renderGlobalCategoryTree() {
    const parents = globalCats
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.parent_id)
      .sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
    return parents.flatMap(({ c: parent, i: parentIdx }) => {
      const children = globalCats
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.parent_id === parent.id)
        .sort((a, b) => (a.c.ordre ?? 0) - (b.c.ordre ?? 0) || a.c.nom.localeCompare(b.c.nom))
      const rows = [
        <CatRow
          key={parent.id}
          cat={parent}
          idx={parentIdx}
          depth={0}
          isEditing={editingGlobalIdx === parentIdx}
          onEdit={() => setEditingGlobalIdx(parentIdx)}
          onEditDone={() => {
            const c = globalCats[parentIdx]
            if (c?.id) saveGlobalCat(parentIdx, { nom: c.nom, nom_fr: c.nom_fr || null })
            setEditingGlobalIdx(null)
          }}
          onChange={(field, val) => setGlobalCats(prev => prev.map((x, i) => i === parentIdx ? { ...x, [field]: val } : x))}
          onTranslate={() => translateGlobalCat(parentIdx)}
          onRemove={() => removeGlobalCat(parent)}
          onAddSub={() => { setAddingGlobalSubFor(parent.id); setNewGlobalSubName('') }}
          canAddSub={true}
          draggable={editingGlobalIdx !== parentIdx}
          dragHandlers={dragHandlersGlobal(parentIdx, null)}
          isDragging={dragGlobalIdx === parentIdx}
          isDropTarget={dragOverGlobalIdx === parentIdx}
        />
      ]
      for (const { c: child, i: childIdx } of children) {
        rows.push(
          <CatRow
            key={child.id}
            cat={child}
            idx={childIdx}
            depth={1}
            isEditing={editingGlobalIdx === childIdx}
            onEdit={() => setEditingGlobalIdx(childIdx)}
            onEditDone={() => {
              const c = globalCats[childIdx]
              if (c?.id) saveGlobalCat(childIdx, { nom: c.nom, nom_fr: c.nom_fr || null })
              setEditingGlobalIdx(null)
            }}
            onChange={(field, val) => setGlobalCats(prev => prev.map((x, i) => i === childIdx ? { ...x, [field]: val } : x))}
            onTranslate={() => translateGlobalCat(childIdx)}
            onRemove={() => removeGlobalCat(child)}
            canAddSub={false}
            draggable={editingGlobalIdx !== childIdx}
            dragHandlers={dragHandlersGlobal(childIdx, parent.id)}
            isDragging={dragGlobalIdx === childIdx}
            isDropTarget={dragOverGlobalIdx === childIdx}
          />
        )
      }
      if (addingGlobalSubFor === parent.id) {
        rows.push(
          <div key={`add-gsub-${parent.id}`} style={{ display: 'flex', gap: 6, marginLeft: 24, padding: '4px 0' }}>
            <input
              autoFocus
              value={newGlobalSubName}
              onChange={e => setNewGlobalSubName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addGlobalSubCat(parent)
                if (e.key === 'Escape') { setAddingGlobalSubFor(null); setNewGlobalSubName('') }
              }}
              placeholder="Nom de la sous-famille..."
              style={{ flex: 1, padding: '5px 8px', fontSize: 13 }}
            />
            <button className="btn btn-primary" onClick={() => addGlobalSubCat(parent)} style={{ fontSize: 11, padding: '4px 10px' }}>OK</button>
            <button className="btn btn-secondary" onClick={() => { setAddingGlobalSubFor(null); setNewGlobalSubName('') }} style={{ fontSize: 11, padding: '4px 10px' }}>×</button>
          </div>
        )
      }
      return rows
    })
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
                    ['Logo', form.logo_url ? <img src={form.logo_url} alt="logo" style={{ maxHeight: 32, maxWidth: 120 }} /> : null],
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
                    <div className="form-group form-full">
                      <label>Logo</label>
                      <LogoUploader value={form.logo_url} onChange={url => set('logo_url', url)} folder="marques" />
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
                    <button
                      className="btn btn-secondary"
                      onClick={translateAllCategories}
                      disabled={translatingCats || categories.length === 0}
                      style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}
                      title="Traduire les familles sans traduction FR"
                    >
                      <Languages size={13} /> {translatingCats ? '...' : 'Traduire tout'}
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      Aucune famille.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {renderCategoryTree(categories, { parent: null, depth: 0 })}
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
                <button
                  className="btn btn-secondary"
                  onClick={translateAllGlobalCats}
                  disabled={translatingGlobal || globalCats.length === 0}
                  style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                  title="Traduire les familles sans traduction FR"
                >
                  <Languages size={14} /> {translatingGlobal ? '...' : 'Traduire tout'}
                </button>
              </div>

              {globalCats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  <Tag size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p>Aucune famille générale.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {renderGlobalCategoryTree()}
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
