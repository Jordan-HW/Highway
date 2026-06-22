import { useEffect, useRef, useState } from 'react'

// Parse "GRAND 50×80mm" → {w: 50, h: 80}
function parseFormat(fmt) {
  if (!fmt) return { w: 50, h: 80 }
  const m = fmt.match(/(\d+)\s*[×xX]\s*(\d+)/)
  if (m) return { w: parseFloat(m[1]), h: parseFloat(m[2]) }
  return { w: 50, h: 80 }
}

// Simulation de pose de l'étiquette FR sur le packaging.
// Échelle réelle : on connaît les dimensions de l'étiquette (mm) et la largeur du packaging (mm).
// L'utilisateur drag l'étiquette à la bonne position, on sauve x/y en mm.
//
// Props :
//   packagingUrl (string)         URL PNG du packaging à afficher en fond
//   stickerUrl   (string)         URL PNG de l'étiquette FR à superposer
//   stickerFormat (string)        ex "GRAND 50×80mm" — parsé pour les dimensions
//   packagingWidthMm (number)     largeur réelle visible du packaging, saisie par l'utilisateur
//   posXmm, posYmm  (number|null) position sauvegardée (coin haut-gauche de l'étiquette, depuis bord haut-gauche packaging)
//   onPosChange (fn(x,y))         callback débouncé quand l'utilisateur lâche le drag
export default function StickerSimulation({
  packagingUrl, stickerUrl, stickerFormat,
  packagingWidthMm, posXmm, posYmm, onPosChange,
}) {
  const wrapRef = useRef(null)
  const dragState = useRef(null)
  const [displayWidth, setDisplayWidth] = useState(0)
  const [pkgAspect, setPkgAspect] = useState(1)
  const [pos, setPos] = useState({ x: posXmm ?? 10, y: posYmm ?? 10 })

  useEffect(() => { setPos({ x: posXmm ?? 10, y: posYmm ?? 10 }) }, [posXmm, posYmm])

  // Mesure du conteneur et de l'image
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    // Mesure initiale immédiate (offsetWidth est dispo après mount)
    setDisplayWidth(el.offsetWidth)
    // Plus ResizeObserver pour les changements de taille (ex: resize fenêtre)
    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        for (const e of entries) {
          const w = e.contentRect?.width || e.target?.offsetWidth || 0
          if (w > 0) setDisplayWidth(w)
        }
      })
      ro.observe(el)
    }
    // Fallback : remesure après chargement de l'image packaging
    window.addEventListener('resize', () => setDisplayWidth(el.offsetWidth))
    return () => {
      ro?.disconnect()
    }
  }, [])

  const sticker = parseFormat(stickerFormat)
  const pxPerMm = packagingWidthMm > 0 ? displayWidth / packagingWidthMm : 0
  const stickerWpx = sticker.w * pxPerMm
  const stickerHpx = sticker.h * pxPerMm
  const displayHeight = displayWidth / pkgAspect

  function onPointerDown(e) {
    e.preventDefault()
    const rect = wrapRef.current.getBoundingClientRect()
    dragState.current = {
      startMouseX: e.clientX, startMouseY: e.clientY,
      startPosX: pos.x, startPosY: pos.y,
      rect,
    }
    e.target.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (!dragState.current) return
    const dx_px = e.clientX - dragState.current.startMouseX
    const dy_px = e.clientY - dragState.current.startMouseY
    const dx_mm = dx_px / pxPerMm
    const dy_mm = dy_px / pxPerMm
    let nx = dragState.current.startPosX + dx_mm
    let ny = dragState.current.startPosY + dy_mm
    // Clamp dans la zone packaging
    const maxX = packagingWidthMm - sticker.w
    const maxY = (displayHeight / pxPerMm) - sticker.h
    nx = Math.max(0, Math.min(maxX, nx))
    ny = Math.max(0, Math.min(maxY, ny))
    setPos({ x: nx, y: ny })
  }
  function onPointerUp() {
    if (!dragState.current) return
    dragState.current = null
    onPosChange?.(Math.round(pos.x * 10) / 10, Math.round(pos.y * 10) / 10)
  }

  if (!packagingUrl || !stickerUrl) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Packaging VO et Étiquette FR requis pour la simulation.</div>
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Glisse l'étiquette pour trouver le bon emplacement. L'échelle respecte les dimensions saisies.
      </div>
      <div
        ref={wrapRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <img
          src={packagingUrl}
          alt="Packaging"
          onLoad={e => setPkgAspect(e.target.naturalWidth / e.target.naturalHeight)}
          style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
        />
        {pxPerMm > 0 && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: 'absolute',
              left: pos.x * pxPerMm,
              top: pos.y * pxPerMm,
              width: stickerWpx,
              height: stickerHpx,
              cursor: dragState.current ? 'grabbing' : 'grab',
              boxShadow: '0 0 0 2px rgba(255,80,80,0.9), 0 4px 12px rgba(0,0,0,0.4)',
              borderRadius: 2,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <img
              src={stickerUrl}
              alt="Étiquette FR"
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            />
          </div>
        )}
      </div>
      {pxPerMm > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Échelle&nbsp;: <b>{(pxPerMm).toFixed(2)} px/mm</b></span>
          <span>Étiquette&nbsp;: <b>{sticker.w}×{sticker.h} mm</b></span>
          <span>Position&nbsp;: <b>x={pos.x.toFixed(0)} mm · y={pos.y.toFixed(0)} mm</b></span>
        </div>
      )}
    </div>
  )
}
