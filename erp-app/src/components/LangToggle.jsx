export default function LangToggle({ value, onChange }) {
  const isFr = value === 'fr'
  const btn = (active) => ({
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    transition: 'background 0.15s, color 0.15s',
  })
  return (
    <div
      title="Langue d'affichage"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'var(--surface)',
        height: 28,
      }}>
      <button type="button" style={btn(!isFr)} onClick={() => onChange('vo')}>VO</button>
      <button type="button" style={btn(isFr)} onClick={() => onChange('fr')}>FR</button>
    </div>
  )
}
