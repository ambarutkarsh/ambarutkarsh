import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, Search, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Search', icon: Search, path: '/search' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.slice(0, 2).map(item => (
            <NavButton
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
              onClick={() => navigate(item.path)}
            />
          ))}

          {/* Upload FAB */}
          <button
            onClick={() => navigate('/upload')}
            className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-slate-900 text-white shadow-lg active:scale-95 transition-transform"
            aria-label="Upload document"
          >
            <Plus className="h-6 w-6" />
          </button>

          {navItems.slice(2).map(item => (
            <NavButton
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}

function NavButton({ icon: Icon, label, active, onClick }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[48px]',
        active ? 'text-slate-900' : 'text-gray-400'
      )}
    >
      <Icon className={cn('h-5 w-5', active && 'text-slate-900')} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
