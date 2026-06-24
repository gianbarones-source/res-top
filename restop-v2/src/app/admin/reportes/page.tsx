'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportesPage() {
  const [data, setData] = useState<any>({ gastoTotal: 0, topProveedores: [], mermas: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').single()
      if (!profile) return
      const rid = profile.restaurant_id
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [{ data: pedidos }, { data: mermas }] = await Promise.all([
        supabase.from('pedidos').select('*, proveedores(nombre)').eq('restaurant_id', rid).gte('fecha', inicioMes),
        supabase.from('mermas').select('*').eq('restaurant_id', rid).gte('registrado_en', inicioMes + 'T00:00:00'),
      ])

      const gastoTotal = (pedidos || []).reduce((a: number, p: any) => a + (p.monto_total || 0), 0)

      const porProveedor: Record<string, number> = {}
      ;(pedidos || []).forEach((p: any) => {
        const nombre = p.proveedores?.nombre || 'Sin proveedor'
        porProveedor[nombre] = (porProveedor[nombre] || 0) + (p.monto_total || 0)
      })
      const topProveedores = Object.entries(porProveedor).sort((a, b) => b[1] - a[1]).slice(0, 5)

      setData({ gastoTotal, topProveedores, mermas: mermas || [] })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Reportes</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Resumen del mes actual</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Gasto total del mes</div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#4ade80' }}>${data.gastoTotal.toLocaleString('es-AR')}</div>
        </div>
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Mermas registradas</div>
          <div style={{ fontSize: '32px', fontWeight: 600, color: '#f87171' }}>{data.mermas.length}</div>
        </div>
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Top proveedores por gasto
        </h2>
        {data.topProveedores.length === 0 && <p style={{ color: '#6b7280', fontSize: '14px' }}>Sin datos este mes</p>}
        {data.topProveedores.map(([nombre, monto]: [string, number], i: number) => {
          const pct = Math.round((monto / data.gastoTotal) * 100)
          return (
            <div key={nombre} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{i + 1}. {nombre}</span>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>${monto.toLocaleString('es-AR')} ({pct}%)</span>
              </div>
              <div style={{ height: '4px', background: '#374151', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#f97316', borderRadius: '2px' }} />
              </div>
            </div>
          )
        })}
      </div>

      {data.mermas.length > 0 && (
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mermas del mes
            </h2>
          </div>
          {data.mermas.map((m: any, i: number) => (
            <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px', alignItems: 'center', borderBottom: i < data.mermas.length - 1 ? '1px solid #1f2937' : 'none' }}>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>{m.producto}</div>
              <div style={{ fontSize: '13px', color: '#f87171' }}>{m.cantidad} {m.unidad}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{m.motivo || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
