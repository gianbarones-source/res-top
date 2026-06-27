'use client'
import { useRestaurant } from '@/context/RestaurantContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function Pill({ status }: { status: 'ok' | 'warn' | 'danger' }) {
  const cfg = {
    ok: { bg: '#052e16', color: '#4ade80', border: '#166534', label: 'OK' },
    warn: { bg: '#1c1917', color: '#f97316', border: '#78350f', label: 'Bajo' },
    danger: { bg: '#1c0a0a', color: '#f87171', border: '#7f1d1d', label: 'Alerta' },
  }[status]
  return (
    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', padding: '10px 14px', color: '#f9fafb',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const lbl: React.CSSProperties = {
  fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px'
}

type ProductoForm = {
  producto: string; unidad: string; cantidad_actual: string
  cantidad_minima: string; cantidad_objetivo: string
  proveedor_id: string; es_objetivo_por_dia: boolean
}

const defaultForm = (): ProductoForm => ({
  producto: '', unidad: 'kg', cantidad_actual: '', cantidad_minima: '', cantidad_objetivo: '',
  proveedor_id: '', es_objetivo_por_dia: false
})

// ─── Modal como componente independiente ─────────────────────────────────────
function ModalProducto({ titulo, form, setForm, onSave, onCancel, error, saving, proveedores }: {
  titulo: string; form: ProductoForm; setForm: (f: ProductoForm) => void
  onSave: () => void; onCancel: () => void; error: string; saving: boolean; proveedores: any[]
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' }}>{titulo}</h2>

        <label style={lbl}>Nombre del producto *</label>
        <input value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}
          placeholder="Ej: Harina 000" style={{ ...inp, marginBottom: '14px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={lbl}>Unidad</label>
            <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} style={inp}>
              {['kg', 'g', 'lt', 'ml', 'un', 'caja', 'bolsa', 'paquete'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Proveedor</label>
            <select value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })} style={inp}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={lbl}>Stock actual</label>
            <input type="number" value={form.cantidad_actual} onChange={e => setForm({ ...form, cantidad_actual: e.target.value })} placeholder="0" style={inp} />
          </div>
          <div>
            <label style={lbl}>Mínimo</label>
            <input type="number" value={form.cantidad_minima} onChange={e => setForm({ ...form, cantidad_minima: e.target.value })} placeholder="0" style={inp} />
          </div>
          <div>
            <label style={lbl}>Objetivo</label>
            <input type="number" value={form.cantidad_objetivo} onChange={e => setForm({ ...form, cantidad_objetivo: e.target.value })} placeholder="0" style={inp} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.es_objetivo_por_dia}
            onChange={e => setForm({ ...form, es_objetivo_por_dia: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#f97316' }} />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Objetivo es por día (para calcular pedidos)</span>
        </label>

        {error && (
          <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving} style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function StockPage() {
  const { selectedId: restaurantId, role, userId } = useRestaurant()
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [mermaItem, setMermaItem] = useState<any | null>(null)
  const [mermaQty, setMermaQty] = useState('')
  const [mermaMotivo, setMermaMotivo] = useState('')
  const [mermaFoto, setMermaFoto] = useState<File | null>(null)
  const [mermaFotoUrl, setMermaFotoUrl] = useState<string | null>(null)

  const [showAgregar, setShowAgregar] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<ProductoForm>(defaultForm())
  const [errorAgregar, setErrorAgregar] = useState('')

  const [showEditar, setShowEditar] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState<ProductoForm>(defaultForm())
  const [errorEditar, setErrorEditar] = useState('')

  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  const load = async () => {
    if (!restaurantId) return
    const [{ data }, { data: provs }] = await Promise.all([
      supabase.from('stock').select('*, proveedores(nombre)').eq('restaurant_id', restaurantId).order('producto'),
      supabase.from('proveedores').select('id, nombre').eq('restaurant_id', restaurantId).order('nombre')
    ])
    setItems(data || [])
    setProveedores(provs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [restaurantId])

  const getStatus = (item: any): 'ok' | 'warn' | 'danger' => {
    if (item.cantidad_actual <= item.cantidad_minima) return 'danger'
    if (item.cantidad_actual <= item.cantidad_minima * 1.3) return 'warn'
    return 'ok'
  }

  const abrirEditar = (item: any) => {
    setEditando(item)
    setEditForm({
      producto: item.producto, unidad: item.unidad,
      cantidad_actual: String(item.cantidad_actual),
      cantidad_minima: String(item.cantidad_minima),
      cantidad_objetivo: String(item.cantidad_objetivo),
      proveedor_id: item.proveedor_id || '',
      es_objetivo_por_dia: item.es_objetivo_por_dia || false
    })
    setErrorEditar('')
    setShowEditar(true)
  }

  const saveEditar = async () => {
    setErrorEditar('')
    if (!editForm.producto.trim()) { setErrorEditar('El nombre es obligatorio.'); return }
    setSaving(true)
    const { error } = await supabase.from('stock').update({
      producto: editForm.producto.trim(), unidad: editForm.unidad,
      cantidad_actual: parseFloat(editForm.cantidad_actual) || 0,
      cantidad_minima: parseFloat(editForm.cantidad_minima) || 0,
      cantidad_objetivo: parseFloat(editForm.cantidad_objetivo) || 0,
      proveedor_id: editForm.proveedor_id || null,
      es_objetivo_por_dia: editForm.es_objetivo_por_dia,
      ultima_actualizacion_manual: new Date().toISOString()
    }).eq('id', editando.id)
    setSaving(false)
    if (error) { setErrorEditar('Error: ' + error.message); return }
    setShowEditar(false)
    load()
  }

  const eliminar = async () => {
    setSaving(true)
    await supabase.from('stock').delete().eq('id', confirmEliminar.id)
    setSaving(false)
    setConfirmEliminar(null)
    load()
  }

  const saveMerma = async () => {
    if (!mermaItem || !mermaQty) return
    setSaving(true)
    let fotoUrl = null
    if (mermaFoto) {
      const ext = mermaFoto.name.split('.').pop()
      const path = `mermas/${mermaItem.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('caja-fotos').upload(path, mermaFoto, { upsert: true })
      if (!upErr) fotoUrl = supabase.storage.from('caja-fotos').getPublicUrl(path).data.publicUrl
    }
    await Promise.all([
      supabase.from('mermas').insert({ restaurant_id: restaurantId, stock_id: mermaItem.id, producto: mermaItem.producto, cantidad: parseFloat(mermaQty), unidad: mermaItem.unidad, motivo: mermaMotivo || null, foto_url: fotoUrl }),
      supabase.from('stock').update({ cantidad_actual: Math.max(0, mermaItem.cantidad_actual - parseFloat(mermaQty)) }).eq('id', mermaItem.id)
    ])
    setMermaItem(null); setMermaQty(''); setMermaMotivo(''); setMermaFoto(null); setMermaFotoUrl(null)
    setSaving(false); load()
  }

  const saveNuevo = async () => {
    setErrorAgregar('')
    if (!nuevoForm.producto.trim()) { setErrorAgregar('El nombre del producto es obligatorio.'); return }
    if (!nuevoForm.cantidad_actual || !nuevoForm.cantidad_minima || !nuevoForm.cantidad_objetivo) {
      setErrorAgregar('Completá las cantidades.'); return
    }
    setSaving(true)
    const { error } = await supabase.from('stock').insert({
      restaurant_id: restaurantId,
      producto: nuevoForm.producto.trim(), unidad: nuevoForm.unidad,
      cantidad_actual: parseFloat(nuevoForm.cantidad_actual),
      cantidad_minima: parseFloat(nuevoForm.cantidad_minima),
      cantidad_objetivo: parseFloat(nuevoForm.cantidad_objetivo),
      proveedor_id: nuevoForm.proveedor_id || null,
      es_objetivo_por_dia: nuevoForm.es_objetivo_por_dia,
      ultima_actualizacion_manual: new Date().toISOString()
    })
    setSaving(false)
    if (error) { setErrorAgregar('Error: ' + error.message); return }
    setShowAgregar(false)
    setNuevoForm(defaultForm())
    load()
  }

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f9fafb' }}>Stock</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{items.length} productos</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => setShowAgregar(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
            + Agregar producto
          </button>
        )}
      </div>

      <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 160px', padding: '10px 20px', background: '#111827', borderBottom: '1px solid #374151' }}>
          {['Producto', 'Actual', 'Mínimo', 'Objetivo', 'Estado', 'Acciones'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            No hay productos en stock. {role === 'admin' && 'Agregá el primero con el botón arriba.'}
          </div>
        )}

        {items.map((item, i) => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 160px',
            padding: '14px 20px', alignItems: 'center',
            borderBottom: i < items.length - 1 ? '1px solid #1f2937' : 'none',
            background: getStatus(item) === 'danger' ? '#160a0a' : 'transparent',
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.producto}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.proveedores?.nombre || '—'}</div>
            </div>
            <div style={{ fontSize: '14px', color: '#f9fafb' }}>{item.cantidad_actual} {item.unidad}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{item.cantidad_minima} {item.unidad}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{item.cantidad_objetivo} {item.unidad}</div>
            <div><Pill status={getStatus(item)} /></div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setMermaItem(item)}
                style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer' }}>
                Merma
              </button>
              {role === 'admin' && (
                <>
                  <button onClick={() => abrirEditar(item)}
                    style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f97316', cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => setConfirmEliminar(item)}
                    style={{ fontSize: '12px', padding: '4px 8px', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}>
                    🗑
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showEditar && (
        <ModalProducto titulo={`Editar: ${editando?.producto}`} form={editForm} setForm={setEditForm}
          onSave={saveEditar} onCancel={() => { setShowEditar(false); setErrorEditar('') }}
          error={errorEditar} saving={saving} proveedores={proveedores} />
      )}
      {showAgregar && (
        <ModalProducto titulo="Agregar producto" form={nuevoForm} setForm={setNuevoForm}
          onSave={saveNuevo} onCancel={() => { setShowAgregar(false); setErrorAgregar('') }}
          error={errorAgregar} saving={saving} proveedores={proveedores} />
      )}

      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar producto?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
              Vas a eliminar <strong style={{ color: '#f9fafb' }}>{confirmEliminar.producto}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={eliminar} disabled={saving} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {mermaItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '28px', width: '360px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Registrar pérdida</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{mermaItem.producto}</p>
            <label style={lbl}>Cantidad ({mermaItem.unidad})</label>
            <input type="number" value={mermaQty} onChange={e => setMermaQty(e.target.value)} placeholder="0" style={{ ...inp, marginBottom: '12px' }} />
            <label style={lbl}>Motivo (opcional)</label>
            <input value={mermaMotivo} onChange={e => setMermaMotivo(e.target.value)} placeholder="Vencimiento, caída, error..." style={{ ...inp, marginBottom: '12px' }} />
            <label style={lbl}>Foto (opcional)</label>
            <input type="file" accept="image/*" capture="environment"
              onChange={e => {
                const file = e.target.files?.[0] || null
                setMermaFoto(file)
                setMermaFotoUrl(file ? URL.createObjectURL(file) : null)
              }}
              style={{ ...inp, padding: '8px', marginBottom: '8px' }} />
            {mermaFotoUrl && <img src={mermaFotoUrl} alt="preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #374151', marginBottom: '12px' }} />}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMermaItem(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '10px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveMerma} disabled={saving} style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Guardando...' : 'Registrar pérdida'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
