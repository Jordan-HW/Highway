import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { ToastContainer } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Marques from './pages/Marques'
import Produits from './pages/Produits'
import Clients from './pages/Clients'
import Stock from './pages/Stock'
import Utilisateurs from './pages/Utilisateurs'
import { CommandesVente, CommandesAchat, Expeditions, Factures } from './pages/Placeholders'

export default function App() {
  const [user, setUser] = useState(null)

  function handleLogin(userData) {
    setUser(userData)
  }

  function handleLogout() {
    setUser(null)
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer />
      </>
    )
  }

  // Vérification des droits selon le rôle
  const isAdmin = user.role === 'admin'
  const isComptable = user.role === 'comptable'
  const isCommercial = user.role === 'commercial'

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* Catalogue — admin + commercial */}
          {!isComptable && (
            <>
              <Route path="/marques" element={<Marques />} />
              <Route path="/produits" element={<Produits />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/commandes-vente" element={<CommandesVente />} />
              <Route path="/commandes-achat" element={<CommandesAchat />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/expeditions" element={<Expeditions />} />
            </>
          )}

          {/* Factures — tous */}
          <Route path="/factures" element={<Factures />} />

          {/* Utilisateurs — admin seulement */}
          {isAdmin && <Route path="/utilisateurs" element={<Utilisateurs />} />}

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  )
}
