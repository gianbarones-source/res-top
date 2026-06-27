'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ROLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  
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
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [nuevo, setNuevo] = useState({
    nombre: '',
    username: '',
    email: '',
    password: '',
    role: 'empleado',
    restaurant_id: '',
  })

  // Modal editar usuario
  const [showEditar, setShowEditar] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [editRole, setEditRole] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editRestaurantId, setEditRestaurantId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [errorEdit, setErrorEdit] = useState('')
  const [successEdit, setSuccessEdit] = useState('')

  // Confirmar eliminar
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  const load = async () => {
    const [{ data: profs }, { data: rests }] = await Promise.all([
      supabase.from('profiles').select('*, restaurants(name)').order('nombre'),
      supabase.from('restaurants').select('id, name').order('name')
    ])
    setProfiles(profs || [])
    setRestaurants(rests || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Generar username automático a partir del nombre
  const generarUsername = (nombre: string) => {
    return nombre.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/\s+/g, '.') // espacios → puntos
      .replace(/[^a-z0-9.]/g, '') // solo alfanuméricos y puntos
  }

  const handleNombreChange = (nombre: string) => {
    setNuevo(prev => ({
      ...prev,
      nombre,
      username: generarUsername(nombre),
      email: `${generarUsername(nombre)}@restop.com`,
    }))
  }

  const crearUsuario = async () => {
    setError('')
    setSuccessMsg('')
    if (!nuevo.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!nuevo.username.trim()) { setError('El nombre de usuario es obligatorio.'); return }
    if (!nuevo.password || nuevo.password.length < 4) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (!nuevo.restaurant_id) { setError('Seleccioná un restaurante.'); return }

    setSaving(true)

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin
      ? { data: null, error: null } // no disponible desde cliente
      : { data: null, error: null }

    // Como no podemos usar auth.admin desde el cliente,
    // usamos signUp con el email interno generado
    const emailInterno = `${nuevo.username.trim().toLowerCase()}@restop.com`

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: emailInterno,
      password: nuevo.password,
      options: {
        data: {
          nombre: nuevo.nombre,
          username: nuevo.username.trim().toLowerCase(),
        }
      }
    })

    if (signUpError || !signUpData.user) {
      setError('Error al crear usuario: ' + (signUpError?.message || 'desconocido'))
      setSaving(false)
      return
    }

    // 2. Actualizar el profile generado automáticamente
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: signUpData.user.id,
      nombre: nuevo.nombre.trim(),
      username: nuevo.username.trim().toLowerCase(),
      email: emailInterno,
      role: nuevo.role,
      restaurant_id: nuevo.restaurant_id,
    })

    setSaving(false)

    if (profileError) {
      setError('Usuario creado pero error al guardar perfil: ' + profileError.message)
      return
    }

    setSuccessMsg(`✓ Usuario "${nuevo.username}" creado correctamente. Ya puede iniciar sesión.`)
    setNuevo({ nombre: '', username: '', email: '', password: '', role: 'empleado', restaurant_id: '' })
    load()
  }

  const abrirEditar = (p: any) => {
    setEditando(p)
    setEditUsername(p.username || '')
    setEditNombre(p.nombre || '')
    setEditRole(p.role || 'empleado')
    setEditRestaurantId(p.restaurant_id || '')
    setErrorEdit('')
    setSuccessEdit('')
    setShowEditar(true)
  }

  const eliminarUsuario = async (id: string) => {
    setSaving(true)
    await supabase.from('profiles').delete().eq('id', id)
    setSaving(false)
    setConfirmEliminar(null)
    load()
  }

  const guardarEdicion = async () => {
    setErrorEdit('')
    setSavingEdit(true)

    const updates: any = {
      role: editRole,
      nombre: editNombre.trim(),
      username: editUsername.trim().toLowerCase(),
      restaurant_id: editRestaurantId || null,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', editando.id)

    if (profileError) {
      setErrorEdit('Error al guardar: ' + profileError.message)
      setSavingEdit(false)
      return
    }

    setSuccessEdit('✓ Perfil actualizado correctamente.')
    setSavingEdit(false)
    load()
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
        <button onClick={() => { setShowNuevo(true); setError(''); setSuccessMsg('') }}
          style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
          + Crear usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Usuario', 'Nombre', 'Local', 'Rol', 'Editar'].map(h => (
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
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < profiles.length - 1 ? '1px solid #1f2937' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#374151', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                  {(p.username || p.nombre || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#f9fafb' }}>{p.username || '—'}</div>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>{p.email || ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{p.nombre || '—'}</div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{p.restaurants?.name || '—'}</div>
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
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => abrirEditar(p)}
                  style={{ fontSize: '12px', padding: '5px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f97316', cursor: 'pointer' }}>
                  Editar
                </button>
                <button onClick={() => setConfirmEliminar(p)}
                  style={{ fontSize: '12px', padding: '5px 8px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}>
                  🗑
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL CREAR USUARIO */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Crear usuario</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>El empleado iniciará sesión con su usuario y contraseña</p>

            <label style={labelStyle}>Nombre completo *</label>
            <input value={nuevo.nombre} onChange={e => handleNombreChange(e.target.value)}
              placeholder="Ej: Juan Pérez" style={{ ...inputStyle, marginBottom: '14px' }} />

            <label style={labelStyle}>Nombre de usuario *</label>
            <input value={nuevo.username}
              onChange={e => setNuevo({ ...nuevo, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
              placeholder="juan.perez" style={{ ...inputStyle, marginBottom: '4px' }}
              autoCapitalize="none" autoCorrect="off" />
            <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '14px' }}>Se genera automático desde el nombre. Con esto iniciará sesión.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Contraseña *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={nuevo.password}
                    onChange={e => setNuevo({ ...nuevo, password: e.target.value })}
                    placeholder="4 números"
                    style={{ ...inputStyle, paddingRight: '40px' }}
                  />
                  <button onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px' }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rol</label>
                <select value={nuevo.role} onChange={e => setNuevo({ ...nuevo, role: e.target.value })}
                  style={{ ...inputStyle }}>
                  {Object.entries(ROLES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <label style={labelStyle}>Restaurante *</label>
            <select value={nuevo.restaurant_id} onChange={e => setNuevo({ ...nuevo, restaurant_id: e.target.value })}
              style={{ ...inputStyle, marginBottom: '20px' }}>
              <option value="">Seleccioná un local</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {/* Preview credenciales */}
            {nuevo.username && (
              <div style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#60a5fa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Credenciales de acceso</div>
                <div style={{ fontSize: '13px', color: '#e5e7eb' }}>Usuario: <span style={{ color: '#f97316' }}>{nuevo.username}</span></div>
                <div style={{ fontSize: '13px', color: '#e5e7eb', marginTop: '2px' }}>Contraseña: <span style={{ color: '#f97316' }}>{nuevo.password ? '••••••' : '—'}</span></div>
              </div>
            )}

            {error && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#4ade80', marginBottom: '16px', lineHeight: 1.5 }}>
                {successMsg}
              </div>
            )}

            {!successMsg ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowNuevo(false); setError('') }}
                  style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={crearUsuario} disabled={saving}
                  style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowNuevo(false); setSuccessMsg('') }}
                style={{ width: '100%', background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Listo
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUARIO */}
      {showEditar && editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Editar usuario</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{editando.username || editando.email}</p>

            <label style={labelStyle}>Nombre completo</label>
            <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
              style={{ ...inputStyle, marginBottom: '14px' }} />

            <label style={labelStyle}>Nombre de usuario</label>
            <input value={editUsername}
              onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              style={{ ...inputStyle, marginBottom: '14px' }}
              autoCapitalize="none" autoCorrect="off" />

            <label style={labelStyle}>Rol</label>
            <select value={editRole} onChange={e => setEditRole(e.target.value)}
              style={{ ...inputStyle, marginBottom: '14px' }}>
              {Object.entries(ROLES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <label style={labelStyle}>Restaurante</label>
            <select value={editRestaurantId} onChange={e => setEditRestaurantId(e.target.value)}
              style={{ ...inputStyle, marginBottom: '20px' }}>
              <option value="">Sin restaurante</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {errorEdit && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {errorEdit}
              </div>
            )}

            {successEdit && (
              <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#4ade80', marginBottom: '16px', lineHeight: 1.5 }}>
                {successEdit}
              </div>
            )}

            {!successEdit ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowEditar(false)}
                  style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardarEdicion} disabled={savingEdit}
                  style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowEditar(false); setSuccessEdit('') }}
                style={{ width: '100%', background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Listo
              </button>
            )}
          </div>
        </div>
      )}
      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar usuario?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
              Vas a eliminar a <strong style={{ color: '#f9fafb' }}>{confirmEliminar.nombre || confirmEliminar.username}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminarUsuario(confirmEliminar.id)} disabled={saving}
                style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
