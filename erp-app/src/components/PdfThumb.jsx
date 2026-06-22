// Affiche un PDF en miniature/zoom via un <iframe> avec params Chrome PDF viewer
// (#toolbar=0&navpanes=0&scrollbar=0) qui masquent la barre d'outils.
// Props : url (string), maxHeight (px, défaut 160), onClick (handler optionnel)
export default function PdfThumb({ url, maxHeight = 160, onClick, style }) {
  if (!url) return null
  const src = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
  return (
    <iframe
      onClick={onClick}
      src={src}
      title="PDF preview"
      style={{
        border: 'none',
        background: '#fff',
        borderRadius: 8,
        width: '100%',
        height: maxHeight,
        pointerEvents: onClick ? 'none' : 'auto',
        ...style,
      }}
    />
  )
}
