import { useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'

import { ShareWorkspaceCard } from '@/components/sharing/share-workspace-card'
import { DataManagementCard } from '@/components/settings/data-management-card'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/components/providers/theme-provider'
import { ImportModal } from '@/components/calendar/import-modal'
import { useCalendarStore } from '@/stores/calendar-store'
import type { TaskEvent } from '@/features/tasks/api'
import type { Task } from '@taskcalendar/core'
import ICAL from 'ical.js'
import { Calendar as CalendarIcon, Download } from 'lucide-react'

export function SettingsRoute() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'sharing' | 'notifications' | 'data' | 'appearance' | 'integrations'>('appearance')

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
      <div className="flex flex-wrap gap-2">
        {['appearance', 'integrations', 'sharing', 'notifications', 'data'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option as any)}
            className={`rounded-xl border px-5 py-3 text-sm font-semibold capitalize min-h-[44px] ${tab === option ? 'border-brand-500 text-brand-700 dark:border-brand-400 dark:text-brand-400' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
      {tab === 'appearance' && <AppearanceSettings />}
      {tab === 'integrations' && <IntegrationsSettings />}
      {tab === 'sharing' && <ShareWorkspaceCard />}
      {tab === 'notifications' && <NotificationsPlaceholder />}
      {tab === 'data' && <DataManagementCard />}
    </div>
  )
}

import { themeColors, type ThemeColor } from '@/lib/themes'

function AppearanceSettings() {
  const { theme, setTheme, themeColor, setThemeColor } = useTheme()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun, description: 'Light mode' },
    { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Dark mode' },
    { value: 'system' as const, label: 'System', icon: Monitor, description: 'Use system preference' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Theme Mode</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Choose between light and dark mode
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
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/30'
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Accent Color</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Customize your primary brand color
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {Object.entries(themeColors).map(([key, value]) => {
            const isSelected = themeColor === key
            // Construct the background color string based on the theme definition (500 shade)
            // Since we know the format is "R G B", we can stick it in rgb()
            const colorStyle = { backgroundColor: `rgb(${value.colors[500]})` }

            return (
              <button
                key={key}
                type="button"
                onClick={() => setThemeColor(key as ThemeColor)}
                className={`group relative flex items-center gap-3 rounded-xl border-2 p-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 ${isSelected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                  }`}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-sm ring-2 ring-white/20"
                  style={colorStyle}
                />
                <span className={`text-sm font-medium ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                  {value.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IntegrationsSettings() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const addImportedEvents = useCalendarStore((state) => state.addImportedEvents)
  const importedEventsCount = useCalendarStore((state) => state.importedEvents.length)
  const clearImportedEvents = useCalendarStore((state) => state.clearImportedEvents)

  const handleImportCalendar = async (url: string) => {
    try {
      // Proxy via allorigins to bypass CORS for demo purposes
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error('Failed to fetch calendar')

      const data = await response.json()
      const icsData = data.contents

      const jcalData = ICAL.parse(icsData)
      const comp = new ICAL.Component(jcalData)
      const vevents = comp.getAllSubcomponents('vevent')

      const newEvents: TaskEvent[] = vevents.map((vevent: any) => {
        const event = new ICAL.Event(vevent)
        const startDate = event.startDate.toJSDate()
        const endDate = event.endDate.toJSDate()

        const mockTask: Task = {
          id: `imported-${event.uid}`,
          ownerUid: 'imported',
          title: event.summary,
          status: 'todo',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scheduledStart: startDate.toISOString(),
          scheduledEnd: endDate.toISOString(),
          isAllDay: event.startDate.isDate,
          location: event.location ? { lat: 0, lng: 0 } : undefined,
          address: event.location,
          notes: event.description,
          // tags: ['imported'], // Removed to fix type error
          recurrence: null,
          sharedWith: [],
          isBackup: true,
          contactIds: [],
          dueAt: null,
          assignedTo: [],
          isRecurringInstance: false,
          isModified: false,
        }

        return {
          id: mockTask.id,
          title: mockTask.title,
          start: startDate,
          end: endDate,
          resource: mockTask,
          allDay: mockTask.isAllDay,
        }
      })

      addImportedEvents(newEvents)
    } catch (err) {
      console.error('Import failed', err)
      throw new Error('Could not parse calendar URL. See console for details.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Calendar Integrations</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Connect external calendars to view your schedule in one place.
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-50">Google Calendar (iCal)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {importedEventsCount > 0
                    ? `${importedEventsCount} events synced`
                    : 'Sync via public or private iCal URL'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {importedEventsCount > 0 && (
                <button
                  onClick={clearImportedEvents}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Download className="h-4 w-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCalendar}
      />
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

