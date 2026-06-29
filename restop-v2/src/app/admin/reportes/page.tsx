'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/context/RestaurantContext'

const inp: React.CSSProperties = {
  background: '#1f2937', border: '1px solid #374151', borderRadius: '8px',
  padding: '10px 14px', color: '#f9fafb', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', width: '100%'
}
const lbl: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }

export default function ReportesPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [mermas, setMermas] = useState<any[]>([])
  const [mermas2, setMermas2] = useState<any[]>([])
  const [productos, setProductos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [eliminando, setEliminando] = useState(false)

  // Periodo 1
  const [desde1, setDesde1] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
  })
  const [hasta1, setHasta1] = useState(new Date().toISOString().split('T')[0])

  // Periodo 2 (comparativa)
  const [desde2, setDesde2] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]
  })
  const [hasta2, setHasta2] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]
  })

  const [filtroProd, setFiltroProd] = useState<string>('todos')
  const [buscarProd, setBuscarProd] = useState('')
  const [buscarDesde, setBuscarDesde] = useState('')
  const [buscarHasta, setBuscarHasta] = useState('')
  const [totalBusqueda, setTotalBusqueda] = useState<{ cantidad: number; unidad: string } | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (restaurantId) {
      cargarMermas()
      cargarProductos()
    }
  }, [restaurantId, desde1, hasta1, desde2, hasta2])

  const cargarMermas = async () => {
    setLoading(true)
    const [{ data: m1 }, { data: m2 }] = await Promise.all([
      supabase.from('mermas').select('*').eq('restaurant_id', restaurantId).gte('fecha', desde1).lte('fecha', hasta1).order('fecha', { ascending: false }),
      supabase.from('mermas').select('*').eq('restaurant_id', restaurantId).gte('fecha', desde2).lte('fecha', hasta2).order('fecha', { ascending: false }),
    ])
    setMermas(m1 || [])
    setMermas2(m2 || [])
    setLoading(false)
  }

  const cargarProductos = async () => {
    const { data } = await supabase.from('mermas').select('producto').eq('restaurant_id', restaurantId)
    const unicos = [...new Set((data || []).map((m: any) => m.producto))].sort()
    setProductos(unicos)
  }

  const eliminarMerma = async (id: string) => {
    setEliminando(true)
    await supabase.from('mermas').delete().eq('id', id)
    setEliminando(false)
    setConfirmEliminar(null)
    cargarMermas()
    cargarProductos()
  }

  const buscarTotal = async () => {
    if (!buscarProd || !buscarDesde || !buscarHasta) return
    setBuscando(true)
    const { data } = await supabase.from('mermas').select('cantidad, unidad')
      .eq('restaurant_id', restaurantId)
      .eq('producto', buscarProd)
      .gte('fecha', buscarDesde)
      .lte('fecha', buscarHasta)
    const total = (data || []).reduce((a: number, m: any) => a + m.cantidad, 0)
    const unidad = data?.[0]?.unidad || ''
    setTotalBusqueda({ cantidad: total, unidad })
    setBuscando(false)
  }

  const mermasFiltradas = filtroProd === 'todos' ? mermas : mermas.filter(m => m.producto === filtroProd)

  // Agrupar por producto para comparativa
  const agrupar = (lista: any[]) => {
    const map: Record<string, number> = {}
    for (const m of lista) {
      map[m.producto] = (map[m.producto] || 0) + m.cantidad
    }
    return map
  }

  const grupo1 = agrupar(mermas)
  const grupo2 = agrupar(mermas2)
  const todosProductos = [...new Set([...Object.keys(grupo1), ...Object.keys(grupo2)])].sort()

  const maxVal = Math.max(...todosProductos.map(p => Math.max(grupo1[p] || 0, grupo2[p] || 0)), 1)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Reportes</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Mermas y pérdidas</p>
      </div>

      {/* Rangos de fechas */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Período 1</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={lbl}>Desde</label><input type="date" value={desde1} onChange={e => setDesde1(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Hasta</label><input type="date" value={hasta1} onChange={e => setHasta1(e.target.value)} style={inp} /></div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Período 2 (comparativa)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={lbl}>Desde</label><input type="date" value={desde2} onChange={e => setDesde2(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Hasta</label><input type="date" value={hasta2} onChange={e => setHasta2(e.target.value)} style={inp} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Totalizador */}
      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Buscar total por producto</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={lbl}>Producto</label>
            <select value={buscarProd} onChange={e => setBuscarProd(e.target.value)} style={inp}>
              <option value="">Seleccioná un producto</option>
              {productos.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Desde</label>
            <input type="date" value={buscarDesde} onChange={e => setBuscarDesde(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Hasta</label>
            <input type="date" value={buscarHasta} onChange={e => setBuscarHasta(e.target.value)} style={inp} />
          </div>
          <button onClick={buscarTotal} disabled={buscando} style={{ background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {buscando ? '...' : 'Buscar'}
          </button>
        </div>
        {totalBusqueda !== null && (
          <div style={{ marginTop: '14px', background: '#111827', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>{buscarProd} entre {buscarDesde} y {buscarHasta}</span>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#f97316' }}>
              {totalBusqueda.cantidad.toFixed(2)} {totalBusqueda.unidad}
            </span>
          </div>
        )}
      </div>

      {/* Comparativa gráfica */}
      {todosProductos.length > 0 && (
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Comparativa de mermas</div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f97316' }} /><span style={{ fontSize: '12px', color: '#9ca3af' }}>Período 1</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#60a5fa' }} /><span style={{ fontSize: '12px', color: '#9ca3af' }}>Período 2</span></div>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {todosProductos.map(prod => {
              const v1 = grupo1[prod] || 0
              const v2 = grupo2[prod] || 0
              return (
                <div key={prod}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#f9fafb' }}>{prod}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#f97316' }}>{v1.toFixed(1)}</span>
                      <span style={{ fontSize: '12px', color: '#60a5fa' }}>{v2.toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ height: '8px', background: '#111827', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(v1 / maxVal) * 100}%`, background: '#f97316', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ height: '8px', background: '#111827', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(v2 / maxVal) * 100}%`, background: '#60a5fa', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtro producto */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroProd('todos')} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', background: filtroProd === 'todos' ? '#1f2937' : 'transparent', border: `1px solid ${filtroProd === 'todos' ? '#374151' : 'transparent'}`, color: filtroProd === 'todos' ? '#f97316' : '#6b7280' }}>Todos</button>
        {productos.map(p => (
          <button key={p} onClick={() => setFiltroProd(p)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', background: filtroProd === p ? '#1f2937' : 'transparent', border: `1px solid ${filtroProd === p ? '#374151' : 'transparent'}`, color: filtroProd === p ? '#f97316' : '#6b7280' }}>{p}</button>
        ))}
      </div>

      {/* Lista de mermas */}
      {loading ? (
        <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>
      ) : mermasFiltradas.length === 0 ? (
        <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center', background: '#1f2937', borderRadius: '12px', border: '1px solid #374151' }}>
          No hay mermas en el período seleccionado.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {mermasFiltradas.map(m => (
            <div key={m.id} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '10px', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb', fontWeight: 500 }}>{m.producto}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div>
                <div style={{ fontSize: '16px', color: '#f87171', fontWeight: 600 }}>{m.cantidad} {m.unidad}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>{m.motivo || '—'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {m.foto_url ? (
                  <img
                    src={m.foto_url} alt="merma"
                    onClick={() => setFotoAmpliada(m.foto_url)}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #374151', cursor: 'pointer' }}
                  />
                ) : (
                  <div style={{ width: '60px', height: '60px', background: '#111827', borderRadius: '6px', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '18px' }}>📷</span>
                  </div>
                )}
                {(role === 'admin' || role === 'franquiciado') && (
                  <button onClick={() => setConfirmEliminar(m)}
                    style={{ fontSize: '11px', padding: '3px 8px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, cursor: 'pointer' }}>
          <img src={fotoAmpliada} alt="foto ampliada" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>✕ Cerrar</button>
        </div>
      )}

      {/* Confirmar eliminar merma */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar merma?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
              <strong style={{ color: '#f9fafb' }}>{confirmEliminar.producto}</strong> — {confirmEliminar.cantidad} {confirmEliminar.unidad} del {new Date(confirmEliminar.fecha + 'T12:00:00').toLocaleDateString('es-AR')}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminarMerma(confirmEliminar.id)} disabled={eliminando} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
