import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, Truck, Warehouse, FileText, Building2, ShieldCheck, LogOut } from 'lucide-react'

export default function Sidebar({ user, onLogout }) {
  const location   = useLocation()
  const isAdmin     = user?.role === 'admin'
  const isComptable = user?.role === 'comptable'

  const roleBadge = {
    admin:      { background: 'rgba(90,140,255,0.2)',  color: '#7AACFF' },
    commercial: { background: 'rgba(90,140,255,0.2)',  color: '#7AACFF' },
    comptable:  { background: 'rgba(212,132,10,0.2)',  color: '#F4B942' },
  }

  const navItems = [
    { section: 'Principal', items: [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', show: true }
    ]},
    { section: 'Catalogue', show: !isComptable, items: [
      { to: '/marques',  icon: Building2, label: 'Marques',  show: !isComptable },
      { to: '/produits', icon: Package,   label: 'Produits', show: !isComptable },
    ]},
    { section: 'Commercial', show: !isComptable, items: [
      { to: '/clients',         icon: Users,        label: 'Clients',         show: !isComptable },
      { to: '/commandes-vente', icon: ShoppingCart, label: 'Commandes vente', show: !isComptable },
      { to: '/commandes-achat', icon: Truck,        label: 'Commandes achat', show: !isComptable },
    ]},
    { section: 'Logistique', show: !isComptable, items: [
      { to: '/stock',       icon: Warehouse, label: 'Stock & Lots', show: !isComptable },
      { to: '/expeditions', icon: Truck,     label: 'Expéditions',  show: !isComptable },
    ]},
    { section: 'Finance', show: true, items: [
      { to: '/factures', icon: FileText, label: 'Factures', show: true }
    ]},
    { section: 'Administration', show: isAdmin, items: [
      { to: '/utilisateurs', icon: ShieldCheck, label: 'Utilisateurs & Accès', show: isAdmin }
    ]},
  ]

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>Highway</h1>
        <p>Road to the finest</p>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.filter(s => s.show !== false).map(section => {
          const items = section.items.filter(i => i.show !== false)
          if (!items.length) return null
          return (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {items.map(item => {
                const Icon = item.icon
                const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                return (
                  <NavLink key={item.to} to={item.to} className={`nav-item ${active ? 'active' : ''}`}>
                    <Icon />{item.label}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer user */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.nom}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5, ...roleBadge[user?.role] }}>
            {user?.role?.toUpperCase()}
          </span>
          <button onClick={onLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: 4, fontFamily: 'var(--font)', transition: 'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}>
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}
