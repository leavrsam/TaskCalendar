import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import clsx from 'clsx'
import { Menu, X, CalendarDays } from 'lucide-react'

import { mainNavigation } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { MiniCalendar } from '@/components/calendar/mini-calendar'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const isSchedule = pathname === '/schedule'

  // Swap Lessons with Map for mobile primary
  const mobilePrimaryNav = [
    mainNavigation.find(n => n.path === '/')!,
    mainNavigation.find(n => n.path === '/contacts')!,
    mainNavigation.find(n => n.path === '/schedule')!,
    mainNavigation.find(n => n.path === '/map')!,
  ]
  const mobileSecondaryNav = mainNavigation.filter(n => !mobilePrimaryNav.includes(n))

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className={clsx(
        "hidden w-64 flex-shrink-0 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out flex flex-col",
        isSidebarOpen ? "lg:flex" : "lg:hidden"
      )}>
        <div className="h-16 flex items-center gap-2 px-3 pr-4">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-full p-3 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">TaskCalendar</p>
          </div>
        </div>
        <nav className="mt-6 px-4 space-y-1 overflow-y-auto flex-1">
          {mainNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8">
          <MiniCalendar />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
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
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Signed in</p>
              <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-50">{user?.displayName || user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="mt-3 w-full text-sm font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">TaskCalendar</p>
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
        <main className={clsx(
          "flex-1",
          isSchedule ? "p-0" : "p-4 pb-24 lg:p-8 lg:pb-8"
        )}>
          <Outlet context={{ isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(prev => !prev) }} />
        </main>

        {/* Mobile Floating Dock */}
        <nav className="fixed bottom-6 left-4 right-4 z-40 flex items-center justify-around glass-dock rounded-2xl px-2 py-3 lg:hidden transition-all duration-300">
          {mobilePrimaryNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 p-2 transition-all duration-200 active:scale-95',
                  isActive
                    ? 'text-brand-600 scale-110 drop-shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )
              }
            >
              <div className={clsx("transition-transform duration-200", ({ isActive }: { isActive: boolean }) => isActive ? "-translate-y-1" : "")}>
                {item.icon}
              </div>
            </NavLink>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={clsx(
              'flex flex-col items-center gap-1 p-2 text-slate-500 transition-all duration-200 active:scale-95 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              isMobileMenuOpen && 'text-brand-600'
            )}
          >
            <Menu className="h-6 w-6" />
          </button>
        </nav>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-72 glass-panel border-l border-white/20 p-4 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Menu</p>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-2 text-slate-500 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {mobileSecondaryNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all',
                        isActive
                          ? 'bg-brand-50/80 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 shadow-sm'
                          : 'text-slate-600 hover:bg-white/40 dark:text-slate-400 dark:hover:bg-slate-800/40',
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="mt-8 border-t border-slate-200/50 dark:border-slate-700/50 pt-6">
                <div className="flex items-center gap-3 px-2 mb-4">
                  <CollaboratorAvatar
                    collaborator={{
                      uid: user?.uid ?? 'me',
                      email: user?.email ?? '',
                      label: user?.displayName || user?.email || 'You',
                      // label: user?.displayName || user?.email || 'You',
                    }}
                    size="sm"
                    photoURL={user?.photoURL ?? undefined}
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-50">{user?.displayName || user?.email}</p>
                    <p className="text-xs text-slate-500 truncate dark:text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut()
                  }}
                  className="w-full rounded-xl border border-slate-200/50 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white/50 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div >
  )
}
