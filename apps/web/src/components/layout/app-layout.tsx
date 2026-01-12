import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import clsx from 'clsx'
import { Menu, X, CalendarDays } from 'lucide-react'

import { mainNavigation } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { MiniCalendar } from '@/components/calendar/mini-calendar'

import { useScrollDirection } from '@/hooks/use-scroll-direction'

// ... (in AppLayout)
export function AppLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const scrollDirection = useScrollDirection()

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
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={clsx(
        "hidden w-64 flex-shrink-0 bg-white dark:bg-neutral-900 transition-all duration-300 ease-in-out flex flex-col",
        isSidebarOpen ? "lg:flex" : "lg:hidden"
      )}>
        {/* Fixed Header */}
        <div className="h-16 flex items-center gap-2 px-3 pr-4 flex-shrink-0">
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

        {/* Scrollable Content Area - entire content scrolls together */}
        <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
          {/* Navigation - no longer scrolls independently */}
          <nav className="mt-6 space-y-1">
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

          {/* Mini Calendar */}
          <div className="mt-8">
            <MiniCalendar />
          </div>

          {/* User Card & Sign Out */}
          <div className="mt-4 mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
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
        </div>
      </aside>

      <div className="flex flex-1 flex-col h-full overflow-hidden w-full max-w-full">
        {/* Mobile Header */}
        <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-neutral-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">TaskCalendar</p>
          <NavLink to="/settings">
            <CollaboratorAvatar
              collaborator={{
                uid: user?.uid ?? 'me',
                email: user?.email ?? '',
                label: user?.displayName || user?.email || 'You',
              }}
              size="sm"
              photoURL={user?.photoURL ?? undefined}
            />
          </NavLink>
        </header>

        {/* Main Content */}
        <main className={clsx(
          "flex-1 max-w-full relative",
          // For schedule, we hide overflow on main so the inner calendar handles it. 
          // For others, we allow main to scroll.
          isSchedule ? "overflow-hidden p-0" : "overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8"
        )}>
          {/* Desktop Sidebar Toggle - Visible when sidebar is closed - EXCEPT on schedule page which has its own */}
          {!isSidebarOpen && !isSchedule && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden lg:flex absolute top-4 left-4 z-50 rounded-full bg-white p-2 text-slate-500 shadow-md hover:bg-slate-50 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Outlet context={{ isSidebarOpen, toggleSidebar: () => setIsSidebarOpen(prev => !prev) }} />
        </main>

        {/* Mobile Floating Dock */}
        <nav className={clsx(
          "fixed bottom-4 left-3 right-3 z-[1100] flex items-center justify-around glass-dock rounded-2xl px-1 py-2 lg:hidden transition-transform duration-300 ease-in-out",
          scrollDirection === 'down' && "translate-y-[150%]"
        )}>
          {mobilePrimaryNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-center p-3 min-w-[56px] transition-all duration-200 active:scale-95',
                  isActive
                    ? 'text-brand-600 scale-110' // Increased scale slightly for active state since text is gone
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )
              }
            >
              {() => (
                <div className={clsx("transition-transform duration-200 [&>svg]:h-7 [&>svg]:w-7")}>
                  {item.icon}
                </div>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={clsx(
              'flex items-center justify-center p-3 min-w-[56px] text-slate-500 transition-all duration-200 active:scale-95 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              isMobileMenuOpen && 'text-brand-600'
            )}
          >
            <Menu className="h-7 w-7" />
          </button>
        </nav>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[1200] bg-black/20 backdrop-blur-sm animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-[1200] w-72 glass-panel border-l border-white/20 p-4 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Menu</p>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full p-3 text-slate-500 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {mobileSecondaryNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-all [&>svg]:h-6 [&>svg]:w-6',
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
