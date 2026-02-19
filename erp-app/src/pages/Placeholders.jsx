import { ShoppingCart, Truck, FileText } from 'lucide-react'

function PlaceholderPage({ icon: Icon, title, description, color }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <Icon size={40} color={color} style={{ opacity: 1 }} />
              <p style={{ marginTop: 12, fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</p>
              <p style={{ marginTop: 6, color: 'var(--text-muted)' }}>Cette section sera disponible dans la prochaine version.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommandesVente() {
  return <PlaceholderPage icon={ShoppingCart} title="Commandes Vente" description="Gestion des commandes clients" color="#D4840A" />
}

export function CommandesAchat() {
  return <PlaceholderPage icon={Truck} title="Commandes Achat" description="Gestion des commandes fournisseurs" color="#8E44AD" />
}

export function Expeditions() {
  return <PlaceholderPage icon={Truck} title="Expéditions" description="Suivi des expéditions" color="#2980B9" />
}

export function Factures() {
  return <PlaceholderPage icon={FileText} title="Factures" description="Gestion de la facturation" color="#27AE60" />
}
