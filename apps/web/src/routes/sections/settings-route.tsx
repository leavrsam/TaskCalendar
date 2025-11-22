import { useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'

import { ShareWorkspaceCard } from '@/components/sharing/share-workspace-card'
import { DataManagementCard } from '@/components/settings/data-management-card'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/providers/theme-provider'

export function SettingsRoute() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'sharing' | 'notifications' | 'data' | 'appearance'>('appearance')

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
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
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Settings</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Workspace settings</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage how you collaborate with others, invite new companions, and control notifications.
            </p>
          </div>
        </div>
      </header>
      <div className="flex gap-2">
        {['appearance', 'sharing', 'notifications', 'data'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option as 'sharing' | 'notifications' | 'data' | 'appearance')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${tab === option ? 'border-brand-500 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
      {tab === 'appearance' && <AppearanceSettings />}
      {tab === 'sharing' && <ShareWorkspaceCard />}
      {tab === 'notifications' && <NotificationsPlaceholder />}
      {tab === 'data' && <DataManagementCard />}
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun, description: 'Light mode' },
    { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Dark mode' },
    { value: 'system' as const, label: 'System', icon: Monitor, description: 'Use system preference' },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Appearance</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Choose how the app looks for you
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {themes.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition ${theme === option.value
                ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }`}
            >
              <Icon className={`h-8 w-8 ${theme === option.value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
              <div className="text-center">
                <p className={`text-sm font-semibold ${theme === option.value ? 'text-brand-700 dark:text-brand-400' : 'text-slate-900 dark:text-slate-50'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NotificationsPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Notification preferences coming soon.
    </div>
  )
}

