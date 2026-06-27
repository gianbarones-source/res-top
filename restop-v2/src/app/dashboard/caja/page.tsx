'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/context/RestaurantContext'

const CATEGORIAS_GASTO = [
  'Limpieza', 'Gas', 'Electricidad', 'Agua', 'Insumos', 'Transporte', 'Mantenimiento', 'Otro'
]

const inp: React.CSSProperties = {
  background: '#1f2937', border: '1px solid #374151', borderRadius: '8px',
  padding: '10px 14px', color: '#f9fafb', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', width: '100%'
}
const lbl: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }
const sec: React.CSSProperties = { background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const secT: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }

type Gasto = { categoria: string; monto: string; descripcion?: string }
type Consumo = { producto: string; cantidad: string; destino: string }
type StockItem = { producto: string; cantidad: string; unidad: string; momento: string }

type FormState = {
  fecha: string; turno: 'TM' | 'TN'; cajaApertura: string
  vtaTotal: string; vtaTotalTickets: string
  vtaPeyaEfv: string; vtaPeyaEfvTickets: string
  vtaTarjetas: string; vtaTarjetasTickets: string
  retiros: string; gastos: Gasto[]
  cierreFisico: string; cierreSistema: string
  stockItems: StockItem[]; consumos: Consumo[]
}

const defaultForm = (): FormState => ({
  fecha: new Date().toISOString().split('T')[0],
  turno: 'TM', cajaApertura: '',
  vtaTotal: '', vtaTotalTickets: '',
  vtaPeyaEfv: '', vtaPeyaEfvTickets: '',
  vtaTarjetas: '', vtaTarjetasTickets: '',
  retiros: '', gastos: [{ categoria: 'Limpieza', monto: '', descripcion: '' }],
  cierreFisico: '', cierreSistema: '', notas: '',
  stockItems: [
    { producto: 'Panes', cantidad: '', unidad: 'un', momento: 'apertura' },
    { producto: 'Wraps', cantidad: '', unidad: 'un', momento: 'apertura' },
    { producto: 'Ensaladas', cantidad: '', unidad: 'un', momento: 'apertura' },
    { producto: 'Panes', cantidad: '', unidad: 'un', momento: 'cambio' },
    { producto: 'Wraps', cantidad: '', unidad: 'un', momento: 'cambio' },
    { producto: 'Ensaladas', cantidad: '', unidad: 'un', momento: 'cambio' },
    { producto: 'Panes', cantidad: '', unidad: 'un', momento: 'cierre' },
    { producto: 'Wraps', cantidad: '', unidad: 'un', momento: 'cierre' },
    { producto: 'Ensaladas', cantidad: '', unidad: 'un', momento: 'cierre' },
    { producto: 'Snacks', cantidad: '', unidad: 'un', momento: 'cierre' },
    { producto: 'Cookies', cantidad: '', unidad: 'un', momento: 'cierre' },
    { producto: 'Bebidas', cantidad: '', unidad: 'un', momento: 'cierre' },
  ],
  consumos: [{ producto: '', cantidad: '', destino: '' }],
})

// ─── Formulario como componente separado ─────────────────────────────────────
function CajaFormulario({ restaurantId, userId, role, onSaved }: {
  restaurantId: string; userId: string; role: string; onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (key: keyof FormState, val: any) => setForm(prev => ({ ...prev, [key]: val }))

  const efectivo = Math.max(0,
    (parseFloat(form.vtaTotal) || 0) - (parseFloat(form.vtaTarjetas) || 0)
  )
  const totalGastos = form.gastos.reduce((a, g) => a + (parseFloat(g.monto) || 0), 0) + (parseFloat(form.retiros) || 0)

  const guardar = async () => {
    setSaving(true); setMsg('')
    const { data: reg, error } = await supabase.from('caja_registros').insert({
      restaurant_id: restaurantId, fecha: form.fecha, turno: form.turno, creado_por: userId,
      caja_apertura: parseFloat(form.cajaApertura) || 0,
      vta_total: parseFloat(form.vtaTotal) || 0,
      vta_total_tickets: parseInt(form.vtaTotalTickets) || 0,
      vta_peya_efv: parseFloat(form.vtaPeyaEfv) || 0,
      vta_peya_efv_tickets: parseInt(form.vtaPeyaEfvTickets) || 0,
      vta_tarjetas: parseFloat(form.vtaTarjetas) || 0,
      vta_tarjetas_tickets: parseInt(form.vtaTarjetasTickets) || 0,
      retiros: parseFloat(form.retiros) || 0,
      gastos: totalGastos,
      cierre_fisico: parseFloat(form.cierreFisico) || 0,
      cierre_sistema: parseFloat(form.cierreSistema) || 0,
      notas: form.notas.trim() || null,
    }).select().single()

    if (error || !reg) { setSaving(false); setMsg('Error: ' + error?.message); return }

    const rid = reg.id
    const stockData = form.stockItems.filter(s => s.cantidad).map(s => ({ registro_id: rid, producto: s.producto, cantidad: parseFloat(s.cantidad), unidad: s.unidad, momento: s.momento }))
    if (stockData.length) await supabase.from('caja_stock').insert(stockData)

    const gastosData = form.gastos.filter(g => g.categoria && g.monto).map(g => ({ registro_id: rid, categoria: g.categoria === 'Otro' && g.descripcion ? `Otro: ${g.descripcion}` : g.categoria, monto: parseFloat(g.monto) || 0 }))
    if (gastosData.length) await supabase.from('caja_gastos').insert(gastosData)

    const consumoData = form.consumos.filter(c => c.producto).map(c => ({ registro_id: rid, producto: c.producto, cantidad: parseFloat(c.cantidad) || 0, destino: c.destino || null }))
    if (consumoData.length) await supabase.from('caja_consumo').insert(consumoData)

    setSaving(false)
    setMsg('✓ Caja guardada correctamente')
    setForm(defaultForm())
    onSaved()
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      {msg && (
        <div style={{ background: msg.startsWith('Error') ? '#1c0a0a' : '#052e16', border: `1px solid ${msg.startsWith('Error') ? '#7f1d1d' : '#166534'}`, borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: msg.startsWith('Error') ? '#f87171' : '#4ade80', marginBottom: '20px' }}>
          {msg}
        </div>
      )}

      {/* Turno */}
      <div style={sec}>
        <div style={secT}>Identificación del turno</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Turno</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['TM', 'TN'] as const).map(t => (
                <button key={t} onClick={() => set('turno', t)} style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: form.turno === t ? '#f97316' : '#111827', border: `1px solid ${form.turno === t ? '#f97316' : '#374151'}`, color: form.turno === t ? 'white' : '#9ca3af' }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Apertura */}
      <div style={sec}>
        <div style={secT}>Apertura de caja</div>
        <label style={lbl}>Efectivo en caja al abrir $</label>
        <input type="number" value={form.cajaApertura} onChange={e => set('cajaApertura', e.target.value)} placeholder="0" style={inp} />
      </div>

      {/* Ventas */}
      <div style={sec}>
        <div style={secT}>Ventas del turno</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
          <div /><div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>$ Monto</div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}># Tickets</div>
        </div>
        {[
          { label: 'Ventas totales', monto: form.vtaTotal, setMonto: (v: string) => set('vtaTotal', v), tick: form.vtaTotalTickets, setTick: (v: string) => set('vtaTotalTickets', v) },
          { label: 'PEYA efectivo', monto: form.vtaPeyaEfv, setMonto: (v: string) => set('vtaPeyaEfv', v), tick: form.vtaPeyaEfvTickets, setTick: (v: string) => set('vtaPeyaEfvTickets', v) },
          { label: 'Tarjetas / MP', monto: form.vtaTarjetas, setMonto: (v: string) => set('vtaTarjetas', v), tick: form.vtaTarjetasTickets, setTick: (v: string) => set('vtaTarjetasTickets', v) },
        ].map(row => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <label style={{ ...lbl, margin: 0 }}>{row.label}</label>
            <input type="number" value={row.monto} onChange={e => row.setMonto(e.target.value)} placeholder="0" style={inp} />
            <input type="number" value={row.tick} onChange={e => row.setTick(e.target.value)} placeholder="0" style={inp} />
          </div>
        ))}
        <div style={{ background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Efectivo (calc.)</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>${efectivo.toLocaleString('es-AR')}</span>
          <span />
        </div>
        <div style={{ background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Total facturado</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>${(parseFloat(form.vtaTotal) || 0).toLocaleString('es-AR')}</span>
        </div>
      </div>

      {/* Gastos */}
      <div style={sec}>
        <div style={secT}>Retiros y gastos</div>
        <label style={lbl}>Retiros de efectivo $</label>
        <input type="number" value={form.retiros} onChange={e => set('retiros', e.target.value)} placeholder="0" style={{ ...inp, marginBottom: '16px' }} />
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>Gastos del turno</div>
        {form.gastos.map((g, i) => (
          <div key={i} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: '8px', alignItems: 'center' }}>
              <select value={g.categoria} onChange={e => set('gastos', form.gastos.map((x, j) => j === i ? { ...x, categoria: e.target.value } : x))} style={inp}>
                {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={g.monto} onChange={e => set('gastos', form.gastos.map((x, j) => j === i ? { ...x, monto: e.target.value } : x))} placeholder="$ Monto" style={inp} />
              <button onClick={() => set('gastos', form.gastos.filter((_, j) => j !== i))} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>✕</button>
            </div>
            {g.categoria === 'Otro' && (
              <input value={g.descripcion || ''} onChange={e => set('gastos', form.gastos.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))}
                placeholder="¿Qué es este gasto?" style={{ ...inp, marginTop: '6px', fontSize: '13px' }} />
            )}
          </div>
        ))}
        <button onClick={() => set('gastos', [...form.gastos, { categoria: 'Otro', monto: '', descripcion: '' }])} style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer', marginBottom: '12px' }}>+ Agregar gasto</button>
        <div style={{ background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Total gastos + retiros</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#f87171' }}>${totalGastos.toLocaleString('es-AR')}</span>
        </div>
      </div>

      {/* Cierre */}
      <div style={sec}>
        <div style={secT}>Cierre de caja</div>
        <label style={lbl}>Conteo de efectivo final $</label>
        <input type="number" value={form.cierreFisico} onChange={e => set('cierreFisico', e.target.value)} placeholder="0" style={inp} />
      </div>

      {/* Stock */}
      <div style={sec}>
        <div style={secT}>Conteo de stock</div>

        {/* Productos con múltiples momentos: Panes, Wraps, Ensaladas */}
        {(() => {
          const momentos = form.turno === 'TM'
            ? [{ key: 'apertura', label: 'Apertura de turno' }, { key: 'cambio', label: 'Cambio de turno' }, { key: 'cierre', label: 'Cierre de turno' }]
            : [{ key: 'apertura', label: 'Apertura de turno' }, { key: 'cierre', label: 'Cierre de turno' }]
          const productosPrincipales = ['Panes', 'Wraps', 'Ensaladas']

          return momentos.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', borderBottom: '1px solid #374151', paddingBottom: '6px', marginBottom: '10px' }}>
                {label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {productosPrincipales.map(prod => {
                  const idx = form.stockItems.findIndex(s => s.producto === prod && s.momento === key)
                  return (
                    <div key={prod}>
                      <label style={lbl}>{prod}</label>
                      <input type="number"
                        value={idx >= 0 ? form.stockItems[idx].cantidad : ''}
                        onChange={e => {
                          if (idx >= 0) {
                            set('stockItems', form.stockItems.map((s, j) => j === idx ? { ...s, cantidad: e.target.value } : s))
                          }
                        }}
                        placeholder="0" style={inp} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        })()}

        {/* Productos solo cierre */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', borderBottom: '1px solid #374151', paddingBottom: '6px', marginBottom: '10px' }}>
            Cierre de turno
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {['Snacks', 'Cookies', 'Bebidas'].map(prod => {
              const idx = form.stockItems.findIndex(s => s.producto === prod && s.momento === 'cierre')
              return (
                <div key={prod}>
                  <label style={lbl}>{prod}</label>
                  <input type="number"
                    value={idx >= 0 ? form.stockItems[idx].cantidad : ''}
                    onChange={e => {
                      if (idx >= 0) {
                        set('stockItems', form.stockItems.map((s, j) => j === idx ? { ...s, cantidad: e.target.value } : s))
                      }
                    }}
                    placeholder="0" style={inp} />
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={() => set('stockItems', [...form.stockItems, { producto: '', cantidad: '', unidad: 'un', momento: 'cierre' }])} style={{ marginTop: '12px', background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>+ Agregar producto extra</button>
        {form.stockItems.filter(s => !['Panes','Wraps','Ensaladas','Snacks','Cookies','Bebidas'].includes(s.producto)).map((item, i) => (
          <div key={i} style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <input value={item.producto} onChange={e => set('stockItems', form.stockItems.map((s, j) => s === item ? { ...s, producto: e.target.value } : s))} placeholder="Nombre del producto" style={{ ...inp, flex: 2 }} />
            <input type="number" value={item.cantidad} onChange={e => set('stockItems', form.stockItems.map((s, j) => s === item ? { ...s, cantidad: e.target.value } : s))} placeholder="0" style={{ ...inp, flex: 1 }} />
          </div>
        ))}
      </div>

      {/* Consumo */}
      <div style={sec}>
        <div style={secT}>Consumo interno</div>
        {form.consumos.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div><label style={lbl}>Producto</label><input value={c.producto} onChange={e => set('consumos', form.consumos.map((x, j) => j === i ? { ...x, producto: e.target.value } : x))} placeholder="Producto" style={inp} /></div>
            <div><label style={lbl}>Cantidad</label><input type="number" value={c.cantidad} onChange={e => set('consumos', form.consumos.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} placeholder="0" style={inp} /></div>
            <div><label style={lbl}>Destino</label><input value={c.destino} onChange={e => set('consumos', form.consumos.map((x, j) => j === i ? { ...x, destino: e.target.value } : x))} placeholder="Personal..." style={inp} /></div>
          </div>
        ))}
        <button onClick={() => set('consumos', [...form.consumos, { producto: '', cantidad: '', destino: '' }])} style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>+ Agregar consumo</button>
      </div>

      <button onClick={guardar} disabled={saving} style={{ width: '100%', background: '#f97316', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', cursor: 'pointer', marginBottom: '32px' }}>
        {saving ? 'Guardando...' : '💾 Guardar caja del turno'}
      </button>
    </div>
  )
}

// ─── Historial ────────────────────────────────────────────────────────────────
function CajaHistorial({ registros, onDeleted }: { registros: any[], onDeleted: () => void }) {
  const [selected, setSelected] = useState<any>(null)
  const [detalle, setDetalle] = useState<any>(null)
  const [loadingDet, setLoadingDet] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const secT: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }

  const eliminarCaja = async () => {
    setDeleting(true)
    await supabase.from('caja_registros').delete().eq('id', confirmEliminar.id)
    setDeleting(false)
    setConfirmEliminar(null)
    if (selected?.id === confirmEliminar.id) { setSelected(null); setDetalle(null) }
    onDeleted()
  }

  const loadDetalle = async (reg: any) => {
    setLoadingDet(true); setSelected(reg)
    const [{ data: stock }, { data: cons }, { data: gast }] = await Promise.all([
      supabase.from('caja_stock').select('*').eq('registro_id', reg.id),
      supabase.from('caja_consumo').select('*').eq('registro_id', reg.id),
      supabase.from('caja_gastos').select('*').eq('registro_id', reg.id),
    ])
    setDetalle({ stock, consumos: cons, gastos: gast })
    setLoadingDet(false)
  }

  return (
    <div style={{ paddingRight: selected ? '480px' : '0', transition: 'padding 0.2s' }}>
      {registros.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No hay registros de caja todavía.</div>}
      <div style={{ display: 'grid', gap: '10px' }}>
        {registros.map(reg => {
          const diff = reg.cierre_fisico - reg.cierre_sistema
          const isSel = selected?.id === reg.id
          return (
            <div key={reg.id} onClick={() => loadDetalle(reg)} style={{ background: '#1f2937', border: `1px solid ${isSel ? '#f97316' : '#374151'}`, borderRadius: '10px', padding: '16px 20px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb', fontWeight: 500 }}>{new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Turno {reg.turno}</div>
              </div>
              <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div><div style={{ fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>${(reg.vta_total || 0).toLocaleString('es-AR')}</div></div>
              <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Tickets</div><div style={{ fontSize: '14px', color: '#f9fafb' }}>{reg.vta_total_tickets || 0}</div></div>
              <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Efectivo final</div><div style={{ fontSize: '14px', color: '#60a5fa', fontWeight: 500 }}>${(reg.cierre_fisico || 0).toLocaleString('es-AR')}</div></div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: isSel ? '#f97316' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={e => { e.stopPropagation(); setConfirmEliminar(reg) }}
                  style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '6px', padding: '4px 8px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                  🗑
                </button>
                <span>{isSel ? 'Abierto →' : 'Ver →'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '460px', height: '100vh', background: '#0f1117', borderLeft: '1px solid #374151', overflowY: 'auto', zIndex: 40, padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb' }}>{new Date(selected.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Turno {selected.turno}</div>
            </div>
            <button onClick={() => { setSelected(null); setDetalle(null) }} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>✕</button>
          </div>

          {loadingDet ? <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div> : detalle && (
            <>
              <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <div style={secT}>Ventas</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: '4px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#4b5563' }}>Canal</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', textAlign: 'right' }}>$</div>
                  <div style={{ fontSize: '11px', color: '#4b5563', textAlign: 'right' }}>Tickets</div>
                </div>
                {[
                  ['Ventas totales', selected.vta_total, selected.vta_total_tickets],
                  ['PEYA efectivo', selected.vta_peya_efv, selected.vta_peya_efv_tickets],
                  ['Tarjetas / MP', selected.vta_tarjetas, selected.vta_tarjetas_tickets],
                  ['Efectivo (calc.)', (selected.vta_total || 0) - (selected.vta_tarjetas || 0), null],
                ].map(([k, v, t]) => (
                  <div key={k as string} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{k}</span>
                    <span style={{ fontSize: '13px', color: '#f9fafb', textAlign: 'right' }}>${(v as number || 0).toLocaleString('es-AR')}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280', textAlign: 'right' }}>{t !== null ? t : '—'}</span>
                  </div>
                ))}
              </div>

              {(detalle.gastos?.length > 0 || selected.retiros > 0) && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={secT}>Gastos y retiros</div>
                  {selected.retiros > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '13px', color: '#9ca3af' }}>Retiros</span><span style={{ fontSize: '13px', color: '#f9fafb' }}>${selected.retiros.toLocaleString('es-AR')}</span></div>}
                  {detalle.gastos?.map((g: any) => <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontSize: '13px', color: '#9ca3af' }}>{g.categoria}</span><span style={{ fontSize: '13px', color: '#f9fafb' }}>${g.monto.toLocaleString('es-AR')}</span></div>)}
                  <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>Total</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f87171' }}>${(selected.gastos || 0).toLocaleString('es-AR')}</span>
                  </div>
                </div>
              )}

              <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <div style={secT}>Cierre</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Efectivo final</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80' }}>${(selected.cierre_fisico || 0).toLocaleString('es-AR')}</span>
                </div>
              </div>

              {detalle.stock?.length > 0 && <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}><div style={secT}>Stock</div>{detalle.stock.map((s: any) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '13px', color: '#9ca3af' }}>{s.producto} <span style={{ color: '#4b5563', fontSize: '11px' }}>({s.momento || 'cierre'})</span></span><span style={{ fontSize: '13px', color: '#f9fafb' }}>{s.cantidad} {s.unidad}</span></div>)}</div>}
              {detalle.consumos?.length > 0 && <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}><div style={secT}>Consumo interno</div>{detalle.consumos.map((c: any) => <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '13px', color: '#9ca3af' }}>{c.producto}{c.destino ? ` (${c.destino})` : ''}</span><span style={{ fontSize: '13px', color: '#f9fafb' }}>{c.cantidad}</span></div>)}</div>}
              {detalle.checklists?.length > 0 && <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}><div style={secT}>Checklist</div>{detalle.checklists.map((c: any) => <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}><span style={{ fontSize: '16px' }}>{c.completado ? '✅' : '⬜'}</span><span style={{ fontSize: '13px', color: c.completado ? '#f9fafb' : '#6b7280' }}>{c.item}</span></div>)}</div>}
              {selected.notas && <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}><div style={secT}>Notas</div><p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>{selected.notas}</p></div>}
            </>
          )}
        </div>
      )}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar este registro?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
              Turno <strong style={{ color: '#f9fafb' }}>{confirmEliminar.turno}</strong> del{' '}
              <strong style={{ color: '#f9fafb' }}>{new Date(confirmEliminar.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</strong>.
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={eliminarCaja} disabled={deleting} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default function CajaPage() {
  const { selectedId: restaurantId, role, userId } = useRestaurant()
  const [loading, setLoading] = useState(true)
  const [vistaAdmin, setVistaAdmin] = useState<'cargar' | 'historial'>('historial')
  const [registros, setRegistros] = useState<any[]>([])

  const loadRegistros = async (rid: string) => {
    const { data } = await supabase.from('caja_registros').select('*').eq('restaurant_id', rid).order('fecha', { ascending: false }).order('turno', { ascending: true }).limit(60)
    setRegistros(data || [])
  }

  useEffect(() => {
    if (restaurantId) {
      if (role === 'admin' || role === 'franquiciado') loadRegistros(restaurantId)
      setLoading(false)
    }
  }, [restaurantId, role])

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Caja</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{role === 'admin' ? 'Historial y gestión de turnos' : 'Carga del turno diario'}</p>
        </div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['historial', 'cargar'] as const).map(v => (
              <button key={v} onClick={() => setVistaAdmin(v)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: vistaAdmin === v ? '#f97316' : 'transparent', border: `1px solid ${vistaAdmin === v ? '#f97316' : '#374151'}`, color: vistaAdmin === v ? 'white' : '#9ca3af' }}>
                {v === 'historial' ? '📊 Historial' : '➕ Cargar turno'}
              </button>
            ))}
          </div>
        )}
      </div>

      {role === 'admin'
        ? vistaAdmin === 'historial'
          ? <CajaHistorial registros={registros} onDeleted={() => loadRegistros(restaurantId)} />
          : <CajaFormulario restaurantId={restaurantId} userId={userId} role={role} onSaved={() => { loadRegistros(restaurantId); setVistaAdmin('historial') }} />
        : <CajaFormulario restaurantId={restaurantId} userId={userId} role={role} onSaved={() => {}} />
      }
    </div>
  )
}
