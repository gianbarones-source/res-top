'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function StatCard({ icon, value, label, color = '#f9fafb', alert = false, sub }: any) {
  return (
    <div style={{ background: alert ? '#1c0a0a' : '#1f2937', border: `1px solid ${alert ? '#7f1d1d' : '#374151'}`, borderRadius: '12px', padding: '20px' }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [loading, setLoading] = useState(true)
  const [stockAlertas, setStockAlertas] = useState<any[]>([])
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([])
  const [ventasMes, setVentasMes] = useState(0)
  const [cajaTM, setCajaTM] = useState<any>(null)
  const [cajaTN, setCajaTN] = useState<any>(null)
  const [ventasSemana, setVentasSemana] = useState<{ fecha: string; total: number; label: string }[]>([])

  const hoy = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  // Últimos 7 días
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      fecha: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
    }
  })

  useEffect(() => {
    if (!restaurantId) return
    const load = async () => {
      const desde7 = ultimos7[0].fecha
      const [
        { data: stock },
        { data: pedidos },
        { data: cajaHoy },
        { data: cajaRegistros },
        { data: cajaSemana },
      ] = await Promise.all([
        supabase.from('stock').select('*').eq('restaurant_id', restaurantId),
        supabase.from('pedidos').select('*, proveedores(nombre)').eq('restaurant_id', restaurantId).eq('estado', 'pendiente').order('fecha', { ascending: false }),
        supabase.from('caja_registros').select('*').eq('restaurant_id', restaurantId).eq('fecha', hoy),
        supabase.from('caja_registros').select('vta_total').eq('restaurant_id', restaurantId).gte('fecha', inicioMes),
        supabase.from('caja_registros').select('fecha, vta_total').eq('restaurant_id', restaurantId).gte('fecha', desde7).order('fecha'),
      ])

      // Stock alertas
      const esFinde = [4, 5, 6, 0].includes(new Date().getDay())
      const alertas = (stock || []).filter((s: any) => {
        const obj = esFinde && s.cantidad_objetivo_finde ? s.cantidad_objetivo_finde : s.cantidad_objetivo
        return s.cantidad_actual < obj
      })
      setStockAlertas(alertas)
      setPedidosPendientes(pedidos || [])

      // Ventas del mes
      const totalVentas = (cajaRegistros || []).reduce((a: number, r: any) => a + (r.vta_total || 0), 0)
      setVentasMes(totalVentas)

      // Caja hoy
      setCajaTM((cajaHoy || []).find((c: any) => c.turno === 'TM') || null)
      setCajaTN((cajaHoy || []).find((c: any) => c.turno === 'TN') || null)

      // Ventas últimos 7 días agrupadas por fecha
      const porFecha: Record<string, number> = {}
      for (const r of cajaSemana || []) {
        porFecha[r.fecha] = (porFecha[r.fecha] || 0) + (r.vta_total || 0)
      }
      setVentasSemana(ultimos7.map(d => ({ ...d, total: porFecha[d.fecha] || 0 })))

      setLoading(false)
    }
    load()
  }, [restaurantId])

  const totalVentasHoy = (cajaTM?.vta_total || 0) + (cajaTN?.vta_total || 0)
  const maxVenta = Math.max(...ventasSemana.map(d => d.total), 1)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>Cargando...</div>
    </div>
  )

  const quickActions = role === 'admin' || role === 'franquiciado'
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard icon="💵" value={`$${totalVentasHoy.toLocaleString('es-AR')}`} label="Ventas de hoy" color="#4ade80"
          sub={`${cajaTM ? '✓ TM' : '○ TM'}  ${cajaTN ? '✓ TN' : '○ TN'}`} />
        <StatCard icon="📈" value={`$${ventasMes.toLocaleString('es-AR')}`} label="Ventas del mes" color="#60a5fa" />
        <StatCard icon="📦" value={stockAlertas.length} label="Alertas de stock" color="#f97316" alert={stockAlertas.length > 0} />
        <StatCard icon="🧾" value={pedidosPendientes.length} label="Pedidos pendientes" color="#a78bfa" />
      </div>

      {/* Gráfico últimos 7 días */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Ventas — últimos 7 días
          </h2>
          <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
            ${ventasSemana.reduce((a, d) => a + d.total, 0).toLocaleString('es-AR')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
          {ventasSemana.map(d => {
            const pct = (d.total / maxVenta) * 100
            const esHoy = d.fecha === hoy
            return (
              <div key={d.fecha} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                  {d.total > 0 ? `$${Math.round(d.total / 1000)}k` : ''}
                </div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${Math.max(pct, d.total > 0 ? 4 : 0)}%`,
                  background: esHoy ? '#f97316' : '#374151',
                  transition: 'height 0.3s',
                  minHeight: d.total > 0 ? '4px' : '0'
                }} />
                <div style={{ fontSize: '10px', color: esHoy ? '#f97316' : '#6b7280', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {d.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Caja de hoy + Pedidos pendientes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Caja hoy */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#111827', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Caja de hoy</h2>
            <Link href="/dashboard/caja" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>Ir a caja →</Link>
          </div>
          {[{ label: 'TM — Turno mañana', data: cajaTM }, { label: 'TN — Turno noche', data: cajaTN }].map(({ label, data }) => (
            <div key={label} style={{ padding: '14px 20px', borderBottom: '1px solid #1f2937' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: data ? '8px' : '0' }}>
                <div style={{ fontSize: '13px', color: data ? '#f9fafb' : '#4b5563', fontWeight: 500 }}>{label}</div>
                {data
                  ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}>Cargado</span>
                  : <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#1c1917', color: '#6b7280', border: '1px solid #374151' }}>Pendiente</span>
                }
              </div>
              {data && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div><div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>${(data.vta_total || 0).toLocaleString('es-AR')}</div></div>
                  <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Gastos</div><div style={{ fontSize: '13px', color: '#f87171' }}>${(data.gastos || 0).toLocaleString('es-AR')}</div></div>
                  <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Efectivo</div><div style={{ fontSize: '13px', color: '#60a5fa' }}>${(data.cierre_fisico || 0).toLocaleString('es-AR')}</div></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pedidos pendientes */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#111827', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pedidos pendientes</h2>
            <Link href="/dashboard/pedidos" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          {pedidosPendientes.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>✓ Sin pedidos pendientes</div>
          ) : (
            pedidosPendientes.slice(0, 4).map((p, i) => (
              <div key={p.id} style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < Math.min(pedidosPendientes.length, 4) - 1 ? '1px solid #1f2937' : 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#f9fafb' }}>{p.proveedores?.nombre || '—'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span style={{ fontSize: '13px', color: '#f9fafb' }}>{p.monto_total ? `$${p.monto_total.toLocaleString('es-AR')}` : '—'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alertas stock */}
      {stockAlertas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alertas de stock</h2>
            <Link href="/dashboard/stock" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>Ver stock →</Link>
          </div>
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
            {stockAlertas.slice(0, 5).map((item, i) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < Math.min(stockAlertas.length, 5) - 1 ? '1px solid #1f2937' : 'none' }}>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.producto}</div>
                <div style={{ fontSize: '13px', color: '#f87171' }}>{item.cantidad_actual} {item.unidad} <span style={{ color: '#4b5563' }}>/ obj. {item.cantidad_objetivo}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 style={{ fontSize: '13px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Accesos rápidos</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '10px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#374151')}>
                <span style={{ fontSize: '16px' }}>{a.icon}</span>
                <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 500 }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
