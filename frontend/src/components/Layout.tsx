import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { LogoMark } from './Logo'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1040px] px-6 pt-9 pb-20">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/tickets" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-heading text-[17px] font-semibold tracking-tight text-[#eef1e9]">
              Crazy<b className="font-semibold text-neon">Support</b>Hub
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-(--line-strong) bg-[linear-gradient(160deg,#1a1c19,#0a0b0a)] text-[10px] text-(--muted)">
                {initials(user.name)}
              </div>
              <span className="text-[12.5px] text-(--muted)">{user.name}</span>
              <span className="rounded-md border border-(--line-strong) px-1.75 py-0.75 text-[9.5px] tracking-wide text-(--muted) uppercase">
                {user.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-(--line-strong) px-3.5 py-2 text-[12px] text-(--muted) transition hover:border-white/22 hover:text-white"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        <Outlet />
      </div>
    </div>
  )
}
