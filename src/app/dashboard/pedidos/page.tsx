'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ESTADOS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pendiente: { label: 'Pendiente', color: '#f97316', bg: '#1c1917', border: '#78350f' },
  recibido: { label: 'Recibido', color: '#4ade80', bg: '#052e16', border: '#166534' },
  con_diferencias: { label: 'Con diferencias', color: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' },
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')
  const [role, setRole] = useState('')
  const [marcando, setMarcando] = useState<string | null>(null)

  const load = async () => {
    const { data: profile } = await supabase.from('profiles').select('restaurant_id, role').single()
    if (!profile) return
    setRole(profile.role)
    const { data } = await supabase
      .from('pedidos').select('*, proveedores(nombre)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('fecha', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const marcarRecibido = async (pedido: any) => {
    setMarcando(pedido.id)
    await supabase.from('pedidos').update({ estado: 'recibido' }).eq('id', pedido.id)
    setMarcando(null)
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
          <button style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
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
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>{pedido.proveedores?.nombre || '—'}</div>
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
    </div>
  )
}
