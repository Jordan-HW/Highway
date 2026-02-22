import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, ShoppingCart, Truck,
  Warehouse, FileText, Building2, ShieldCheck, LogOut
} from 'lucide-react'

export default function Sidebar({ user, onLogout }) {
  const location = useLocation()
  const isAdmin = user?.role === 'admin'
  const isComptable = user?.role === 'comptable'

  const roleBadge = {
    admin:      { background: 'rgba(212,184,240,0.2)', color: '#D4B8F0' },
    commercial: { background: 'rgba(41,128,185,0.2)',  color: '#7EC8E3' },
    comptable:  { background: 'rgba(212,132,10,0.2)',  color: '#F4B942' },
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
        { to: '/marques',  icon: Building2, label: 'Marques',  show: !isComptable },
        { to: '/produits', icon: Package,   label: 'Produits', show: !isComptable },
      ]
    },
    {
      section: 'Commercial',
      show: !isComptable,
      items: [
        { to: '/clients',          icon: Users,         label: 'Clients',          show: !isComptable },
        { to: '/commandes-vente',  icon: ShoppingCart,  label: 'Commandes vente',  show: !isComptable },
        { to: '/commandes-achat',  icon: Truck,         label: 'Commandes achat',  show: !isComptable },
      ]
    },
    {
      section: 'Logistique',
      show: !isComptable,
      items: [
        { to: '/stock',       icon: Warehouse, label: 'Stock & Lots', show: !isComptable },
        { to: '/expeditions', icon: Truck,     label: 'Expéditions',  show: !isComptable },
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
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Icône H stylisée */}
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #8B6BB5, #5A4A7A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <span style={{ color: '#D4B8F0', fontWeight: 900, fontSize: 18, letterSpacing: -1, fontFamily: 'var(--font)' }}>H</span>
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#D4B8F0', letterSpacing: 3, textTransform: 'uppercase' }}>Highway</h1>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 }}>Road to the finest</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
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

      {/* Footer utilisateur */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.nom}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...roleBadge[user?.role] }}>
            {user?.role}
          </span>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 4, transition: 'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            title="Se déconnecter"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}
