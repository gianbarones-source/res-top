'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ESTADOS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pendiente: { label: 'Pendiente', color: '#f97316', bg: '#1c1917', border: '#78350f' },
  recibido: { label: 'Recibido', color: '#4ade80', bg: '#052e16', border: '#166534' },
  con_diferencias: { label: 'Con diferencias', color: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}

export default function PedidosPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')
  const [marcando, setMarcando] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')
  const [nuevo, setNuevo] = useState({
    proveedor_id: '', fecha: new Date().toISOString().split('T')[0],
    monto_total: '', descripcion: '', estado: 'pendiente'
  })

  const load = async () => {
    if (!restaurantId) return
    const [{ data }, { data: provs }] = await Promise.all([
      supabase.from('pedidos').select('*, proveedores(nombre)')
        .eq('restaurant_id', restaurantId).order('fecha', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').eq('restaurant_id', restaurantId).order('nombre')
    ])
    setPedidos(data || [])
    setProveedores(provs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [restaurantId])

  const marcarRecibido = async (pedido: any) => {
    setMarcando(pedido.id)
    await supabase.from('pedidos').update({ estado: 'recibido' }).eq('id', pedido.id)
    setMarcando(null)
    load()
  }

  const saveNuevo = async () => {
    setErrorNuevo('')
    if (!nuevo.proveedor_id) { setErrorNuevo('Seleccioná un proveedor.'); return }
    if (!nuevo.fecha) { setErrorNuevo('La fecha es obligatoria.'); return }
    setSaving(true)
    const { error } = await supabase.from('pedidos').insert({
      restaurant_id: restaurantId,
      proveedor_id: nuevo.proveedor_id,
      fecha: nuevo.fecha,
      monto_total: nuevo.monto_total ? parseFloat(nuevo.monto_total) : null,
      descripcion: nuevo.descripcion.trim() || null,
      estado: nuevo.estado
    })
    setSaving(false)
    if (error) { setErrorNuevo('Error al guardar: ' + error.message); return }
    setShowNuevo(false)
    setNuevo({ proveedor_id: '', fecha: new Date().toISOString().split('T')[0], monto_total: '', descripcion: '', estado: 'pendiente' })
    load()
  }

  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)
  const totalMes = pedidos
    .filter(p => new Date(p.fecha).getMonth() === new Date().getMonth())
    .reduce((a, p) => a + (p.monto_total || 0), 0)

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Pedidos</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Gasto del mes: <span style={{ color: '#4ade80', fontWeight: 500 }}>${totalMes.toLocaleString('es-AR')}</span>
          </p>
        </div>
        {role === 'admin' && (
          <button onClick={() => setShowNuevo(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            + Nuevo pedido
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['todos', 'pendiente', 'recibido', 'con_diferencias'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
            background: filtro === f ? '#1f2937' : 'transparent',
            border: `1px solid ${filtro === f ? '#374151' : 'transparent'}`,
            color: filtro === f ? '#f97316' : '#6b7280'
          }}>
            {f === 'todos' ? 'Todos' : ESTADOS[f]?.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 120px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Proveedor', 'Fecha', 'Monto', 'Estado', 'Acciones'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {pedidosFiltrados.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No hay pedidos {filtro !== 'todos' ? `con estado "${ESTADOS[filtro]?.label}"` : ''}
          </div>
        )}

        {pedidosFiltrados.map((pedido, i) => {
          const estado = ESTADOS[pedido.estado] || ESTADOS.pendiente
          return (
            <div key={pedido.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 120px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < pedidosFiltrados.length - 1 ? '1px solid #1f2937' : 'none'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{pedido.proveedores?.nombre || '—'}</div>
                {pedido.descripcion && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{pedido.descripcion}</div>}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                {new Date(pedido.fecha).toLocaleDateString('es-AR')}
              </div>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>
                {pedido.monto_total ? `$${pedido.monto_total.toLocaleString('es-AR')}` : '—'}
              </div>
              <div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: estado.bg, color: estado.color, border: `1px solid ${estado.border}` }}>
                  {estado.label}
                </span>
              </div>
              <div>
                {pedido.estado === 'pendiente' && (
                  <button onClick={() => marcarRecibido(pedido)} disabled={marcando === pedido.id}
                    style={{ fontSize: '12px', padding: '5px 10px', background: '#052e16', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', cursor: 'pointer' }}>
                    {marcando === pedido.id ? '...' : '✓ Recibido'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL NUEVO PEDIDO */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Nuevo pedido</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Registrá un pedido a proveedor</p>

            <label style={labelStyle}>Proveedor *</label>
            <select value={nuevo.proveedor_id} onChange={e => setNuevo({ ...nuevo, proveedor_id: e.target.value })}
              style={{ ...inputStyle, marginBottom: '14px' }}>
              <option value="">Seleccioná un proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={nuevo.fecha} onChange={e => setNuevo({ ...nuevo, fecha: e.target.value })}
                  style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={labelStyle}>Monto total $</label>
                <input type="number" value={nuevo.monto_total} onChange={e => setNuevo({ ...nuevo, monto_total: e.target.value })}
                  placeholder="0" style={{ ...inputStyle }} />
              </div>
            </div>

            <label style={labelStyle}>Estado inicial</label>
            <select value={nuevo.estado} onChange={e => setNuevo({ ...nuevo, estado: e.target.value })}
              style={{ ...inputStyle, marginBottom: '14px' }}>
              <option value="pendiente">Pendiente</option>
              <option value="recibido">Recibido</option>
              <option value="con_diferencias">Con diferencias</option>
            </select>

            <label style={labelStyle}>Descripción / notas</label>
            <input type="text" value={nuevo.descripcion} onChange={e => setNuevo({ ...nuevo, descripcion: e.target.value })}
              placeholder="Ej: Pedido semanal de frutas" style={{ ...inputStyle, marginBottom: '20px' }} />

            {errorNuevo && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {errorNuevo}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowNuevo(false); setErrorNuevo('') }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveNuevo} disabled={saving}
                style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Guardando...' : 'Crear pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
