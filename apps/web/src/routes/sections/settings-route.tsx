import { useState } from 'react'

import { ShareWorkspaceCard } from '@/components/sharing/share-workspace-card'
import { DataManagementCard } from '@/components/settings/data-management-card'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { useAuth } from '@/hooks/use-auth'

export function SettingsRoute() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'sharing' | 'notifications' | 'data'>('sharing')

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <p className="text-xs uppercase tracking-wide text-slate-500">Settings</p>
            <h1 className="text-2xl font-semibold text-slate-900">Workspace settings</h1>
            <p className="text-sm text-slate-600">
              Manage how you collaborate with others, invite new companions, and control notifications.
            </p>
          </div>
        </div>
      </header>
      <div className="flex gap-2">
        {['sharing', 'notifications', 'data'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option as 'sharing' | 'notifications' | 'data')}
            className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${tab === option ? 'border-brand-500 text-brand-700' : 'border-slate-200 text-slate-500'
              }`}
          >
            {option}
          </button>
        ))}
      </div>
      {tab === 'sharing' && <ShareWorkspaceCard />}
      {tab === 'notifications' && <NotificationsPlaceholder />}
      {tab === 'data' && <DataManagementCard />}
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

