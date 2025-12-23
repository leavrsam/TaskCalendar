import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Monitor } from 'lucide-react'
import { ConnectCalendarButton } from '@/components/settings/connect-calendar-button'

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
import { useConnectedCalendars, useDisconnectCalendar } from '@/features/settings/api'

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

      <footer className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
        <div className="flex justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200 hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-slate-800 dark:hover:text-slate-200 hover:underline">Terms of Service</Link>
        </div>
      </footer>
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
  const connectedCalendars = useConnectedCalendars()
  const disconnect = useDisconnectCalendar()

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
          {/* Google Calendar (Direct Sync) */}
          <div className="rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>Google Calendar</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-brand-900 dark:text-brand-100">
                    Google Calendar
                  </h3>
                  <p className="text-sm text-brand-500 dark:text-brand-400">
                    Sync your schedule with Google Calendar
                  </p>
                </div>
              </div>
            </div>

            {connectedCalendars.isLoading ? (
              <div className="mt-4 text-sm text-brand-500">Loading connections...</div>
            ) : (
              <div className="mt-4 space-y-3">
                {connectedCalendars.data && connectedCalendars.data.length > 0 ? (
                  <div className="space-y-2">
                    {connectedCalendars.data.map((cal) => (
                      <div key={cal.id} className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 dark:border-brand-800 dark:bg-brand-900/30">
                        <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                          {cal.calendarEmail}
                        </span>
                        <DisconnectButton
                          email={cal.calendarEmail}
                          onDisconnect={() => disconnect.mutate(cal.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 text-sm text-brand-500 dark:text-brand-400">
                    No accounts connected.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  {/* Sync Now button */}
                  {connectedCalendars.data && connectedCalendars.data.length > 0 && (
                    <SyncNowButton />
                  )}
                  {/* Always show Connect button to add MORE accounts */}
                  <ConnectCalendarButton label={connectedCalendars.data?.length ? "Add Another Account" : "Connect Account"} />
                </div>
              </div>
            )}
          </div>


          {/* Legacy iCal Import */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-50">iCal Import</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {importedEventsCount > 0
                    ? `${importedEventsCount} events imported`
                    : 'One-time import via URL'}
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

function DisconnectButton({ onDisconnect }: { email?: string, onDisconnect: () => void }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const timeoutRef = useRef<any>(null)

  const handleClick = () => {
    if (isConfirming) {
      onDisconnect()
      setIsConfirming(false)
    } else {
      setIsConfirming(true)
      // Reset after 3 seconds if not confirmed
      timeoutRef.current = setTimeout(() => setIsConfirming(false), 3000)
    }
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-xs font-medium hover:underline transition-colors ${isConfirming ? 'text-red-700 font-bold' : 'text-red-500 hover:text-red-600'}`}
    >
      {isConfirming ? 'Really Delete?' : 'Disconnect'}
    </button>
  )
}

function NotificationsPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      Notification preferences coming soon.
    </div>
  )
}

function SyncNowButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    setResult(null)
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const { getApp } = await import('firebase/app')
      const functions = getFunctions(getApp())
      const triggerFullResync = httpsCallable(functions, 'triggerFullResync')
      const response = await triggerFullResync()
      setResult((response.data as any)?.message || 'Sync completed!')
    } catch (error: any) {
      console.error('Sync failed:', error)
      setResult('Sync failed. See console for details.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 rounded-xl border border-brand-500 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
      >
        {isSyncing ? (
          <>
            <span className="animate-spin">⏳</span>
            Syncing...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Sync Now
          </>
        )}
      </button>
      {result && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{result}</span>
      )}
    </div>
  )
}
