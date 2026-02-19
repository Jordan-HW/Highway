import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { ToastContainer } from './components/Toast'
import Dashboard from './pages/Dashboard'
import Fournisseurs from './pages/Fournisseurs'
import Produits from './pages/Produits'
import Clients from './pages/Clients'
import Stock from './pages/Stock'
import { CommandesVente, CommandesAchat, Expeditions, Factures } from './pages/Placeholders'

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fournisseurs" element={<Fournisseurs />} />
          <Route path="/produits" element={<Produits />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/commandes-vente" element={<CommandesVente />} />
          <Route path="/commandes-achat" element={<CommandesAchat />} />
          <Route path="/expeditions" element={<Expeditions />} />
          <Route path="/factures" element={<Factures />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  )
}
