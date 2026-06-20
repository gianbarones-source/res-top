import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
