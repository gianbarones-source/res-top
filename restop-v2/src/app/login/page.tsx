'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'franquiciado') router.push('/panel')
    else router.push('/dashboard')
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
            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="tu@email.com"
              style={{
                width: '100%', background: '#1f2937', border: '1px solid #374151',
                borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
                fontSize: '14px', outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#1f2937', border: '1px solid #374151',
                borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
                fontSize: '14px', outline: 'none'
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#f87171', background: '#1c0a0a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7f1d1d' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin} disabled={loading}
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
