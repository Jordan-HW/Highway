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

const SESSION_KEY = 'highway_user'

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  function handleLogin(userData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
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

  const isAdmin = user.role === 'admin'
  const isComptable = user.role === 'comptable'

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/factures" element={<Factures />} />
          {isAdmin && <Route path="/utilisateurs" element={<Utilisateurs />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  )
}
