'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/context/RestaurantContext'

function Pill({ status }: { status: 'ok' | 'danger' }) {
  const cfg = {
    ok: { bg: '#052e16', color: '#4ade80', border: '#166534', label: 'OK' },
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
const lbl: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }

type ProductoForm = {
  producto: string; unidad: string; cantidad_actual: string
  cantidad_objetivo: string; cantidad_objetivo_finde: string
  proveedor_id: string; es_objetivo_por_dia: boolean
}

const defaultForm = (): ProductoForm => ({
  producto: '', unidad: 'kg', cantidad_actual: '', cantidad_objetivo: '', cantidad_objetivo_finde: '',
  proveedor_id: '', es_objetivo_por_dia: false
})

function ModalProducto({ titulo, form, setForm, onSave, onCancel, error, saving, proveedores }: {
  titulo: string; form: ProductoForm; setForm: (f: ProductoForm) => void
  onSave: () => void; onCancel: () => void; error: string; saving: boolean; proveedores: any[]
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '20px' }}>{titulo}</h2>

        <label style={lbl}>Nombre *</label>
        <input value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })}
          placeholder="Ej: Pollo" style={{ ...inp, marginBottom: '14px' }} />

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div><label style={lbl}>Actual</label><input type="number" value={form.cantidad_actual} onChange={e => setForm({ ...form, cantidad_actual: e.target.value })} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Obj. común</label><input type="number" value={form.cantidad_objetivo} onChange={e => setForm({ ...form, cantidad_objetivo: e.target.value })} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Obj. finde</label><input type="number" value={form.cantidad_objetivo_finde} onChange={e => setForm({ ...form, cantidad_objetivo_finde: e.target.value })} placeholder="0" style={inp} /></div>
        </div>

        {error && <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171', marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '12px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSave} disabled={saving} style={{ flex: 1, background: '#f97316', border: 'none', borderRadius: '8px', padding: '12px', color: 'white', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalMerma({ item, onClose, onSave, saving }: { item: any; onClose: () => void; onSave: (qty: string, motivo: string, foto: File | null) => void; saving: boolean }) {
  const [qty, setQty] = useState('')
  const [motivo, setMotivo] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>Registrar pérdida</h2>
        <p style={{ fontSize: '13px', color: '#f97316', marginBottom: '20px' }}>{item.producto}</p>

        <label style={lbl}>Cantidad ({item.unidad})</label>
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
          style={{ ...inp, fontSize: '20px', padding: '14px', marginBottom: '14px' }} autoFocus />

        <label style={lbl}>Motivo (opcional)</label>
        <input value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Vencimiento, caída..." style={{ ...inp, marginBottom: '14px' }} />

        <label style={lbl}>Foto (opcional)</label>
        <input type="file" accept="image/*" capture="environment"
          onChange={e => {
            const f = e.target.files?.[0] || null
            setFoto(f)
            setFotoUrl(f ? URL.createObjectURL(f) : null)
          }}
          style={{ ...inp, padding: '8px', marginBottom: fotoUrl ? '8px' : '20px' }} />
        {fotoUrl && <img src={fotoUrl} alt="preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '14px' }} />}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '14px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(qty, motivo, foto)} disabled={saving || !qty}
            style={{ flex: 2, background: '#f97316', border: 'none', borderRadius: '8px', padding: '14px', color: 'white', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Guardando...' : 'Registrar pérdida'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StockPage() {
  const { selectedId: restaurantId, role } = useRestaurant()
  const [items, setItems] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtroProveedor, setFiltroProveedor] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  const [mermaItem, setMermaItem] = useState<any | null>(null)
  const [showAgregar, setShowAgregar] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<ProductoForm>(defaultForm())
  const [errorAgregar, setErrorAgregar] = useState('')
  const [showEditar, setShowEditar] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState<ProductoForm>(defaultForm())
  const [errorEditar, setErrorEditar] = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState<any>(null)

  const hoy = new Date().getDay()
  const esFinde = [4, 5, 6, 0].includes(hoy)

  const getObjetivo = (item: any) => esFinde && item.cantidad_objetivo_finde
    ? item.cantidad_objetivo_finde : item.cantidad_objetivo

  const getStatus = (item: any): 'ok' | 'danger' =>
    item.cantidad_actual < getObjetivo(item) ? 'danger' : 'ok'

  const load = async () => {
    if (!restaurantId) return
    const [{ data }, { data: provs }] = await Promise.all([
      supabase.from('stock').select('*, proveedores(nombre, id)').eq('restaurant_id', restaurantId).order('producto'),
      supabase.from('proveedores').select('id, nombre').eq('restaurant_id', restaurantId).order('nombre')
    ])
    setItems(data || [])
    setProveedores(provs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [restaurantId])

  const abrirEditar = (item: any) => {
    setEditando(item)
    setEditForm({
      producto: item.producto, unidad: item.unidad,
      cantidad_actual: String(item.cantidad_actual),
      cantidad_objetivo: String(item.cantidad_objetivo),
      cantidad_objetivo_finde: String(item.cantidad_objetivo_finde || ''),
      proveedor_id: item.proveedor_id || '',
      es_objetivo_por_dia: item.es_objetivo_por_dia || false
    })
    setErrorEditar('')
    setShowEditar(true)
  }

  const saveEditar = async () => {
    if (!editForm.producto.trim()) { setErrorEditar('El nombre es obligatorio.'); return }
    setSaving(true)
    await supabase.from('stock').update({
      producto: editForm.producto.trim(), unidad: editForm.unidad,
      cantidad_actual: parseFloat(editForm.cantidad_actual) || 0,
      cantidad_objetivo: parseFloat(editForm.cantidad_objetivo) || 0,
      cantidad_objetivo_finde: parseFloat(editForm.cantidad_objetivo_finde) || 0,
      proveedor_id: editForm.proveedor_id || null,
      ultima_actualizacion_manual: new Date().toISOString()
    }).eq('id', editando.id)
    setSaving(false); setShowEditar(false); load()
  }

  const eliminar = async (id: string) => {
    setSaving(true)
    await supabase.from('stock').delete().eq('id', id)
    setSaving(false); setConfirmEliminar(null); load()
  }

  const saveMerma = async (qty: string, motivo: string, foto: File | null) => {
    setSaving(true)
    let fotoUrl = null
    if (foto) {
      const ext = foto.name.split('.').pop()
      const path = `mermas/${mermaItem.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('caja-fotos').upload(path, foto, { upsert: true })
      if (!upErr) fotoUrl = supabase.storage.from('caja-fotos').getPublicUrl(path).data.publicUrl
    }
    await Promise.all([
      supabase.from('mermas').insert({
        restaurant_id: restaurantId, stock_id: mermaItem.id,
        producto: mermaItem.producto, cantidad: parseFloat(qty),
        unidad: mermaItem.unidad, motivo: motivo || null,
        foto_url: fotoUrl, fecha: new Date().toISOString().split('T')[0]
      }),
      supabase.from('stock').update({ cantidad_actual: Math.max(0, mermaItem.cantidad_actual - parseFloat(qty)) }).eq('id', mermaItem.id)
    ])
    setSaving(false); setMermaItem(null); load()
  }

  const saveNuevo = async () => {
    setErrorAgregar('')
    if (!nuevoForm.producto.trim()) { setErrorAgregar('El nombre es obligatorio.'); return }
    setSaving(true)
    await supabase.from('stock').insert({
      restaurant_id: restaurantId,
      producto: nuevoForm.producto.trim(), unidad: nuevoForm.unidad,
      cantidad_actual: parseFloat(nuevoForm.cantidad_actual) || 0,
      cantidad_objetivo: parseFloat(nuevoForm.cantidad_objetivo) || 0,
      cantidad_objetivo_finde: parseFloat(nuevoForm.cantidad_objetivo_finde) || 0,
      proveedor_id: nuevoForm.proveedor_id || null,
      ultima_actualizacion_manual: new Date().toISOString()
    })
    setSaving(false); setShowAgregar(false); setNuevoForm(defaultForm()); load()
  }

  const itemsFiltrados = items
    .filter(i => filtroProveedor === 'todos' ? true : filtroProveedor === 'sin' ? !i.proveedor_id : i.proveedor_id === filtroProveedor)
    .filter(i => busqueda === '' || i.producto.toLowerCase().includes(busqueda.toLowerCase()))

  if (loading) return <div style={{ color: '#6b7280', padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#f9fafb' }}>Stock</h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>{itemsFiltrados.length} productos · obj. {esFinde ? 'finde' : 'semanal'}</p>
        </div>
        {role === 'admin' && (
          <button onClick={() => setShowAgregar(true)} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Agregar
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar producto..."
        style={{ ...inp, marginBottom: '12px', fontSize: '15px', padding: '12px 14px' }} />

      {/* Filtro proveedor */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[{ id: 'todos', label: 'Todos' }, ...proveedores.map(p => ({ id: p.id, label: p.nombre })), { id: 'sin', label: 'Sin proveedor' }].map(f => (
          <button key={f.id} onClick={() => setFiltroProveedor(f.id)} style={{
            fontSize: '12px', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap',
            background: filtroProveedor === f.id ? '#f97316' : '#1f2937',
            border: `1px solid ${filtroProveedor === f.id ? '#f97316' : '#374151'}`,
            color: filtroProveedor === f.id ? 'white' : '#9ca3af'
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de productos — cards para móvil */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {itemsFiltrados.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px', background: '#1f2937', borderRadius: '12px' }}>
            No hay productos.
          </div>
        )}

        {itemsFiltrados.map(item => {
          const status = getStatus(item)
          const objetivo = getObjetivo(item)
          const pct = objetivo > 0 ? Math.min(100, (item.cantidad_actual / objetivo) * 100) : 100

          return (
            <div key={item.id} style={{
              background: status === 'danger' ? '#160a0a' : '#1f2937',
              border: `1px solid ${status === 'danger' ? '#7f1d1d' : '#374151'}`,
              borderRadius: '12px', padding: '16px'
            }}>
              {/* Nombre y proveedor */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#f9fafb' }}>{item.producto}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.proveedores?.nombre || '—'}</div>
                </div>
                <Pill status={status} />
              </div>

              {/* Cantidad y objetivo */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Actual</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: status === 'danger' ? '#f87171' : '#4ade80' }}>
                    {item.cantidad_actual} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unidad}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Objetivo</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#9ca3af' }}>
                    {objetivo} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unidad}</span>
                  </div>
                </div>
                {item.cantidad_objetivo_finde > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Obj. finde</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#9ca3af' }}>
                      {item.cantidad_objetivo_finde} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unidad}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de progreso */}
              <div style={{ height: '6px', background: '#111827', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: status === 'danger' ? '#dc2626' : '#22c55e', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setMermaItem(item)} style={{
                  flex: 1, padding: '10px', background: '#111827', border: '1px solid #374151',
                  borderRadius: '8px', color: '#f87171', fontSize: '13px', cursor: 'pointer', fontWeight: 500
                }}>
                  📉 Merma
                </button>
                {role === 'admin' && (
                  <>
                    <button onClick={() => abrirEditar(item)} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid #374151', borderRadius: '8px', color: '#f97316', fontSize: '13px', cursor: 'pointer' }}>
                      ✏️
                    </button>
                    <button onClick={() => setConfirmEliminar(item)} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid #374151', borderRadius: '8px', color: '#f87171', fontSize: '13px', cursor: 'pointer' }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modales */}
      {showEditar && <ModalProducto titulo={`Editar: ${editando?.producto}`} form={editForm} setForm={setEditForm} onSave={saveEditar} onCancel={() => setShowEditar(false)} error={errorEditar} saving={saving} proveedores={proveedores} />}
      {showAgregar && <ModalProducto titulo="Agregar producto" form={nuevoForm} setForm={setNuevoForm} onSave={saveNuevo} onCancel={() => setShowAgregar(false)} error={errorAgregar} saving={saving} proveedores={proveedores} />}
      {mermaItem && <ModalMerma item={mermaItem} onClose={() => setMermaItem(null)} onSave={saveMerma} saving={saving} />}

      {confirmEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111827', border: '1px solid #7f1d1d', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>¿Eliminar producto?</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>Vas a eliminar <strong style={{ color: '#f9fafb' }}>{confirmEliminar.producto}</strong>. No se puede deshacer.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmEliminar(null)} style={{ flex: 1, background: 'transparent', border: '1px solid #374151', borderRadius: '8px', padding: '14px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmEliminar.id)} disabled={saving} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: '8px', padding: '14px', color: 'white', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
