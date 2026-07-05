'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const inp: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const lbl: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pendiente:       { label: 'Pendiente',       color: '#f97316', bg: '#1c1917', border: '#78350f' },
  recibido:        { label: 'Recibido',         color: '#4ade80', bg: '#052e16', border: '#166534' },
  con_diferencias: { label: 'Con diferencias',  color: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' },
  abonado:         { label: 'Abonado',          color: '#9ca3af', bg: '#1f2937', border: '#374151' },
}

// ─── Modal marcar recibido ────────────────────────────────────────────────────
function ModalRecibido({ pedido, onClose, onSave }: { pedido: any; onClose: () => void; onSave: (monto: string) => void }) {
  const [monto, setMonto] = useState(String(pedido.monto_total || ''))
  const [saving, setSaving] = useState(false)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Marcar como recibido</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{pedido.proveedores?.nombre}</p>
        <label style={lbl}>Monto a pagar $</label>
        <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
          placeholder="0" style={{ ...inp, fontSize: '20px', padding: '12px 14px', marginBottom: '20px' }} autoFocus />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(monto)} style={{ flex: 1, background: '#4ade80', border: 'none', borderRadius: '8px', padding: '10px', color: '#052e16', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            ✓ Confirmar recibido
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pestaña activos ──────────────────────────────────────────────────────────
function PedidosActivos({ pedidos, proveedores, role, onRefresh }: { pedidos: any[]; proveedores: any[]; role: string; onRefresh: () => void }) {
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroProveedor, setFiltroProveedor] = useState('todos')
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])
  const [marcandoRecibido, setMarcandoRecibido] = useState<any>(null)
  const [marcandoAbonado, setMarcandoAbonado] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')
  const [nuevo, setNuevo] = useState({ proveedor_id: '', fecha: new Date().toISOString().split('T')[0], monto_total: '', descripcion: '' })

  const activos = pedidos.filter(p => p.estado !== 'abonado')
  const filtrados = activos
    .filter(p => filtroEstado === 'activos' ? true : p.estado === filtroEstado)
    .filter(p => filtroProveedor === 'todos' ? true : p.proveedor_id === filtroProveedor)
    .filter(p => p.fecha >= desde && p.fecha <= hasta)

  // Sumatoria del rango seleccionado (solo recibidos sin abonar)
  const totalRango = filtrados
    .filter(p => p.estado === 'recibido' || p.estado === 'con_diferencias')
    .reduce((a, p) => a + (p.monto_recibido || p.monto_total || 0), 0)

  const marcarRecibido = async (monto: string) => {
    const p = marcandoRecibido
    setSaving(true)
    await supabase.from('pedidos').update({
      estado: 'recibido',
      monto_recibido: parseFloat(monto) || 0,
      monto_total: parseFloat(monto) || p.monto_total || 0,
    }).eq('id', p.id)
    setSaving(false)
    setMarcandoRecibido(null)
    onRefresh()
  }

  const marcarAbonado = async (id: string) => {
    setMarcandoAbonado(id)
    await supabase.from('pedidos').update({
      estado: 'abonado',
      fecha_abono: new Date().toISOString().split('T')[0]
    }).eq('id', id)
    setMarcandoAbonado(null)
    onRefresh()
  }

  const saveNuevo = async () => {
    setErrorNuevo('')
    if (!nuevo.proveedor_id) { setErrorNuevo('Seleccioná un proveedor.'); return }
    setSaving(true)
    const { error } = await supabase.from('pedidos').insert({
      restaurant_id: pedidos[0]?.restaurant_id || '',
      proveedor_id: nuevo.proveedor_id,
      fecha: nuevo.fecha,
      monto_total: nuevo.monto_total ? parseFloat(nuevo.monto_total) : null,
      notas: nuevo.descripcion.trim() || null,
      estado: 'pendiente'
    })
    setSaving(false)
    if (error) { setErrorNuevo('Error: ' + error.message); return }
    setShowNuevo(false)
    setNuevo({ proveedor_id: '', fecha: new Date().toISOString().split('T')[0], monto_total: '', descripcion: '' })
    onRefresh()
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={lbl}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Proveedor</label>
            <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)} style={inp}>
              <option value="todos">Todos</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[{ k: 'activos', l: 'Todos los activos' }, { k: 'pendiente', l: 'Pendiente' }, { k: 'recibido', l: 'Recibido' }].map(f => (
            <button key={f.k} onClick={() => setFiltroEstado(f.k)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', background: filtroEstado === f.k ? '#f97316' : 'transparent', border: `1px solid ${filtroEstado === f.k ? '#f97316' : '#374151'}`, color: filtroEstado === f.k ? 'white' : '#6b7280' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Sumatoria */}
      {totalRango > 0 && (
        <div style={{ background: '#0c1a2e', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#60a5fa' }}>Total a pagar en el período seleccionado</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>${totalRango.toLocaleString('es-AR')}</span>
        </div>
      )}

      {/* Lista */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 160px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Proveedor', 'Fecha', 'Monto', 'Estado', 'Acciones'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {filtrados.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No hay pedidos en este período.</div>
        )}

        {filtrados.map((p, i) => {
          const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG.pendiente
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 160px', padding: '14px 20px', alignItems: 'center', borderBottom: i < filtrados.length - 1 ? '1px solid #1f2937' : 'none' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{p.proveedores?.nombre || '—'}</div>
                {p.notas && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{p.notas}</div>}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>{new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</div>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{p.monto_recibido ? `$${p.monto_recibido.toLocaleString('es-AR')}` : p.monto_total ? `$${p.monto_total.toLocaleString('es-AR')}` : '—'}</div>
                {p.monto_recibido && p.monto_total && p.monto_recibido !== p.monto_total && (
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Pedido: ${p.monto_total.toLocaleString('es-AR')}</div>
                )}
              </div>
              <div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {p.estado === 'pendiente' && (
                  <button onClick={() => setMarcandoRecibido(p)} style={{ fontSize: '11px', padding: '5px 8px', background: '#052e16', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', cursor: 'pointer' }}>
                    ✓ Recibido
                  </button>
                )}
                {(p.estado === 'recibido' || p.estado === 'con_diferencias') && (
                  <button onClick={() => marcarAbonado(p.id)} disabled={marcandoAbonado === p.id} style={{ fontSize: '11px', padding: '5px 8px', background: '#0c1a2e', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer' }}>
                    {marcandoAbonado === p.id ? '...' : '💰 Abonado'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón nuevo pedido */}
      {(role === 'admin' || role === 'franquiciado') && (
        <button onClick={() => setShowNuevo(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}>
          + Nuevo pedido
        </button>
      )}

      {/* Modal recibido */}
      {marcandoRecibido && <ModalRecibido pedido={marcandoRecibido} onClose={() => setMarcandoRecibido(null)} onSave={marcarRecibido} />}

      {/* Modal nuevo pedido */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' }}>Nuevo pedido</h2>
            <label style={lbl}>Proveedor *</label>
            <select value={nuevo.proveedor_id} onChange={e => setNuevo({ ...nuevo, proveedor_id: e.target.value })} style={{ ...inp, marginBottom: '14px' }}>
              <option value="">Seleccioná un proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div><label style={lbl}>Fecha *</label><input type="date" value={nuevo.fecha} onChange={e => setNuevo({ ...nuevo, fecha: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Monto estimado $</label><input type="number" value={nuevo.monto_total} onChange={e => setNuevo({ ...nuevo, monto_total: e.target.value })} placeholder="0" style={inp} /></div>
            </div>
            <label style={lbl}>Notas</label>
            <input value={nuevo.descripcion} onChange={e => setNuevo({ ...nuevo, descripcion: e.target.value })} placeholder="Descripción opcional" style={{ ...inp, marginBottom: '20px' }} />
            {errorNuevo && <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>{errorNuevo}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowNuevo(false); setErrorNuevo('') }} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveNuevo} disabled={saving} style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Guardando...' : 'Crear pedido'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pestaña abonados ─────────────────────────────────────────────────────────
function PedidosAbonados({ pedidos, proveedores }: { pedidos: any[]; proveedores: any[] }) {
  const [filtroProveedor, setFiltroProveedor] = useState('todos')
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])

  const abonados = pedidos
    .filter(p => p.estado === 'abonado')
    .filter(p => filtroProveedor === 'todos' ? true : p.proveedor_id === filtroProveedor)
    .filter(p => p.fecha_abono ? (p.fecha_abono >= desde && p.fecha_abono <= hasta) : false)
    .sort((a, b) => (b.fecha_abono || '').localeCompare(a.fecha_abono || ''))

  const total = abonados.reduce((a, p) => a + (p.monto_recibido || p.monto_total || 0), 0)

  return (
    <div>
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div><label style={lbl}>Desde</label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Hasta</label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} /></div>
          <div>
            <label style={lbl}>Proveedor</label>
            <select value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)} style={inp}>
              <option value="todos">Todos</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#4ade80' }}>Total abonado en el período</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>${total.toLocaleString('es-AR')}</span>
        </div>
      )}

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Proveedor', 'Fecha pedido', 'Monto pagado', 'Fecha abono'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>
        {abonados.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No hay pedidos abonados en este período.</div>
        )}
        {abonados.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'center', borderBottom: i < abonados.length - 1 ? '1px solid #1f2937' : 'none' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>{p.proveedores?.nombre || '—'}</div>
              {p.notas && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{p.notas}</div>}
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>{new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</div>
            <div style={{ fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>${(p.monto_recibido || p.monto_total || 0).toLocaleString('es-AR')}</div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>{p.fecha_abono ? new Date(p.fecha_abono + 'T12:00:00').toLocaleDateString('es-AR') : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PedidosPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'activos' | 'abonados'>('activos')

  const load = async () => {
    if (!restaurantId) return
    const [{ data }, { data: provs }] = await Promise.all([
      supabase.from('pedidos').select('*, proveedores(nombre, id)')
        .eq('restaurant_id', restaurantId).order('fecha', { ascending: false }),
      supabase.from('proveedores').select('id, nombre').eq('restaurant_id', restaurantId).order('nombre')
    ])
    setPedidos(data || [])
    setProveedores(provs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [restaurantId])

  const pendientesAbono = pedidos.filter(p => p.estado === 'recibido' || p.estado === 'con_diferencias').length

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Pedidos</h1>
          {pendientesAbono > 0 && (
            <p style={{ fontSize: '13px', color: '#60a5fa', marginTop: '4px' }}>
              {pendientesAbono} pedido{pendientesAbono > 1 ? 's' : ''} pendiente{pendientesAbono > 1 ? 's' : ''} de abono
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ k: 'activos', l: '📋 Activos' }, { k: 'abonados', l: '✅ Abonados' }].map(v => (
            <button key={v.k} onClick={() => setVista(v.k as any)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: vista === v.k ? '#f97316' : 'transparent', border: `1px solid ${vista === v.k ? '#f97316' : '#374151'}`, color: vista === v.k ? 'white' : '#9ca3af' }}>
              {v.l}
            </button>
          ))}
        </div>
      </div>

      {vista === 'activos'
        ? <PedidosActivos pedidos={pedidos} proveedores={proveedores} role={role} onRefresh={load} />
        : <PedidosAbonados pedidos={pedidos} proveedores={proveedores} />
      }
    </div>
  )
}
