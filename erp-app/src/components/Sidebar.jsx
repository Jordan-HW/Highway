import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck,
  Warehouse, FileText, Building2, ChevronRight
} from 'lucide-react'

const navItems = [
  {
    section: 'Principal',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    ]
  },
  {
    section: 'Catalogue',
    items: [
      { to: '/fournisseurs', icon: Building2, label: 'Fournisseurs' },
      { to: '/produits', icon: Package, label: 'Produits' },
    ]
  },
  {
    section: 'Commercial',
    items: [
      { to: '/clients', icon: Users, label: 'Clients' },
      { to: '/commandes-vente', icon: ShoppingCart, label: 'Commandes vente' },
      { to: '/commandes-achat', icon: Truck, label: 'Commandes achat' },
    ]
  },
  {
    section: 'Logistique',
    items: [
      { to: '/stock', icon: Warehouse, label: 'Stock & Lots' },
      { to: '/expeditions', icon: Truck, label: 'Expéditions' },
    ]
  },
  {
    section: 'Finance',
    items: [
      { to: '/factures', icon: FileText, label: 'Factures' },
    ]
  }
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>ERP Distribution</h1>
        <p>v1.0</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => {
              const Icon = item.icon
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
