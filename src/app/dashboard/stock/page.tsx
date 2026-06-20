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

export default function StockPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [mermaItem, setMermaItem] = useState<any | null>(null)
  const [mermaQty, setMermaQty] = useState('')
  const [mermaMotivo, setMermaMotivo] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data: profile } = await supabase.from('profiles').select('restaurant_id, role').single()
    if (!profile) return
    setRole(profile.role)
    const { data } = await supabase.from('stock').select('*, proveedores(nombre)').eq('restaurant_id', profile.restaurant_id).order('producto')
    setItems(data || [])
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

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Stock</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{items.length} productos</p>
        </div>
        {role === 'admin' && (
          <button style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
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

      {mermaItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '360px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Registrar pérdida</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{mermaItem.producto}</p>

            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Cantidad ({mermaItem.unidad})</label>
            <input type="number" value={mermaQty} onChange={e => setMermaQty(e.target.value)}
              placeholder="0"
              style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '10px 14px', color: '#f9fafb', fontSize: '14px', marginBottom: '12px', outline: 'none' }}
            />

            <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Motivo (opcional)</label>
            <input type="text" value={mermaMotivo} onChange={e => setMermaMotivo(e.target.value)}
              placeholder="Vencimiento, caída, error..."
              style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '10px 14px', color: '#f9fafb', fontSize: '14px', marginBottom: '20px', outline: 'none' }}
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
