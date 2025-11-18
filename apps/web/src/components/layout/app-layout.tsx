import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'

import { mainNavigation } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-8 lg:block">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">TaskCalendar</p>
          <p className="text-lg font-semibold text-slate-900">Area Book</p>
        </div>
        <nav className="mt-8 space-y-1">
          {mainNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Signed in</p>
          <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <p className="text-sm font-semibold text-slate-900">TaskCalendar</p>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="text-sm font-semibold text-brand-600"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

