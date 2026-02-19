import { useState } from 'react'
import { supabase } from '../lib/supabase'
import highwayLogo from '../assets/highway-logo.png'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return setError('Email et mot de passe requis')
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('mot_de_passe', password)
      .eq('actif', true)
      .single()

    if (err || !data) {
      setLoading(false)
      return setError('Identifiants incorrects ou compte inactif')
    }

    // Mettre à jour dernière connexion
    await supabase.from('admin_users').update({ derniere_connexion: new Date().toISOString() }).eq('id', data.id)

    // Stocker en mémoire
    onLogin(data)
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0014 0%, #1a0a2e 50%, #0d001a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      {/* Decorative stars */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            borderRadius: '50%',
            background: 'white',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.1
          }} />
        ))}
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 400,
        position: 'relative',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src={highwayLogo} alt="Highway" style={{ height: 80, objectFit: 'contain', borderRadius: 12 }} />
        </div>

        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
          Connexion
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 32 }}>
          Accès réservé aux utilisateurs autorisés
        </p>

        {error && (
          <div style={{
            background: 'rgba(192,57,43,0.2)',
            border: '1px solid rgba(192,57,43,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#ff7675',
            fontSize: 13,
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              placeholder="votre@email.fr"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: 'white',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'var(--font)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #ff6ef7, #c44dff, #7b2fff)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: 'var(--font)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.2s'
            }}
          >
            <LogIn size={16} />
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
