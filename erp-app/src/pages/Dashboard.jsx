import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Package, Users, ShoppingCart, Warehouse, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    produits: 0,
    clients: 0,
    fournisseurs: 0,
    commandesEnCours: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [produits, clients, fournisseurs, commandes] = await Promise.all([
        supabase.from('produits').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('fournisseurs').select('id', { count: 'exact', head: true }),
        supabase.from('commandes_vente').select('id', { count: 'exact', head: true }).not('statut', 'eq', 'facturée'),
      ])
      setStats({
        produits: produits.count || 0,
        clients: clients.count || 0,
        fournisseurs: fournisseurs.count || 0,
        commandesEnCours: commandes.count || 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div className="loading">Chargement...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>Vue d'ensemble de votre activité</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <StatCard icon={Package} label="Produits actifs" value={stats.produits} color="#2D5A3D" />
          <StatCard icon={Users} label="Clients" value={stats.clients} color="#2980B9" />
          <StatCard icon={TrendingUp} label="Fournisseurs" value={stats.fournisseurs} color="#8E44AD" />
          <StatCard icon={ShoppingCart} label="Commandes en cours" value={stats.commandesEnCours} color="#D4840A" />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Bienvenue sur votre ERP</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Commencez par créer vos <strong>fournisseurs</strong>, puis ajoutez vos <strong>produits</strong>.
              Ensuite, créez vos <strong>clients</strong> et commencez à saisir des <strong>commandes</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <a href="/fournisseurs" className="btn btn-primary">+ Ajouter un fournisseur</a>
              <a href="/produits" className="btn btn-secondary">+ Ajouter un produit</a>
              <a href="/clients" className="btn btn-secondary">+ Ajouter un client</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-label">{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  )
}
