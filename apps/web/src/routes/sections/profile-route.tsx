import { useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'

export function ProfileRoute() {
  const { user } = useAuth()
  const { success: showSuccessToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL ?? '')
  const [email] = useState(user?.email ?? '')

  const handleSave = () => {
    showSuccessToast({
      title: 'Profile saved',
      description: 'Display name changes will take effect immediately.',
    })
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Profile</p>
        <h1 className="text-2xl font-semibold text-slate-900">Your account</h1>
        <p className="text-sm text-slate-600">
          Update your name, avatar, and password. Shared collaborators see this info.
        </p>
      </header>
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Basic info</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <CollaboratorAvatar
                collaborator={{
                  uid: user?.uid ?? 'me',
                  email: user?.email ?? '',
                  label: displayName || user?.email || 'You',
                }}
                size="md"
              />
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase text-slate-500">Avatar URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save changes
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Password</h2>
          <p className="text-sm text-slate-600">
            Changing your password will sign you out of your other devices.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
          >
            Send password reset email
          </button>
        </div>
      </section>
    </div>
  )
}

