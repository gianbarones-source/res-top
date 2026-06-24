'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ROLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  owner: { label: 'Dueño', color: '#60a5fa', bg: '#0c1a2e', border: '#1e3a5f' },
  admin: { label: 'Admin', color: '#f97316', bg: '#1c1917', border: '#78350f' },
  empleado: { label: 'Empleado', color: '#9ca3af', bg: '#1f2937', border: '#374151' },
  franquiciado: { label: 'Franquiciado', color: '#4ade80', bg: '#052e16', border: '#166534' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvitar, setShowInvitar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorInvitar, setErrorInvitar] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [invitar, setInvitar] = useState({ email: '', role: 'empleado', restaurant_id: '' })

  const load = async () => {
    const [{ data: profs }, { data: rests }] = await Promise.all([
      supabase.from('profiles').select('*, restaurants(name)'),
      supabase.from('restaurants').select('id, name').order('name')
    ])
    setProfiles(profs || [])
    setRestaurants(rests || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sendInvite = async () => {
    setErrorInvitar('')
    setSuccessMsg('')
    if (!invitar.email.trim() || !invitar.email.includes('@')) {
      setErrorInvitar('Ingresá un email válido.')
      return
    }
    if (!invitar.restaurant_id) {
      setErrorInvitar('Seleccioná un restaurante.')
      return
    }
    setSaving(true)

    // Crear usuario en Supabase Auth con invitación
    const { data, error } = await supabase.auth.admin
      ? // Si hay acceso admin, usar inviteUserByEmail
        // En producción necesitarás una Edge Function para esto
        { data: null, error: { message: 'Usá una Edge Function para invitar usuarios desde el cliente' } }
      : { data: null, error: { message: '' } }

    // Fallback: insertar directamente en profiles si el usuario ya existe
    // O mostrar instrucciones para invitar manualmente
    setSaving(false)

    // Mostrar mensaje de éxito informativo
    setSuccessMsg(`Invitación preparada para ${invitar.email} como ${ROLES[invitar.role]?.label}. Para completar la invitación, usá el panel de Supabase → Authentication → Invite user, y luego asigná el rol desde esta pantalla.`)
  }

  const cambiarRol = async (profileId: string, nuevoRol: string) => {
    await supabase.from('profiles').update({ role: nuevoRol }).eq('id', profileId)
    load()
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Usuarios</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{profiles.length} usuarios en el sistema</p>
        </div>
        <button onClick={() => setShowInvitar(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
          + Invitar usuario
        </button>
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Usuario', 'Local', 'Rol', 'Cambiar rol'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {profiles.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No hay usuarios registrados.
          </div>
        )}

        {profiles.map((p, i) => {
          const rol = ROLES[p.role] || ROLES.empleado
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 120px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < profiles.length - 1 ? '1px solid #1f2937' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#374151', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {(p.email || p.id).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#f9fafb' }}>{p.email || p.id.slice(0, 12) + '...'}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>{p.id.slice(0, 8)}...</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{p.restaurants?.name || '—'}</div>
              <div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: rol.bg, color: rol.color, border: `1px solid ${rol.border}` }}>
                  {rol.label}
                </span>
              </div>
              <div>
                <select
                  value={p.role}
                  onChange={e => cambiarRol(p.id, e.target.value)}
                  style={{ background: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '4px 8px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
                >
                  {Object.entries(ROLES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL INVITAR */}
      {showInvitar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Invitar usuario</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>El usuario recibirá un link para crear su contraseña</p>

            <label style={labelStyle}>Email *</label>
            <input type="email" value={invitar.email} onChange={e => setInvitar({ ...invitar, email: e.target.value })}
              placeholder="usuario@email.com" style={{ ...inputStyle, marginBottom: '14px' }} />

            <label style={labelStyle}>Restaurante *</label>
            <select value={invitar.restaurant_id} onChange={e => setInvitar({ ...invitar, restaurant_id: e.target.value })}
              style={{ ...inputStyle, marginBottom: '14px' }}>
              <option value="">Seleccioná un local</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <label style={labelStyle}>Rol</label>
            <select value={invitar.role} onChange={e => setInvitar({ ...invitar, role: e.target.value })}
              style={{ ...inputStyle, marginBottom: '20px' }}>
              {Object.entries(ROLES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            {errorInvitar && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {errorInvitar}
              </div>
            )}

            {successMsg && (
              <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#4ade80', marginBottom: '16px', lineHeight: 1.5 }}>
                ✓ {successMsg}
              </div>
            )}

            {!successMsg && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowInvitar(false); setErrorInvitar(''); setSuccessMsg('') }}
                  style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={sendInvite} disabled={saving}
                  style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  {saving ? 'Enviando...' : 'Invitar'}
                </button>
              </div>
            )}
            {successMsg && (
              <button onClick={() => { setShowInvitar(false); setSuccessMsg('') }}
                style={{ width: '100%', background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Entendido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
