'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRestaurant } from '@/context/RestaurantContext'

const mainLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/dashboard/stock', label: 'Stock', icon: '📦' },
  { href: '/dashboard/proveedores', label: 'Proveedores', icon: '🚚' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: '🧾' },
  { href: '/dashboard/caja', label: 'Caja', icon: '💵' },
]

const adminOnlyLinks = [
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/admin/reportes', label: 'Reportes', icon: '📊' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [open, setOpen] = useState(false)
  const { restaurants, selectedId, selectedName, setSelectedId, role } = useRestaurant()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('username, nombre').eq('id', data.user.id).single()
          .then(({ data: p }) => setUserName(p?.nombre || p?.username || data.user.email?.split('@')[0] || ''))
      }
    })
  }, [])

  // Cerrar sidebar al navegar
  useEffect(() => { setOpen(false) }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const initials = userName.slice(0, 2).toUpperCase()

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#f97316' }}>Restop</div>
          {role && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {role === 'admin' ? 'Administrador' : role === 'franquiciado' ? 'Franquiciado' : 'Empleado'}
          </div>}
        </div>
        {/* Botón cerrar en móvil */}
        <button onClick={() => setOpen(false)} style={{ display: 'none', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }} className="sidebar-close">✕</button>
      </div>

      {/* Selector de local */}
      {restaurants.length > 1 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
          <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Local activo</div>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', padding: '6px 10px', color: '#f9fafb', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      {restaurants.length === 1 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1f2937' }}>
          <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Local</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{selectedName}</div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {mainLinks.map(link => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 20px', fontSize: '14px', textDecoration: 'none',
            color: isActive(link.href) ? '#f97316' : '#9ca3af',
            background: isActive(link.href) ? '#1c1917' : 'transparent',
            borderLeft: `3px solid ${isActive(link.href) ? '#f97316' : 'transparent'}`,
          }}>
            <span style={{ fontSize: '16px' }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}

        {(role === 'admin' || role === 'franquiciado') && (
          <>
            <div style={{ padding: '16px 20px 4px', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>Gestión</div>
            {adminOnlyLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 20px', fontSize: '14px', textDecoration: 'none',
                color: isActive(link.href) ? '#f97316' : '#9ca3af',
                background: isActive(link.href) ? '#1c1917' : 'transparent',
                borderLeft: `3px solid ${isActive(link.href) ? '#f97316' : 'transparent'}`,
              }}>
                <span style={{ fontSize: '16px' }}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid #374151', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile-btn { display: flex !important; }
          .sidebar-overlay { display: ${open ? 'block' : 'none'} !important; }
          .sidebar-mobile { transform: ${open ? 'translateX(0)' : 'translateX(-100%)'} !important; }
          .sidebar-close { display: block !important; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile-btn { display: none !important; }
          .sidebar-overlay { display: none !important; }
          .sidebar-mobile { display: none !important; }
          .sidebar-desktop { display: flex !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="sidebar-desktop" style={{ width: '210px', background: '#111827', flexDirection: 'column', borderRight: '1px solid #1f2937', flexShrink: 0, minHeight: '100vh' }}>
        <SidebarContent />
      </aside>

      {/* Mobile: botón hamburguesa */}
      <button className="sidebar-mobile-btn" onClick={() => setOpen(true)} style={{
        display: 'none', position: 'fixed', top: '12px', left: '12px', zIndex: 30,
        background: '#111827', border: '1px solid #374151', borderRadius: '8px',
        padding: '8px 10px', color: '#f9fafb', fontSize: '18px', cursor: 'pointer',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1
      }}>
        ☰
      </button>

      {/* Mobile: overlay */}
      <div className="sidebar-overlay" onClick={() => setOpen(false)} style={{
        display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40
      }} />

      {/* Mobile: sidebar drawer */}
      <aside className="sidebar-mobile" style={{
        position: 'fixed', top: 0, left: 0, width: '260px', height: '100vh',
        background: '#111827', borderRight: '1px solid #1f2937',
        zIndex: 50, transition: 'transform 0.25s ease', transform: 'translateX(-100%)',
        overflowY: 'auto'
      }}>
        <SidebarContent />
      </aside>
    </>
  )
}
