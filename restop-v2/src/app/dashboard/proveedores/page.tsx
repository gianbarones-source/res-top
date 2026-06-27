'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_NUM = [1, 2, 3, 4, 5, 6, 7]

function diasHastaProximaEntrega(diasEntrega: number[], hoy: number): number {
  if (!diasEntrega?.length) return 1
  const proximos = diasEntrega.map(d => d > hoy ? d - hoy : 7 - hoy + d).sort((a, b) => a - b)
  return proximos[0] || 1
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}

export default function ProveedoresPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [proveedores, setProveedores] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState<{ texto: string; proveedor: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [restaurante, setRestaurante] = useState<any>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)
  const [errorNuevo, setErrorNuevo] = useState('')
  const [nuevo, setNuevo] = useState({
    nombre: '', rubro: '', telefono: '', tipo_pedido: 'A',
    dias_entrega: [] as number[], template_mensaje: ''
  })

  const eliminarProveedor = async (id: string) => {
    setSaving(true)
    await supabase.from('proveedores').delete().eq('id', id)
    setSaving(false)
    setConfirmEliminar(null)
    load()
  }

  const load = async () => {
    if (!restaurantId) return
    const [{ data: provs }, { data: stk }, { data: rest }] = await Promise.all([
      supabase.from('proveedores').select('*').eq('restaurant_id', restaurantId),
      supabase.from('stock').select('*').eq('restaurant_id', restaurantId),
      supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    ])
    setProveedores(provs || [])
    setStock(stk || [])
    setRestaurante(rest)
    setLoading(false)
  }

  useEffect(() => { load() }, [restaurantId])

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

  const toggleDia = (dia: number) => {
    setNuevo(prev => ({
      ...prev,
      dias_entrega: prev.dias_entrega.includes(dia)
        ? prev.dias_entrega.filter(d => d !== dia)
        : [...prev.dias_entrega, dia].sort((a, b) => a - b)
    }))
  }

  const saveNuevo = async () => {
    setErrorNuevo('')
    if (!nuevo.nombre.trim()) { setErrorNuevo('El nombre del proveedor es obligatorio.'); return }
    setSaving(true)
    const { error } = await supabase.from('proveedores').insert({
      restaurant_id: restaurantId,
      nombre: nuevo.nombre.trim(),
      rubro: nuevo.rubro.trim() || null,
      telefono: nuevo.telefono.trim() || null,
      tipo_pedido: nuevo.tipo_pedido,
      dias_entrega: nuevo.dias_entrega.length > 0 ? nuevo.dias_entrega : null,
      template_mensaje: nuevo.template_mensaje.trim() || null,
    })
    setSaving(false)
    if (error) { setErrorNuevo('Error al guardar: ' + error.message); return }
    setShowNuevo(false)
    setNuevo({ nombre: '', rubro: '', telefono: '', tipo_pedido: 'A', dias_entrega: [], template_mensaje: '' })
    load()
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Proveedores</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{proveedores.length} proveedores activos</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => setShowNuevo(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            + Agregar proveedor
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {proveedores.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No hay proveedores cargados. {role === 'admin' && 'Agregá el primero con el botón arriba.'}
          </div>
        )}
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
              {role === 'admin' && (
                <button onClick={() => setConfirmEliminar(prov)} style={{
                  width: '100%', marginTop: '8px', background: 'transparent', border: '1px solid #374151',
                  borderRadius: '8px', padding: '8px', fontSize: '12px', color: '#f87171', cursor: 'pointer'
                }}>
                  🗑 Eliminar proveedor
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* MODAL AGREGAR PROVEEDOR */}
      {showNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Agregar proveedor</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Nuevo proveedor para pedidos y stock</p>

            <label style={labelStyle}>Nombre *</label>
            <input value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Ej: Distribuidora Norte" style={{ ...inputStyle, marginBottom: '14px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Rubro</label>
                <input value={nuevo.rubro} onChange={e => setNuevo({ ...nuevo, rubro: e.target.value })}
                  placeholder="Ej: Carnes, Lácteos..." style={{ ...inputStyle }} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono / WhatsApp</label>
                <input value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })}
                  placeholder="+54 9 11 ..." style={{ ...inputStyle }} />
              </div>
            </div>

            <label style={labelStyle}>Tipo de pedido</label>
            <select value={nuevo.tipo_pedido} onChange={e => setNuevo({ ...nuevo, tipo_pedido: e.target.value })}
              style={{ ...inputStyle, marginBottom: '14px' }}>
              <option value="A">Tipo A — Pedido diario</option>
              <option value="B">Tipo B — Pedido por días de entrega</option>
            </select>

            <label style={{ ...labelStyle, marginBottom: '10px' }}>Días de entrega</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {DIAS_NUM.map(d => (
                <button key={d} type="button" onClick={() => toggleDia(d)} style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                  background: nuevo.dias_entrega.includes(d) ? '#f97316' : '#1f2937',
                  border: `1px solid ${nuevo.dias_entrega.includes(d) ? '#f97316' : '#374151'}`,
                  color: nuevo.dias_entrega.includes(d) ? 'white' : '#9ca3af'
                }}>
                  {DIAS[d]}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Template de mensaje (opcional)</label>
            <textarea value={nuevo.template_mensaje} onChange={e => setNuevo({ ...nuevo, template_mensaje: e.target.value })}
              placeholder={'Hola {nombre_proveedor}, buen día.\nTe hago el pedido:\n\n{items}\n\nGracias.\n— {nombre_restaurante}'}
              rows={4}
              style={{ ...inputStyle, marginBottom: '6px', resize: 'vertical' }} />
            <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '20px' }}>
              Variables: {'{nombre_proveedor}'}, {'{nombre_restaurante}'}, {'{items}'}, {'{dia_entrega}'}
            </p>

            {errorNuevo && (
              <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
                {errorNuevo}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowNuevo(false); setErrorNuevo('') }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveNuevo} disabled={saving}
                style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Guardando...' : 'Agregar proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar proveedor?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
              Vas a eliminar <strong style={{ color: '#f9fafb' }}>{confirmEliminar.nombre}</strong>. Los productos asociados quedarán sin proveedor.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => eliminarProveedor(confirmEliminar.id)} disabled={saving} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {saving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MENSAJE */}
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
