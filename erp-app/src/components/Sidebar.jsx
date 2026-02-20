import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck,
  Warehouse, FileText, Building2, ShieldCheck, LogOut
} from 'lucide-react'
import highwayLogo from '../assets/highway-logo.png'

export default function Sidebar({ user, onLogout }) {
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const isComptable = user?.role === 'comptable'

  const roleBadgeStyle = {
    admin: { background: '#fdecea', color: '#c0392b' },
    commercial: { background: '#ebf3fd', color: '#2980b9' },
    comptable: { background: '#fef3e2', color: '#d4840a' },
  }

  const navItems = [
    {
      section: 'Principal',
      items: [{ to: '/', icon: LayoutDashboard, label: 'Tableau de bord', show: true }]
    },
    {
      section: 'Catalogue',
      show: !isComptable,
      items: [
        { to: '/marques', icon: Building2, label: 'Marques', show: !isComptable },
        { to: '/produits', icon: Package, label: 'Produits', show: !isComptable },
      ]
    },
    {
      section: 'Commercial',
      show: !isComptable,
      items: [
        { to: '/clients', icon: Users, label: 'Clients', show: !isComptable },
        { to: '/commandes-vente', icon: ShoppingCart, label: 'Commandes vente', show: !isComptable },
        { to: '/commandes-achat', icon: Truck, label: 'Commandes achat', show: !isComptable },
      ]
    },
    {
      section: 'Logistique',
      show: !isComptable,
      items: [
        { to: '/stock', icon: Warehouse, label: 'Stock & Lots', show: !isComptable },
        { to: '/expeditions', icon: Truck, label: 'Expéditions', show: !isComptable },
      ]
    },
    {
      section: 'Finance',
      show: true,
      items: [{ to: '/factures', icon: FileText, label: 'Factures', show: true }]
    },
    {
      section: 'Administration',
      show: isAdmin,
      items: [{ to: '/utilisateurs', icon: ShieldCheck, label: 'Utilisateurs & Accès', show: isAdmin }]
    }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src={highwayLogo}
          alt="Highway"
          style={{ width: '100%', height: 80, objectFit: 'cover', objectPosition: 'center', borderRadius: 8 }}
        />
      </div>

      <nav className="sidebar-nav">
        {navItems.filter(s => s.show !== false).map(section => {
          const visibleItems = section.items.filter(i => i.show !== false)
          if (visibleItems.length === 0) return null
          return (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {visibleItems.map(item => {
                const Icon = item.icon
                const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                return (
                  <NavLink key={item.to} to={item.to} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <Icon />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.nom}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...roleBadgeStyle[user?.role] }}>
            {user?.role}
          </span>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 4 }}
            title="Se déconnecter"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}
