'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function Pill({ status }: { status: 'ok' | 'warn' | 'danger' }) {
  const cfg = {
    ok: { bg: '#052e16', color: '#4ade80', border: '#166534', label: 'OK' },
    warn: { bg: '#1c1917', color: '#f97316', border: '#78350f', label: 'Bajo' },
    danger: { bg: '#1c0a0a', color: '#f87171', border: '#7f1d1d', label: 'Alerta' },
  }[status]
  return (
    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}

export default function StockPage() {
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [mermaItem, setMermaItem] = useState<any | null>(null)
  const [mermaQty, setMermaQty] = useState('')
  const [mermaMotivo, setMermaMotivo] = useState('')
  const [role, setRole] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAgregar, setShowAgregar] = useState(false)
  const [nuevo, setNuevo] = useState({
    producto: '', unidad: 'kg', cantidad_actual: '', cantidad_minima: '', cantidad_objetivo: '',
    proveedor_id: '', es_objetivo_por_dia: false
  })
  const [errorAgregar, setErrorAgregar] = useState('')

  const load = async () => {
    const { data: profile } = await supabase.from('profiles').select('restaurant_id, role').single()
    if (!profile) return
    setRole(profile.role)
    setRestaurantId(profile.restaurant_id)
    const [{ data }, { data: provs }] = await Promise.all([
      supabase.from('stock').select('*, proveedores(nombre)').eq('restaurant_id', profile.restaurant_id).order('producto'),
      supabase.from('proveedores').select('id, nombre').eq('restaurant_id', profile.restaurant_id).order('nombre')
    ])
    setItems(data || [])
    setProveedores(provs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const getStatus = (item: any): 'ok' | 'warn' | 'danger' => {
    if (item.cantidad_actual <= item.cantidad_minima) return 'danger'
    if (item.cantidad_actual <= item.cantidad_minima * 1.3) return 'warn'
    return 'ok'
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    await supabase.from('stock').update({ cantidad_actual: parseFloat(editVal), ultima_actualizacion_manual: new Date().toISOString() }).eq('id', id)
    setEditing(null)
    setSaving(false)
    load()
  }

  const saveMerma = async () => {
    if (!mermaItem || !mermaQty) return
    setSaving(true)
    const { data: profile } = await supabase.from('profiles').select('restaurant_id').single()
    await Promise.all([
      supabase.from('mermas').insert({ restaurant_id: profile?.restaurant_id, stock_id: mermaItem.id, producto: mermaItem.producto, cantidad: parseFloat(mermaQty), unidad: mermaItem.unidad, motivo: mermaMotivo || null }),
      supabase.from('stock').update({ cantidad_actual: Math.max(0, mermaItem.cantidad_actual - parseFloat(mermaQty)) }).eq('id', mermaItem.id)
    ])
    setMermaItem(null); setMermaQty(''); setMermaMotivo('')
    setSaving(false); load()
  }

  const saveNuevo = async () => {
    setErrorAgregar('')
    if (!nuevo.producto.trim()) { setErrorAgregar('El nombre del producto es obligatorio.'); return }
    if (!nuevo.cantidad_actual || !nuevo.cantidad_minima || !nuevo.cantidad_objetivo) {
      setErrorAgregar('Completá las cantidades.'); return
    }
    setSaving(true)
    const { error } = await supabase.from('stock').insert({
      restaurant_id: restaurantId,
      producto: nuevo.producto.trim(),
      unidad: nuevo.unidad,
      cantidad_actual: parseFloat(nuevo.cantidad_actual),
      cantidad_minima: parseFloat(nuevo.cantidad_minima),
      cantidad_objetivo: parseFloat(nuevo.cantidad_objetivo),
      proveedor_id: nuevo.proveedor_id || null,
      es_objetivo_por_dia: nuevo.es_objetivo_por_dia,
      ultima_actualizacion_manual: new Date().toISOString()
    })
    setSaving(false)
    if (error) { setErrorAgregar('Error al guardar: ' + error.message); return }
    setShowAgregar(false)
    setNuevo({ producto: '', unidad: 'kg', cantidad_actual: '', cantidad_minima: '', cantidad_objetivo: '', proveedor_id: '', es_objetivo_por_dia: false })
    load()
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Stock</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{items.length} productos</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => setShowAgregar(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            + Agregar producto
          </button>
        )}
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 120px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Producto', 'Actual', 'Mínimo', 'Objetivo', 'Estado', 'Acciones'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No hay productos en stock. {role === 'admin' && 'Agregá el primero con el botón arriba.'}
          </div>
        )}

        {items.map((item, i) => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 120px',
            padding: '14px 20px', alignItems: 'center',
            borderBottom: i < items.length - 1 ? '1px solid #1f2937' : 'none',
            background: getStatus(item) === 'danger' ? '#160a0a' : 'transparent',
            transition: 'background 0.15s'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.producto}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.proveedores?.nombre || '—'}</div>
            </div>

            <div>
              {editing === item.id ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                    style={{ width: '60px', background: '#374151', border: '1px solid #4b5563', borderRadius: '6px', padding: '4px 8px', color: '#f9fafb', fontSize: '13px' }}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(item.id)} style={{ background: '#f97316', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'white', fontSize: '12px', cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '4px', padding: '4px 8px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <span style={{ fontSize: '14px', color: '#f9fafb' }}>{item.cantidad_actual} {item.unidad}</span>
              )}
            </div>

            <div style={{ fontSize: '14px', color: '#6b7280' }}>{item.cantidad_minima} {item.unidad}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{item.cantidad_objetivo} {item.unidad}</div>
            <div><Pill status={getStatus(item)} /></div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { setEditing(item.id); setEditVal(String(item.cantidad_actual)) }}
                style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => setMermaItem(item)}
                style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}>
                Merma
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AGREGAR PRODUCTO */}
      {showAgregar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Agregar producto</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Nuevo ítem al inventario de stock</p>

            <label style={labelStyle}>Nombre del producto *</label>
            <input value={nuevo.producto} onChange={e => setNuevo({ ...nuevo, producto: e.target.value })}
              placeholder="Ej: Harina 000" style={{ ...inputStyle, marginBottom: '14px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Unidad *</label>
                <select value={nuevo.unidad} onChange={e => setNuevo({ ...nuevo, unidad: e.target.value })}
                  style={{ ...inputStyle }}>
                  {['kg', 'g', 'lt', 'ml', 'un', 'caja', 'bolsa', 'paquete'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <select value={nuevo.proveedor_id} onChange={e => setNuevo({ ...nuevo, proveedor_id: e.target.value })}
                  style={{ ...inputStyle }}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Stock actual *</label>
                <input type="number" value={nuevo.cantidad_actual} onChange={e => setNuevo({ ...nuevo, cantidad_actual: e.target.value })}
                  placeholder="0" style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={labelStyle}>Mínimo *</label>
                <input type="number" value={nuevo.cantidad_minima} onChange={e => setNuevo({ ...nuevo, cantidad_minima: e.target.value })}
                  placeholder="0" style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={labelStyle}>Objetivo *</label>
                <input type="number" value={nuevo.cantidad_objetivo} onChange={e => setNuevo({ ...nuevo, cantidad_objetivo: e.target.value })}
                  placeholder="0" style={{ ...inputStyle }} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={nuevo.es_objetivo_por_dia}
                onChange={e => setNuevo({ ...nuevo, es_objetivo_por_dia: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#f97316' }} />
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>Objetivo es por día (para calcular pedidos)</span>
            </label>

            {errorAgregar && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {errorAgregar}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAgregar(false); setErrorAgregar('') }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveNuevo} disabled={saving}
                style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Guardando...' : 'Agregar producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MERMA */}
      {mermaItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '360px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Registrar pérdida</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{mermaItem.producto}</p>

            <label style={labelStyle}>Cantidad ({mermaItem.unidad})</label>
            <input type="number" value={mermaQty} onChange={e => setMermaQty(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, marginBottom: '12px' }}
            />

            <label style={labelStyle}>Motivo (opcional)</label>
            <input type="text" value={mermaMotivo} onChange={e => setMermaMotivo(e.target.value)}
              placeholder="Vencimiento, caída, error..."
              style={{ ...inputStyle, marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMermaItem(null)}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveMerma} disabled={saving}
                style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Guardando...' : 'Registrar pérdida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
