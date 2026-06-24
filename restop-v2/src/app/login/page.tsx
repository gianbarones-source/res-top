'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    if (!username.trim() || !password) {
      setError('Completá usuario y contraseña')
      setLoading(false)
      return
    }

    // Buscar el email real asociado al username
    const { data: userId, error: fnError } = await supabase
      .rpc('get_user_id_by_username', { p_username: username.trim().toLowerCase() })

    if (fnError || !userId) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Obtener el email a partir del id (via profiles)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single()

    if (!profile?.email) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Login con email real + contraseña
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    })

    if (loginError || !data.user) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    if (profile.role === 'franquiciado') router.push('/panel')
    else router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1f2937', border: '1px solid #374151',
    borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#111827', border: '1px solid #1f2937',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f97316', marginBottom: '4px' }}>Restop</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Sistema de gestión interna</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="tu nombre de usuario"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#f87171', background: '#1c0a0a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7f1d1d' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: loading ? '#7c3010' : '#f97316', color: 'white',
              border: 'none', borderRadius: '8px', padding: '12px',
              fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px', transition: 'background 0.15s'
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
      </div>
    </div>
  )
}
