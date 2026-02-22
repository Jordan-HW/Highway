import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return setError('Email et mot de passe requis')
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('admin_users').select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('mot_de_passe', password)
      .eq('actif', true)
      .single()
    setLoading(false)
    if (err || !data) return setError('Identifiants incorrects ou compte inactif')
    await supabase.from('admin_users').update({ derniere_connexion: new Date().toISOString() }).eq('id', data.id)
    onLogin(data)
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8, color: 'white', fontSize: 13,
    outline: 'none', fontFamily: "'Poppins', sans-serif",
    boxSizing: 'border-box', transition: 'border-color .15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2E3240 0%, #3A3F4A 45%, #2A2E38 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Halos lumineux */}
      <div style={{ position:'absolute', top:'-15%', left:'25%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(90,140,255,0.09) 0%, transparent 65%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'-10%', right:'15%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(170,90,255,0.07) 0%, transparent 65%)', pointerEvents:'none' }}/>
      {/* Lignes déco */}
      <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }}/>

      <div style={{
        background: 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22,
        padding: '48px 40px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 40px 80px rgba(0,0,0,0.45)',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: 'white', letterSpacing: -1, lineHeight: 1, marginBottom: 8 }}>
            Highway
          </div>
          <div style={{
            fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 500,
            background: 'linear-gradient(90deg, #5A8CFF, #AA5AFF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Road to the finest
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Connexion</h2>
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12 }}>Accès réservé aux utilisateurs autorisés</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ff8c7a', fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="votre@email.fr" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(90,140,255,0.55)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40 }}
                onFocus={e => e.target.style.borderColor = 'rgba(90,140,255,0.55)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
              />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.32)', padding:0, display:'flex' }}>
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} style={{
            marginTop: 8, width: '100%', padding: '13px',
            background: loading ? 'rgba(90,140,255,0.35)' : 'linear-gradient(135deg, #5A8CFF 0%, #AA5AFF 100%)',
            border: 'none', borderRadius: 9, color: 'white',
            fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: "'Poppins', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(90,140,255,0.35)',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { if(!loading) { e.currentTarget.style.opacity='0.9'; e.currentTarget.style.transform='translateY(-1px)' }}}
          onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(0)' }}>
            <LogIn size={15}/>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
