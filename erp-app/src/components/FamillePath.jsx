import { displayCategorieNom } from '../lib/i18n'

// Affiche le chemin famille/sous-famille de manière cohérente partout dans l'ERP.
// Badge gris façon pastille, parent en texte muted, sous-famille en texte normal,
// séparateur ›. Si pas de famille, rend un tiret.
export default function FamillePath({ categorieId, categories, lang = 'vo', empty = '—' }) {
  const cat = categorieId ? (categories || []).find(c => c.id === categorieId) : null
  if (!cat) return <span style={{ color: 'var(--text-muted)' }}>{empty}</span>
  const parent = cat.parent_id ? (categories || []).find(c => c.id === cat.parent_id) : null
  const self = displayCategorieNom(cat, lang)
  return (
    <span className="badge badge-gray" style={{ whiteSpace: 'nowrap' }}>
      {parent && <span style={{ color: 'var(--text-muted)' }}>{displayCategorieNom(parent, lang)} › </span>}
      {self}
    </span>
  )
}
