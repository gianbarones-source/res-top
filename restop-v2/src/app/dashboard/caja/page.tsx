'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const CHECKLIST_ITEMS = [
  'Limpieza de equipos',
  'Control de temperaturas',
  'Stock de insumos verificado',
  'Caja ordenada',
  'Cierre de local completo',
]

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}
const sectionStyle: React.CSSProperties = {
  background: '#1f2937', border: '1px solid #374151', borderRadius: '12px',
  padding: '20px', marginBottom: '16px'
}
const sectionTitle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: '#f97316', textTransform: 'uppercase',
  letterSpacing: '0.5px', marginBottom: '16px'
}

type Desperdicio = { producto: string; cantidad: string; motivo: string; foto: File | null; fotoUrl?: string }
type Consumo = { producto: string; cantidad: string; destino: string }
type StockItem = { producto: string; cantidad: string; unidad: string }

export default function CajaPage() {
  const [role, setRole] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Vista admin
  const [vistaAdmin, setVistaAdmin] = useState<'cargar' | 'historial'>('historial')
  const [registros, setRegistros] = useState<any[]>([])
  const [registroSeleccionado, setRegistroSeleccionado] = useState<any>(null)
  const [detalleRegistro, setDetalleRegistro] = useState<any>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Formulario
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [turno, setTurno] = useState<'TM' | 'TN'>('TM')
  const [cajaApertura, setCajaApertura] = useState('')
  const [vtaEfectivo, setVtaEfectivo] = useState('')
  const [vtaTarjetas, setVtaTarjetas] = useState('')
  const [vtaPeyaEfv, setVtaPeyaEfv] = useState('')
  const [vtaPeyaTickets, setVtaPeyaTickets] = useState('')
  const [retiros, setRetiros] = useState('')
  const [gastos, setGastos] = useState('')
  const [cierreFisico, setCierreFisico] = useState('')
  const [cierreSistema, setCierreSistema] = useState('')
  const [notas, setNotas] = useState('')

  const [stockItems, setStockItems] = useState<StockItem[]>([
    { producto: 'Panes', cantidad: '', unidad: 'un' },
    { producto: 'Wraps', cantidad: '', unidad: 'un' },
    { producto: 'Ensaladas', cantidad: '', unidad: 'un' },
    { producto: 'Botellas', cantidad: '', unidad: 'un' },
    { producto: 'Snacks', cantidad: '', unidad: 'un' },
    { producto: 'Cookies', cantidad: '', unidad: 'un' },
  ])

  const [desperdicios, setDesperdicios] = useState<Desperdicio[]>([
    { producto: '', cantidad: '', motivo: '', foto: null }
  ])

  const [consumos, setConsumos] = useState<Consumo[]>([
    { producto: '', cantidad: '', destino: '' }
  ])

  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(i => [i, false]))
  )

  const totalVentas = [vtaEfectivo, vtaTarjetas, vtaPeyaEfv, vtaPeyaTickets]
    .reduce((a, v) => a + (parseFloat(v) || 0), 0)
  const totalGastos = (parseFloat(retiros) || 0) + (parseFloat(gastos) || 0)
  const diferencia = (parseFloat(cierreFisico) || 0) - (parseFloat(cierreSistema) || 0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('restaurant_id, role').eq('id', user.id).single()
      if (!profile) return
      setRole(profile.role)
      setRestaurantId(profile.restaurant_id)
      if (profile.role === 'admin') {
        loadRegistros(profile.restaurant_id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const loadRegistros = async (rid: string) => {
    const { data } = await supabase
      .from('caja_registros')
      .select('*')
      .eq('restaurant_id', rid)
      .order('fecha', { ascending: false })
      .order('turno', { ascending: true })
      .limit(60)
    setRegistros(data || [])
  }

  const loadDetalle = async (reg: any) => {
    setLoadingDetalle(true)
    setRegistroSeleccionado(reg)
    const [{ data: stock }, { data: desp }, { data: cons }, { data: check }] = await Promise.all([
      supabase.from('caja_stock').select('*').eq('registro_id', reg.id),
      supabase.from('caja_desperdicios').select('*').eq('registro_id', reg.id),
      supabase.from('caja_consumo').select('*').eq('registro_id', reg.id),
      supabase.from('caja_checklists').select('*').eq('registro_id', reg.id),
    ])
    setDetalleRegistro({ stock, desperdicios: desp, consumos: cons, checklists: check })
    setLoadingDetalle(false)
  }

  const uploadFoto = async (file: File, registroId: string, index: number): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `${registroId}/desperdicio-${index}.${ext}`
    const { error } = await supabase.storage.from('caja-fotos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('caja-fotos').getPublicUrl(path)
    return data.publicUrl
  }

  const guardarCaja = async () => {
    setSaving(true)
    setSavedMsg('')

    const { data: registro, error } = await supabase.from('caja_registros').insert({
      restaurant_id: restaurantId,
      fecha,
      turno,
      creado_por: userId,
      caja_apertura: parseFloat(cajaApertura) || 0,
      vta_efectivo: parseFloat(vtaEfectivo) || 0,
      vta_tarjetas: parseFloat(vtaTarjetas) || 0,
      vta_peya_efv: parseFloat(vtaPeyaEfv) || 0,
      vta_peya_tickets: parseFloat(vtaPeyaTickets) || 0,
      retiros: parseFloat(retiros) || 0,
      gastos: parseFloat(gastos) || 0,
      cierre_fisico: parseFloat(cierreFisico) || 0,
      cierre_sistema: parseFloat(cierreSistema) || 0,
      notas: notas.trim() || null,
    }).select().single()

    if (error || !registro) {
      setSaving(false)
      setSavedMsg('Error al guardar: ' + error?.message)
      return
    }

    const rid = registro.id

    const stockData = stockItems.filter(s => s.cantidad).map(s => ({
      registro_id: rid, producto: s.producto, cantidad: parseFloat(s.cantidad), unidad: s.unidad
    }))
    if (stockData.length) await supabase.from('caja_stock').insert(stockData)

    for (let i = 0; i < desperdicios.length; i++) {
      const d = desperdicios[i]
      if (!d.producto) continue
      let fotoUrl = null
      if (d.foto) fotoUrl = await uploadFoto(d.foto, rid, i)
      await supabase.from('caja_desperdicios').insert({
        registro_id: rid, producto: d.producto,
        cantidad: parseFloat(d.cantidad) || 0,
        motivo: d.motivo || null, foto_url: fotoUrl
      })
    }

    const consumoData = consumos.filter(c => c.producto).map(c => ({
      registro_id: rid, producto: c.producto,
      cantidad: parseFloat(c.cantidad) || 0, destino: c.destino || null
    }))
    if (consumoData.length) await supabase.from('caja_consumo').insert(consumoData)

    const checkData = Object.entries(checklist).map(([item, completado]) => ({
      registro_id: rid, item, completado
    }))
    if (checkData.length) await supabase.from('caja_checklists').insert(checkData)

    setSaving(false)
    setSavedMsg('✓ Caja guardada correctamente')

    setCajaApertura(''); setVtaEfectivo(''); setVtaTarjetas('')
    setVtaPeyaEfv(''); setVtaPeyaTickets('')
    setRetiros(''); setGastos(''); setCierreFisico(''); setCierreSistema(''); setNotas('')
    setStockItems(prev => prev.map(s => ({ ...s, cantidad: '' })))
    setDesperdicios([{ producto: '', cantidad: '', motivo: '', foto: null }])
    setConsumos([{ producto: '', cantidad: '', destino: '' }])
    setChecklist(Object.fromEntries(CHECKLIST_ITEMS.map(i => [i, false])))

    if (role === 'admin') loadRegistros(restaurantId)
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  const Formulario = () => (
    <div style={{ maxWidth: '700px' }}>
      {savedMsg && (
        <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#4ade80', marginBottom: '20px' }}>
          {savedMsg}
        </div>
      )}

      <div style={sectionStyle}>
        <div style={sectionTitle}>Identificación del turno</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Turno</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['TM', 'TN'] as const).map(t => (
                <button key={t} onClick={() => setTurno(t)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: turno === t ? '#f97316' : '#1f2937',
                  border: `1px solid ${turno === t ? '#f97316' : '#374151'}`,
                  color: turno === t ? 'white' : '#9ca3af'
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Apertura de caja</div>
        <label style={labelStyle}>Efectivo en caja al abrir $</label>
        <input type="number" value={cajaApertura} onChange={e => setCajaApertura(e.target.value)} placeholder="0" style={inputStyle} />
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Ventas del turno</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Efectivo $', val: vtaEfectivo, set: setVtaEfectivo },
            { label: 'Tarjetas $', val: vtaTarjetas, set: setVtaTarjetas },
            { label: 'PEYA Efectivo $', val: vtaPeyaEfv, set: setVtaPeyaEfv },
            { label: 'PEYA Tickets $', val: vtaPeyaTickets, set: setVtaPeyaTickets },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Total ventas</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>${totalVentas.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Retiros y gastos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Retiros efectivo $</label>
            <input type="number" value={retiros} onChange={e => setRetiros(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Total gastos $</label>
            <input type="number" value={gastos} onChange={e => setGastos(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '12px', background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Total gastos</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#f87171' }}>${totalGastos.toLocaleString('es-AR')}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Cierre de caja</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Conteo físico $</label>
            <input type="number" value={cierreFisico} onChange={e => setCierreFisico(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Sistema $</label>
            <input type="number" value={cierreSistema} onChange={e => setCierreSistema(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '12px', background: '#111827', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Diferencia</span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: diferencia === 0 ? '#4ade80' : diferencia > 0 ? '#60a5fa' : '#f87171' }}>
            {diferencia > 0 ? '+' : ''}${diferencia.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Conteo de stock</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {stockItems.map((item, i) => (
            <div key={i}>
              <label style={labelStyle}>
                {i >= 6
                  ? <input value={item.producto}
                      onChange={e => setStockItems(prev => prev.map((s, j) => j === i ? { ...s, producto: e.target.value } : s))}
                      placeholder="Nombre del producto"
                      style={{ ...inputStyle, marginBottom: '6px', fontSize: '12px', padding: '6px 10px' }} />
                  : item.producto
                }
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="number" value={item.cantidad}
                  onChange={e => setStockItems(prev => prev.map((s, j) => j === i ? { ...s, cantidad: e.target.value } : s))}
                  placeholder="0" style={{ ...inputStyle, flex: 1 }} />
                <select value={item.unidad}
                  onChange={e => setStockItems(prev => prev.map((s, j) => j === i ? { ...s, unidad: e.target.value } : s))}
                  style={{ background: '#374151', border: '1px solid #4b5563', borderRadius: '8px', color: '#9ca3af', fontSize: '12px', padding: '0 8px', outline: 'none' }}>
                  {['un', 'kg', 'lt', 'caja'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setStockItems(prev => [...prev, { producto: '', cantidad: '', unidad: 'un' }])}
          style={{ marginTop: '12px', background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
          + Agregar producto
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Desperdicios / mermas</div>
        {desperdicios.map((d, i) => (
          <div key={i} style={{ background: '#111827', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Producto</label>
                <input value={d.producto} onChange={e => setDesperdicios(prev => prev.map((x, j) => j === i ? { ...x, producto: e.target.value } : x))}
                  placeholder="Ej: Pan de hamburguesa" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cantidad</label>
                <input type="number" value={d.cantidad} onChange={e => setDesperdicios(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                  placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Motivo</label>
              <input value={d.motivo} onChange={e => setDesperdicios(prev => prev.map((x, j) => j === i ? { ...x, motivo: e.target.value } : x))}
                placeholder="Vencimiento, caída, error..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Foto (opcional)</label>
              <input type="file" accept="image/*" capture="environment"
                onChange={e => {
                  const file = e.target.files?.[0] || null
                  setDesperdicios(prev => prev.map((x, j) => j === i ? { ...x, foto: file, fotoUrl: file ? URL.createObjectURL(file) : undefined } : x))
                }}
                style={{ ...inputStyle, padding: '8px' }} />
              {d.fotoUrl && (
                <img src={d.fotoUrl} alt="preview" style={{ marginTop: '8px', width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #374151' }} />
              )}
            </div>
          </div>
        ))}
        <button onClick={() => setDesperdicios(prev => [...prev, { producto: '', cantidad: '', motivo: '', foto: null }])}
          style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
          + Agregar desperdicio
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Consumo interno</div>
        {consumos.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Producto</label>
              <input value={c.producto} onChange={e => setConsumos(prev => prev.map((x, j) => j === i ? { ...x, producto: e.target.value } : x))}
                placeholder="Producto" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cantidad</label>
              <input type="number" value={c.cantidad} onChange={e => setConsumos(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Destino</label>
              <input value={c.destino} onChange={e => setConsumos(prev => prev.map((x, j) => j === i ? { ...x, destino: e.target.value } : x))}
                placeholder="Personal, etc." style={inputStyle} />
            </div>
          </div>
        ))}
        <button onClick={() => setConsumos(prev => [...prev, { producto: '', cantidad: '', destino: '' }])}
          style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: '8px', padding: '8px', width: '100%', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
          + Agregar consumo
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Checklist de cierre</div>
        {CHECKLIST_ITEMS.map(item => (
          <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={checklist[item]} onChange={e => setChecklist(prev => ({ ...prev, [item]: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: '#f97316' }} />
            <span style={{ fontSize: '14px', color: checklist[item] ? '#f9fafb' : '#9ca3af' }}>{item}</span>
          </label>
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>Notas del turno</div>
        <textarea value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, incidentes, novedades..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <button onClick={guardarCaja} disabled={saving} style={{
        width: '100%', background: '#f97316', border: 'none', borderRadius: '10px',
        padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white',
        cursor: 'pointer', marginBottom: '32px'
      }}>
        {saving ? 'Guardando...' : '💾 Guardar caja del turno'}
      </button>
    </div>
  )

  const Historial = () => (
    <div style={{ paddingRight: registroSeleccionado ? '480px' : '0', transition: 'padding 0.2s' }}>
      {registros.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          No hay registros de caja todavía.
        </div>
      )}

      <div style={{ display: 'grid', gap: '10px' }}>
        {registros.map(reg => {
          const totalVtaReg = reg.vta_efectivo + reg.vta_tarjetas + reg.vta_peya_efv + reg.vta_peya_tickets
          const diffReg = reg.cierre_fisico - reg.cierre_sistema
          const isSelected = registroSeleccionado?.id === reg.id
          return (
            <div key={reg.id} onClick={() => loadDetalle(reg)} style={{
              background: '#1f2937',
              border: `1px solid ${isSelected ? '#f97316' : '#374151'}`,
              borderRadius: '10px', padding: '16px 20px', cursor: 'pointer',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
              alignItems: 'center', gap: '12px',
              transition: 'border-color 0.15s'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#f9fafb', fontWeight: 500 }}>
                  {new Date(reg.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Turno {reg.turno}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Ventas</div>
                <div style={{ fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>${totalVtaReg.toLocaleString('es-AR')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Diferencia</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: diffReg === 0 ? '#9ca3af' : diffReg > 0 ? '#60a5fa' : '#f87171' }}>
                  {diffReg > 0 ? '+' : ''}${diffReg.toLocaleString('es-AR')}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: isSelected ? '#f97316' : '#6b7280' }}>
                {isSelected ? 'Abierto →' : 'Ver detalle →'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Panel lateral detalle */}
      {registroSeleccionado && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '460px', height: '100vh',
          background: '#0f1117', borderLeft: '1px solid #374151',
          overflowY: 'auto', zIndex: 40, padding: '28px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb' }}>
                {new Date(registroSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Turno {registroSeleccionado.turno}</div>
            </div>
            <button onClick={() => { setRegistroSeleccionado(null); setDetalleRegistro(null) }}
              style={{ background: 'transparent', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>

          {loadingDetalle ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
          ) : detalleRegistro && (
            <>
              <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <div style={sectionTitle}>Ventas</div>
                {[
                  ['Efectivo', registroSeleccionado.vta_efectivo],
                  ['Tarjetas', registroSeleccionado.vta_tarjetas],
                  ['PEYA Efectivo', registroSeleccionado.vta_peya_efv],
                  ['PEYA Tickets', registroSeleccionado.vta_peya_tickets],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{k}</span>
                    <span style={{ fontSize: '13px', color: '#f9fafb' }}>${(v as number).toLocaleString('es-AR')}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>Total</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80' }}>
                    ${(registroSeleccionado.vta_efectivo + registroSeleccionado.vta_tarjetas + registroSeleccionado.vta_peya_efv + registroSeleccionado.vta_peya_tickets).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <div style={sectionTitle}>Cierre</div>
                {[
                  ['Apertura', registroSeleccionado.caja_apertura],
                  ['Retiros', registroSeleccionado.retiros],
                  ['Gastos', registroSeleccionado.gastos],
                  ['Cierre físico', registroSeleccionado.cierre_fisico],
                  ['Cierre sistema', registroSeleccionado.cierre_sistema],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{k}</span>
                    <span style={{ fontSize: '13px', color: '#f9fafb' }}>${(v as number).toLocaleString('es-AR')}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>Diferencia</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: (registroSeleccionado.cierre_fisico - registroSeleccionado.cierre_sistema) >= 0 ? '#60a5fa' : '#f87171' }}>
                    ${(registroSeleccionado.cierre_fisico - registroSeleccionado.cierre_sistema).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {detalleRegistro.stock?.length > 0 && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={sectionTitle}>Stock</div>
                  {detalleRegistro.stock.map((s: any) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{s.producto}</span>
                      <span style={{ fontSize: '13px', color: '#f9fafb' }}>{s.cantidad} {s.unidad}</span>
                    </div>
                  ))}
                </div>
              )}

              {detalleRegistro.desperdicios?.length > 0 && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={sectionTitle}>Desperdicios</div>
                  {detalleRegistro.desperdicios.map((d: any) => (
                    <div key={d.id} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: '#f9fafb' }}>{d.producto}</span>
                        <span style={{ fontSize: '13px', color: '#f87171' }}>{d.cantidad}</span>
                      </div>
                      {d.motivo && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{d.motivo}</div>}
                      {d.foto_url && <img src={d.foto_url} alt="foto" style={{ marginTop: '6px', width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #374151' }} />}
                    </div>
                  ))}
                </div>
              )}

              {detalleRegistro.consumos?.length > 0 && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={sectionTitle}>Consumo interno</div>
                  {detalleRegistro.consumos.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{c.producto}{c.destino ? ` (${c.destino})` : ''}</span>
                      <span style={{ fontSize: '13px', color: '#f9fafb' }}>{c.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}

              {detalleRegistro.checklists?.length > 0 && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={sectionTitle}>Checklist</div>
                  {detalleRegistro.checklists.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{c.completado ? '✅' : '⬜'}</span>
                      <span style={{ fontSize: '13px', color: c.completado ? '#f9fafb' : '#6b7280' }}>{c.item}</span>
                    </div>
                  ))}
                </div>
              )}

              {registroSeleccionado.notas && (
                <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                  <div style={sectionTitle}>Notas</div>
                  <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>{registroSeleccionado.notas}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Caja</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {role === 'admin' ? 'Historial y gestión de turnos' : 'Carga del turno diario'}
          </p>
        </div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['historial', 'cargar'] as const).map(v => (
              <button key={v} onClick={() => setVistaAdmin(v)} style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                background: vistaAdmin === v ? '#f97316' : 'transparent',
                border: `1px solid ${vistaAdmin === v ? '#f97316' : '#374151'}`,
                color: vistaAdmin === v ? 'white' : '#9ca3af'
              }}>
                {v === 'historial' ? '📊 Historial' : '➕ Cargar turno'}
              </button>
            ))}
          </div>
        )}
      </div>

      {role === 'admin'
        ? vistaAdmin === 'historial' ? <Historial /> : <Formulario />
        : <Formulario />
      }
    </div>
  )
}
