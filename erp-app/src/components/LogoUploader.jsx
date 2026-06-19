import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'
import { Upload, Trash2, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react'

// Upload vers Supabase Storage (bucket "logos", public).
// Props :
// - value, onChange : URL stockée / setter
// - folder : sous-dossier dans le bucket
// - accept : type MIME accepté (défaut 'image/*'). Si inclut 'application/pdf', PDF accepté.
// - label : texte d'aide (défaut indique PNG/JPG/SVG)
export default function LogoUploader({ value, onChange, folder = 'divers', accept = 'image/*', label }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const acceptsPdf = accept.includes('application/pdf') || accept === '*'
  const acceptsImage = accept.includes('image') || accept === '*'

  async function handleFile(file) {
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (acceptsImage && acceptsPdf && !isImage && !isPdf) {
      return toast('Formats acceptés : images ou PDF', 'error')
    }
    if (!acceptsPdf && !isImage) {
      return toast('Formats acceptés : images (png, jpg, svg...)', 'error')
    }
    if (!acceptsImage && !isPdf) {
      return toast('Format accepté : PDF', 'error')
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || (isPdf ? 'pdf' : 'png')
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: false, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('logos').getPublicUrl(filename)
      onChange(data.publicUrl)
      toast('Fichier téléversé', 'success')
    } catch (err) {
      toast('Erreur téléversement : ' + (err?.message || err), 'error')
    }
    setUploading(false)
  }

  function clear() {
    if (!value) return
    onChange('')
  }

  const isPdfFile = value && /\.pdf(\?|$)/i.test(value)

  const helpLabel = label || (acceptsPdf && acceptsImage
    ? 'PNG, JPG, SVG ou PDF (max 5 Mo recommandé)'
    : acceptsPdf ? 'PDF (max 5 Mo recommandé)'
    : 'PNG, JPG, SVG (max 2 Mo recommandé)')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 8, border: '1px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0,
      }}>
        {value ? (
          isPdfFile ? (
            <a href={value} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'var(--primary)', textDecoration: 'none', fontSize: 10 }} title="Ouvrir le PDF">
              <FileText size={26} />
              <span>PDF</span>
            </a>
          ) : (
            <img src={value} alt="aperçu" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          )
        ) : (
          <ImageIcon size={22} color="var(--text-muted)" />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => inputRef.current?.click()} style={{ fontSize: 12, padding: '5px 10px' }}>
            <Upload size={13} /> {uploading ? 'Envoi...' : value ? 'Remplacer' : 'Téléverser'}
          </button>
          {value && (
            <>
              {isPdfFile && (
                <a href={value} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Ouvrir">
                  <ExternalLink size={13} />
                </a>
              )}
              <button type="button" className="btn btn-secondary" onClick={clear} style={{ fontSize: 12, padding: '5px 10px' }} title="Retirer">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{helpLabel}</span>
      </div>
    </div>
  )
}
