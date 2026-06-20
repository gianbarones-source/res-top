'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function StatCard({ icon, value, label, color = '#f9fafb', alert = false }: any) {
  return (
    <div style={{
      background: alert ? '#1c0a0a' : '#1f2937',
      border: `1px solid ${alert ? '#7f1d1d' : '#374151'}`,
      borderRadius: '12px', padding: '20px'
    }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ alertas: 0, pendientes: 0, gastos: 0 })
  const [stockAlerts, setStockAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').single()
      if (!profile) return
      const rid = profile.restaurant_id

      const [{ data: stock }, { data: pedidos }, { data: gastos }] = await Promise.all([
        supabase.from('stock').select('*').eq('restaurant_id', rid),
        supabase.from('pedidos').select('id').eq('restaurant_id', rid).eq('estado', 'pendiente'),
        supabase.from('pedidos').select('monto_total').eq('restaurant_id', rid)
          .gte('fecha', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      ])

      const alerts = (stock || []).filter((s: any) => s.cantidad_actual <= s.cantidad_minima)
      const totalGastos = (gastos || []).reduce((a: number, p: any) => a + (p.monto_total || 0), 0)

      setStats({ alertas: alerts.length, pendientes: pedidos?.length || 0, gastos: totalGastos })
      setStockAlerts(alerts.slice(0, 4))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>Cargando...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Resumen del día</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon="📦" value={stats.alertas} label="Stock con alerta" color="#f97316" alert={stats.alertas > 0} />
        <StatCard icon="🧾" value={stats.pendientes} label="Pedidos pendientes" color="#60a5fa" />
        <StatCard icon="💰" value={`$${stats.gastos.toLocaleString('es-AR')}`} label="Gasto del mes" color="#4ade80" />
      </div>

      {stockAlerts.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alertas de stock
            </h2>
            <Link href="/dashboard/stock" style={{ fontSize: '12px', color: '#f97316', textDecoration: 'none' }}>
              Ver todo →
            </Link>
          </div>
          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
            {stockAlerts.map((item, i) => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                padding: '14px 20px', gap: '16px', alignItems: 'center',
                borderBottom: i < stockAlerts.length - 1 ? '1px solid #374151' : 'none'
              }}>
                <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.producto}</div>
                <div style={{ fontSize: '13px', color: '#f87171' }}>
                  {item.cantidad_actual} {item.unidad} (mín. {item.cantidad_minima})
                </div>
                <span style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                  background: '#1c0a0a', color: '#f87171', border: '1px solid #7f1d1d'
                }}>Alerta</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
