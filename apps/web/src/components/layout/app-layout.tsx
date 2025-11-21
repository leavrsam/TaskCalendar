import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Menu, X } from 'lucide-react'

import { mainNavigation } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const primaryNav = mainNavigation.slice(0, 4) // Dashboard, Contacts, Lessons, Schedule
  // Swap Lessons with Map for mobile primary
  const mobilePrimaryNav = [
    mainNavigation.find(n => n.path === '/')!,
    mainNavigation.find(n => n.path === '/contacts')!,
    mainNavigation.find(n => n.path === '/schedule')!,
    mainNavigation.find(n => n.path === '/map')!,
  ]
  const mobileSecondaryNav = mainNavigation.filter(n => !mobilePrimaryNav.includes(n))

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
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
          <div className="flex items-center gap-3">
            <CollaboratorAvatar
              collaborator={{
                uid: user?.uid ?? 'me',
                email: user?.email ?? '',
                label: user?.displayName || user?.email || 'You',
              }}
              size="md"
              photoURL={user?.photoURL ?? undefined}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">Signed in</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.displayName || user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="mt-3 w-full text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold text-slate-900">TaskCalendar</p>
          <CollaboratorAvatar
            collaborator={{
              uid: user?.uid ?? 'me',
              email: user?.email ?? '',
              label: user?.displayName || user?.email || 'You',
            }}
            size="sm"
            photoURL={user?.photoURL ?? undefined}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white px-2 py-2 pb-safe lg:hidden">
          {mobilePrimaryNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-medium transition',
                  isActive
                    ? 'text-brand-600'
                    : 'text-slate-500 hover:bg-slate-50',
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={clsx(
              'flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50',
              isMobileMenuOpen && 'text-brand-600'
            )}
          >
            <Menu className="h-4 w-4" />
            <span>More</span>
          </button>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-lg font-semibold text-slate-900">Menu</p>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {mobileSecondaryNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition',
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
              </div>
              <div className="mt-8 border-t border-slate-200 pt-8">
                <div className="flex items-center gap-3 px-4">
                  <CollaboratorAvatar
                    collaborator={{
                      uid: user?.uid ?? 'me',
                      email: user?.email ?? '',
                      label: user?.displayName || user?.email || 'You',
                    }}
                    size="lg"
                    photoURL={user?.photoURL ?? undefined}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user?.displayName || user?.email}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut()
                  }}
                  className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

