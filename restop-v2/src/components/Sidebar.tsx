'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const adminLinks = [
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
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserName(data.user.email?.split('@')[0] || '')
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: p }) => setRole(p?.role || 'owner'))
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <aside style={{
      width: '200px', background: '#111827', display: 'flex', flexDirection: 'column',
      borderRight: '1px solid #1f2937', flexShrink: 0, minHeight: '100vh'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #1f2937' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#f97316' }}>Restop</div>
        {role && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {role === 'admin' ? 'Administrador' : role === 'franquiciado' ? 'Franquiciado' : 'Empleado'}
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '8px 0' }}>
        {adminLinks.map(link => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 20px', fontSize: '13px', textDecoration: 'none',
            color: isActive(link.href) ? '#f97316' : '#9ca3af',
            background: isActive(link.href) ? '#1c1917' : 'transparent',
            borderLeft: `3px solid ${isActive(link.href) ? '#f97316' : 'transparent'}`,
            transition: 'all 0.15s'
          }}>
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}

        {(role === 'admin' || role === 'franquiciado') && (
          <>
            <div style={{ padding: '16px 20px 4px', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Gestión
            </div>
            {adminOnlyLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 20px', fontSize: '13px', textDecoration: 'none',
                color: isActive(link.href) ? '#f97316' : '#9ca3af',
                background: isActive(link.href) ? '#1c1917' : 'transparent',
                borderLeft: `3px solid ${isActive(link.href) ? '#f97316' : 'transparent'}`,
              }}>
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#f97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 600, color: 'white', flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 500 }}>{userName}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', background: 'transparent', border: '1px solid #374151',
          borderRadius: '6px', padding: '6px', fontSize: '12px', color: '#6b7280',
          cursor: 'pointer', transition: 'all 0.15s'
        }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
