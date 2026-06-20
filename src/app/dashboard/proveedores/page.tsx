'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function diasHastaProximaEntrega(diasEntrega: number[], hoy: number): number {
  if (!diasEntrega?.length) return 1
  const proximos = diasEntrega.map(d => d > hoy ? d - hoy : 7 - hoy + d).sort((a, b) => a - b)
  return proximos[0] || 1
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState<{ texto: string; proveedor: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [restaurante, setRestaurante] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').single()
      if (!profile) return
      const rid = profile.restaurant_id
      const [{ data: provs }, { data: stk }, { data: rest }] = await Promise.all([
        supabase.from('proveedores').select('*').eq('restaurant_id', rid),
        supabase.from('stock').select('*').eq('restaurant_id', rid),
        supabase.from('restaurants').select('*').eq('id', rid).single(),
      ])
      setProveedores(provs || [])
      setStock(stk || [])
      setRestaurante(rest)
      setLoading(false)
    }
    load()
  }, [])

  const generarMensaje = (prov: any) => {
    const hoy = new Date().getDay() || 7
    const diasACubrir = prov.tipo_pedido === 'B' ? diasHastaProximaEntrega(prov.dias_entrega, hoy) : 1
    const proxEntrega = prov.dias_entrega?.map((d: number) => DIAS[d]).join('/') || ''

    const items = stock
      .filter(s => s.proveedor_id === prov.id && s.cantidad_actual <= s.cantidad_minima)
      .map(s => {
        const objetivo = s.es_objetivo_por_dia ? s.cantidad_objetivo * diasACubrir : s.cantidad_objetivo
        const pedir = Math.max(0, objetivo - s.cantidad_actual)
        return pedir > 0 ? `- ${s.producto}: ${pedir} ${s.unidad}` : null
      }).filter(Boolean)

    if (!items.length) {
      alert('No hay productos que necesiten pedido para este proveedor.')
      return
    }

    const texto = (prov.template_mensaje || 'Hola {nombre_proveedor}, buen día.\nTe hago el pedido:\n\n{items}\n\nGracias.\n— {nombre_restaurante}')
      .replace('{nombre_proveedor}', prov.nombre)
      .replace('{nombre_restaurante}', restaurante?.name || '')
      .replace('{items}', items.join('\n'))
      .replace('{dia_entrega}', proxEntrega)

    setMensaje({ texto, proveedor: prov.nombre })
    setCopied(false)
  }

  const copiar = async () => {
    if (!mensaje) return
    await navigator.clipboard.writeText(mensaje.texto)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Proveedores</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{proveedores.length} proveedores activos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {proveedores.map(prov => {
          const itemsBajos = stock.filter(s => s.proveedor_id === prov.id && s.cantidad_actual <= s.cantidad_minima).length
          return (
            <div key={prov.id} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#f9fafb' }}>{prov.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{prov.rubro}</div>
                </div>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#111827', color: '#9ca3af', border: '1px solid #374151' }}>
                  Tipo {prov.tipo_pedido}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                📞 {prov.telefono || '—'}
              </div>
              {prov.dias_entrega?.length > 0 && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  🚚 Entrega: {prov.dias_entrega.map((d: number) => DIAS[d]).join(', ')}
                </div>
              )}

              {itemsBajos > 0 && (
                <div style={{ fontSize: '12px', color: '#f97316', marginBottom: '12px', background: '#1c1917', padding: '6px 10px', borderRadius: '6px', border: '1px solid #78350f' }}>
                  ⚠️ {itemsBajos} producto{itemsBajos > 1 ? 's' : ''} bajo mínimo
                </div>
              )}

              <button onClick={() => generarMensaje(prov)} style={{
                width: '100%', background: '#f97316', border: 'none', borderRadius: '8px',
                padding: '10px', fontSize: '13px', color: 'white', cursor: 'pointer', fontWeight: 500
              }}>
                Generar pedido →
              </button>
            </div>
          )
        })}
      </div>

      {mensaje && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Pedido a {mensaje.proveedor}</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Copiá y pegá en WhatsApp</p>

            <pre style={{
              background: '#1f2937', border: '1px solid #374151', borderRadius: '8px',
              padding: '16px', fontSize: '13px', color: '#e5e7eb', whiteSpace: 'pre-wrap',
              fontFamily: 'inherit', lineHeight: 1.6, marginBottom: '16px', maxHeight: '240px', overflowY: 'auto'
            }}>
              {mensaje.texto}
            </pre>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMensaje(null)}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cerrar
              </button>
              <button onClick={copiar}
                style={{ flex: 2, background: copied ? '#052e16' : '#f97316', border: copied ? '1px solid #166534' : 'none', borderRadius: '8px', padding: '10px', color: copied ? '#4ade80' : 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
                {copied ? '✓ Copiado' : 'Copiar mensaje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
