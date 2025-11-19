import { useState } from 'react'

import { ShareWorkspaceCard } from '@/components/sharing/share-workspace-card'

export function SettingsRoute() {
  const [tab, setTab] = useState<'sharing' | 'notifications'>('sharing')

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900">Workspace settings</h1>
        <p className="text-sm text-slate-600">
          Manage how you collaborate with others, invite new companions, and control notifications.
        </p>
      </header>
      <div className="flex gap-2">
        {['sharing', 'notifications'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option as 'sharing' | 'notifications')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              tab === option ? 'border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            {option === 'sharing' ? 'Sharing' : 'Notifications'}
          </button>
        ))}
      </div>
      {tab === 'sharing' ? <ShareWorkspaceCard /> : <NotificationsPlaceholder />}
    </div>
  )
}

function NotificationsPlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      Notification preferences coming soon.
    </div>
  )
}

