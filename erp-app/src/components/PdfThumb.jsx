import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Worker pdfjs (chargé via Vite ?url)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// Rend la 1ère page d'un PDF dans un <canvas>. Pas de toolbar, pas de scrollbar.
// Props : url (string), maxHeight (px, défaut 160), onClick (handler optionnel)
export default function PdfThumb({ url, maxHeight = 160, onClick, style }) {
  const canvasRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        if (cancelled) return
        const viewport = page.getViewport({ scale: 1 })
        // On scale pour que la hauteur tienne dans maxHeight (avec densité 2x pour netteté Retina)
        const scale = (maxHeight / viewport.height) * 2
        const scaledVp = page.getViewport({ scale })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = scaledVp.width
        canvas.height = scaledVp.height
        canvas.style.width = (scaledVp.width / 2) + 'px'
        canvas.style.height = (scaledVp.height / 2) + 'px'
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport: scaledVp, canvas }).promise
        if (!cancelled) setLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      }
    }
    if (url) render()
    return () => { cancelled = true }
  }, [url, maxHeight])

  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {error ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF illisible</div>
      ) : (
        <canvas ref={canvasRef} style={{ borderRadius: 8, background: '#fff', maxHeight, opacity: loaded ? 1 : 0.3, transition: 'opacity .2s' }} />
      )}
    </div>
  )
}
