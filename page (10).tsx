'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ROLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  owner: { label: 'Dueño', color: '#60a5fa', bg: '#0c1a2e', border: '#1e3a5f' },
  admin: { label: 'Admin', color: '#f97316', bg: '#1c1917', border: '#78350f' },
  empleado: { label: 'Empleado', color: '#9ca3af', bg: '#1f2937', border: '#374151' },
  franquiciado: { label: 'Franquiciado', color: '#4ade80', bg: '#052e16', border: '#166534' },
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*, restaurants(name)').then(({ data }) => {
      setProfiles(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Usuarios</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{profiles.length} usuarios en el sistema</p>
        </div>
        <button style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
          + Invitar usuario
        </button>
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Usuario', 'Local', 'Rol'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {profiles.map((p, i) => {
          const rol = ROLES[p.role] || ROLES.empleado
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < profiles.length - 1 ? '1px solid #1f2937' : 'none'
            }}>
              <div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#374151', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9ca3af', marginRight: '10px', verticalAlign: 'middle' }}>
                  {p.id.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: '14px', color: '#f9fafb' }}>{p.id.slice(0, 8)}...</span>
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{p.restaurants?.name || '—'}</div>
              <div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: rol.bg, color: rol.color, border: `1px solid ${rol.border}` }}>
                  {rol.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
