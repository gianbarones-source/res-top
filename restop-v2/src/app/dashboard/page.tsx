'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function StatCard({ icon, value, label, color = '#f9fafb', alert = false, sub }: any) {
  return (
    <div style={{
      background: alert ? '#1c0a0a' : '#1f2937',
      border: `1px solid ${alert ? '#7f1d1d' : '#374151'}`,
      borderRadius: '12px', padding: '20px'
    }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { selectedId: restaurantId, role } = useRestaurant()
  const [loading, setLoading] = useState(true)

  // Stats
  const [stockAlertas, setStockAlertas] = useState<any[]>([])
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([])
  const [gastoMes, setGastoMes] = useState(0)
  const [ventasMes, setVentasMes] = useState(0)

  // Caja hoy
  const [cajaTM, setCajaTM] = useState<any>(null)
  const [cajaTN, setCajaTN] = useState<any>(null)

  const hoy = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  useEffect(() => {
    if (!restaurantId) return
    const load = async () => {
      const [
        { data: stock },
        { data: pedidos },
        { data: gastos },
        { data: cajaHoy },
        { data: cajaRegistros },
      ] = await Promise.all([
        supabase.from('stock').select('*').eq('restaurant_id', restaurantId),
        supabase.from('pedidos').select('*, proveedores(nombre)').eq('restaurant_id', restaurantId).eq('estado', 'pendiente').order('fecha', { ascending: false }),
        supabase.from('pedidos').select('monto_total').eq('restaurant_id', restaurantId).gte('fecha', inicioMes),
        supabase.from('caja_registros').select('*').eq('restaurant_id', restaurantId).eq('fecha', hoy),
        supabase.from('caja_registros').select('vta_total').eq('restaurant_id', restaurantId).gte('fecha', inicioMes),
      ])
      const alertas = (stock || []).filter((s: any) => s.cantidad_actual <= s.cantidad_minima)
      const totalGastos = (gastos || []).reduce((a: number, p: any) => a + (p.monto_total || 0), 0)
      const totalVentas = (cajaRegistros || []).reduce((a: number, r: any) => a + (r.vta_total || 0), 0)
      setStockAlertas(alertas)
      setPedidosPendientes(pedidos || [])
      setGastoMes(totalGastos)
      setVentasMes(totalVentas)
      const tm = (cajaHoy || []).find((c: any) => c.turno === 'TM') || null
      const tn = (cajaHoy || []).find((c: any) => c.turno === 'TN') || null
      setCajaTM(tm)
      setCajaTN(tn)
      setLoading(false)
    }
    load()
  }, [restaurantId])

  const totalVentasHoy = (cajaTM
    ? cajaTM.vta_efectivo + cajaTM.vta_tarjetas + cajaTM.vta_peya_efv + cajaTM.vta_peya_tickets
    : 0) + (cajaTN
    ? cajaTN.vta_efectivo + cajaTN.vta_tarjetas + cajaTN.vta_peya_efv + cajaTN.vta_peya_tickets
    : 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>Cargando...</div>
    </div>
  )

  const quickActions = role === 'admin'
    ? [
        { label: 'Cargar caja', icon: '💵', href: '/dashboard/caja', color: '#f97316' },
        { label: 'Nuevo pedido', icon: '🧾', href: '/dashboard/pedidos', color: '#60a5fa' },
        { label: 'Ver stock', icon: '📦', href: '/dashboard/stock', color: '#4ade80' },
        { label: 'Reportes', icon: '📊', href: '/admin/reportes', color: '#a78bfa' },
      ]
    : [
        { label: 'Cargar caja', icon: '💵', href: '/dashboard/caja', color: '#f97316' },
        { label: 'Ver stock', icon: '📦', href: '/dashboard/stock', color: '#4ade80' },
        { label: 'Proveedores', icon: '🚚', href: '/dashboard/proveedores', color: '#60a5fa' },
      ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          icon="💵"
          value={`$${totalVentasHoy.toLocaleString('es-AR')}`}
          label="Ventas de hoy"
          color="#4ade80"
          sub={`${cajaTM ? '✓ TM' : '○ TM'}  ${cajaTN ? '✓ TN' : '○ TN'}`}
        />
        <StatCard
          icon="📈"
          value={`$${ventasMes.toLocaleString('es-AR')}`}
          label="Ventas del mes"
          color="#60a5fa"
        />
        <StatCard
          icon="📦"
          value={stockAlertas.length}
          label="Alertas de stock"
          color="#f97316"
          alert={stockAlertas.length > 0}
        />
        <StatCard
          icon="🧾"
          value={pedidosPendientes.length}
          label="Pedidos pendientes"
          color="#a78bfa"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

        {/* Caja de hoy */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#111827', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Caja de hoy
            </h2>
            <Link href="/dashboard/caja" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>
              Ir a caja →
            </Link>
          </div>

          {[{ label: 'TM — Turno mañana', data: cajaTM }, { label: 'TN — Turno noche', data: cajaTN }].map(({ label, data }) => {
            const ventasTurno = data
              ? data.vta_efectivo + data.vta_tarjetas + data.vta_peya_efv + data.vta_peya_tickets
              : 0
            const diff = data ? data.cierre_fisico - data.cierre_sistema : 0
            return (
              <div key={label} style={{ padding: '16px 20px', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: data ? '10px' : '0' }}>
                  <div style={{ fontSize: '13px', color: data ? '#f9fafb' : '#4b5563', fontWeight: 500 }}>{label}</div>
                  {data
                    ? <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}>Cargado</span>
                    : <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#1c1917', color: '#6b7280', border: '1px solid #374151' }}>Pendiente</span>
                  }
                </div>
                {data && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div>
                      <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>${ventasTurno.toLocaleString('es-AR')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Gastos</div>
                      <div style={{ fontSize: '13px', color: '#f87171' }}>${(data.retiros + data.gastos).toLocaleString('es-AR')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Diferencia</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: diff === 0 ? '#9ca3af' : diff > 0 ? '#60a5fa' : '#f87171' }}>
                        {diff > 0 ? '+' : ''}${diff.toLocaleString('es-AR')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pedidos pendientes */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#111827', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pedidos pendientes
            </h2>
            <Link href="/dashboard/pedidos" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>

          {pedidosPendientes.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>
              ✓ Sin pedidos pendientes
            </div>
          ) : (
            pedidosPendientes.slice(0, 4).map((p, i) => (
              <div key={p.id} style={{
                padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: i < Math.min(pedidosPendientes.length, 4) - 1 ? '1px solid #1f2937' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#f9fafb' }}>{p.proveedores?.nombre || '—'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: '#f9fafb' }}>
                    {p.monto_total ? `$${p.monto_total.toLocaleString('es-AR')}` : '—'}
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#1c1917', color: '#f97316', border: '1px solid #78350f' }}>
                    Pendiente
                  </span>
                </div>
              </div>
            ))
          )}
          {pedidosPendientes.length > 4 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid #1f2937', textAlign: 'center' }}>
              <Link href="/dashboard/pedidos" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
                +{pedidosPendientes.length - 4} más →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Alertas de stock */}
      {stockAlertas.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alertas de stock
            </h2>
            <Link href="/dashboard/stock" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>
              Ver stock →
            </Link>
          </div>
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
            {stockAlertas.slice(0, 5).map((item, i) => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 80px',
                padding: '12px 20px', gap: '16px', alignItems: 'center',
                borderBottom: i < Math.min(stockAlertas.length, 5) - 1 ? '1px solid #1f2937' : 'none'
              }}>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.producto}</div>
                <div style={{ fontSize: '13px', color: '#f87171' }}>
                  {item.cantidad_actual} {item.unidad} <span style={{ color: '#4b5563' }}>/ mín. {item.cantidad_minima}</span>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#1c0a0a', color: '#f87171', border: '1px solid #7f1d1d', textAlign: 'center' }}>
                  Alerta
                </span>
              </div>
            ))}
            {stockAlertas.length > 5 && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid #1f2937', textAlign: 'center' }}>
                <Link href="/dashboard/stock" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
                  +{stockAlertas.length - 5} productos más →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Accesos rápidos
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#1f2937', border: '1px solid #374151', borderRadius: '10px',
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', transition: 'border-color 0.15s',
                minWidth: '150px'
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#374151')}
              >
                <span style={{ fontSize: '18px' }}>{a.icon}</span>
                <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 500 }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
