import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, Users, ShoppingCart, Truck, Warehouse, FileText, Building2, ShieldCheck, LogOut, Menu, X } from 'lucide-react'

export default function Sidebar({ user, onLogout }) {
  const location    = useLocation()
  const isAdmin     = user?.role === 'admin'
  const isComptable = user?.role === 'comptable'
  const [open, setOpen] = useState(false)

  // Fermer le menu à chaque changement de page
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Bloquer le scroll body quand menu ouvert sur mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const roleBadge = {
    admin:      { background: 'rgba(90,140,255,0.2)', color: '#7AACFF' },
    commercial: { background: 'rgba(90,140,255,0.2)', color: '#7AACFF' },
    comptable:  { background: 'rgba(212,132,10,0.2)', color: '#F4B942' },
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

  const font = "'Poppins', sans-serif"

  const SidebarContent = () => (
    <aside style={{
      width: 240, background: '#373C4B',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: 'white', letterSpacing: -0.5, lineHeight: 1, marginBottom: 4, fontFamily: font }}>
            Highway
          </div>
          <div style={{ fontSize: 8, fontWeight: 500, letterSpacing: 4, textTransform: 'uppercase', fontFamily: font, background: 'linear-gradient(90deg, #5A8CFF, #AA5AFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Road to the finest
          </div>
        </div>
        {/* Bouton fermer visible uniquement sur mobile */}
        <button onClick={() => setOpen(false)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }} className="sidebar-close">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {navItems.filter(s => s.show !== false).map(section => {
          const items = section.items.filter(i => i.show !== false)
          if (!items.length) return null
          return (
            <div key={section.section} style={{ marginBottom: 2 }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 20px 4px', fontFamily: font }}>
                {section.section}
              </div>
              {items.map(item => {
                const Icon = item.icon
                const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                return (
                  <NavLink key={item.to} to={item.to} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: active ? '9px 20px 9px 18px' : '9px 20px',
                    color: active ? '#FFFFFF' : 'rgba(255,255,255,0.50)',
                    textDecoration: 'none', fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    background: active ? 'rgba(90,140,255,0.15)' : 'transparent',
                    borderLeft: active ? '2px solid #5A8CFF' : '2px solid transparent',
                    transition: 'all 0.15s', fontFamily: font,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color='rgba(255,255,255,0.85)'; e.currentTarget.style.background='rgba(255,255,255,0.05)' }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color='rgba(255,255,255,0.50)'; e.currentTarget.style.background='transparent' }}}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer user */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font }}>{user?.nom}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font }}>{user?.email}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5, fontFamily: font, ...roleBadge[user?.role] }}>
            {user?.role?.toUpperCase()}
          </span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: 4, fontFamily: font, transition: 'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.28)'}>
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop : sidebar fixe ─────────────────────────────── */}
      <div style={{ display: 'none' }} className="sidebar-desktop">
        <div style={{ width: 240, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
          <SidebarContent />
        </div>
      </div>

      {/* ── Mobile : barre top + drawer ───────────────────────── */}
      <div className="sidebar-mobile" style={{ display: 'none' }}>
        {/* Topbar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#373C4B', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'white', fontFamily: font }}>Highway</span>
          </div>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', padding: 6 }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Overlay */}
        {open && (
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
        )}

        {/* Drawer */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 400,
          width: 260, transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <SidebarContent />
        </div>
      </div>

      {/* ── CSS responsive ────────────────────────────────────── */}
      <style>{`
        @media (min-width: 768px) {
          .sidebar-desktop { display: block !important; }
          .sidebar-mobile  { display: none   !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none   !important; }
          .sidebar-mobile  { display: block  !important; }
          .main-content    { margin-left: 0  !important; padding-top: 56px; }
        }
      `}</style>
    </>
  )
}
