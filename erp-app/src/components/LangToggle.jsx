export default function LangToggle({ value, onChange, compact = false }) {
  const isFr = value === 'fr'
  const size = compact ? { pad: '1px 5px', fs: 9, h: 16 } : { pad: '4px 10px', fs: 11, h: 28 }
  const btn = (active) => ({
    padding: size.pad,
    fontSize: size.fs,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
  })
  return (
    <span
      title="Langue d'affichage"
      onClick={e => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        background: 'var(--surface)',
        height: size.h,
        verticalAlign: 'middle',
        marginLeft: 6,
      }}>
      <button type="button" style={btn(!isFr)} onClick={e => { e.stopPropagation(); onChange('vo') }}>VO</button>
      <button type="button" style={btn(isFr)} onClick={e => { e.stopPropagation(); onChange('fr') }}>FR</button>
    </span>
  )
}
