import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

// Upload de logo vers Supabase Storage (bucket "logos", public).
// Le parent fournit { value, onChange, folder } ; on renvoie l'URL publique.
export default function LogoUploader({ value, onChange, folder = 'divers' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return toast('Formats acceptés : images (png, jpg, svg...)', 'error')
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('logos').getPublicUrl(filename)
      onChange(data.publicUrl)
      toast('Logo téléversé', 'success')
    } catch (err) {
      toast('Erreur téléversement : ' + (err?.message || err), 'error')
    }
    setUploading(false)
  }

  function clear() {
    if (!value) return
    onChange('')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 8, border: '1px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0,
      }}>
        {value ? (
          <img src={value} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <ImageIcon size={22} color="var(--text-muted)" />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => inputRef.current?.click()} style={{ fontSize: 12, padding: '5px 10px' }}>
            <Upload size={13} /> {uploading ? 'Envoi...' : value ? 'Remplacer' : 'Téléverser'}
          </button>
          {value && (
            <button type="button" className="btn btn-secondary" onClick={clear} style={{ fontSize: 12, padding: '5px 10px' }} title="Retirer">
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG, SVG (max 2 Mo recommandé)</span>
      </div>
    </div>
  )
}
