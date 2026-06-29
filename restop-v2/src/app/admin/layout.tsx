import Sidebar from '@/components/Sidebar'
import { RestaurantProvider } from '@/context/RestaurantContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <style>{`@media (max-width: 768px) { main { padding: 60px 16px 24px !important; } }`}</style>
          {children}
        </main>
      </div>
    </RestaurantProvider>
  )
}
