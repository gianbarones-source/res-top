'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PanelPage() {
  const [locales, setLocales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: vinculados } = await supabase
        .from('franquiciado_restaurants').select('restaurant_id, restaurants(id, name, cuisine_type)')
        .eq('franquiciado_id', user.id)
      if (!vinculados) return

      const stats = await Promise.all(vinculados.map(async (v: any) => {
        const r = v.restaurants
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const [{ count: alertas }, { count: pendientes }, { data: gastos }] = await Promise.all([
          supabase.from('stock').select('id', { count: 'exact', head: true }).eq('restaurant_id', r.id).filter('cantidad_actual', 'lte', 'cantidad_minima'),
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('restaurant_id', r.id).eq('estado', 'pendiente'),
          supabase.from('pedidos').select('monto_total').eq('restaurant_id', r.id).gte('fecha', inicioMes),
        ])
        const totalGastos = (gastos || []).reduce((a: number, p: any) => a + (p.monto_total || 0), 0)
        return { ...r, alertas: alertas || 0, pendientes: pendientes || 0, gastos: totalGastos }
      }))

      setLocales(stats)
      setLoading(false)
    }
    load()
  }, [])

  const getEstado = (local: any) => {
    if (local.alertas > 0) return 'danger'
    if (local.pendientes > 0) return 'warn'
    return 'ok'
  }

  const colores = {
    ok: { bg: '#052e16', border: '#166534', icon: '✅' },
    warn: { bg: '#1c1917', border: '#78350f', icon: '⚠️' },
    danger: { bg: '#1c0a0a', border: '#7f1d1d', icon: '🔴' },
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280' }}>Cargando locales...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', padding: '24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f97316' }}>Restop</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Mis locales</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '6px 14px', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {locales.map(local => {
            const estado = getEstado(local)
            const c = colores[estado]
            return (
              <button key={local.id} onClick={() => router.push(`/dashboard?local=${local.id}`)}
                style={{ width: '100%', textAlign: 'left', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', transition: 'opacity 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#f9fafb' }}>{local.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{local.cuisine_type}</div>
                  </div>
                  <span style={{ fontSize: '20px' }}>{c.icon}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {local.alertas > 0 && <span style={{ fontSize: '12px', color: '#f87171' }}>📦 {local.alertas} alertas</span>}
                  {local.pendientes > 0 && <span style={{ fontSize: '12px', color: '#f97316' }}>🧾 {local.pendientes} pendientes</span>}
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>💰 ${local.gastos.toLocaleString('es-AR')}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
