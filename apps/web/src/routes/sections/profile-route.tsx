import { useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'

export function ProfileRoute() {
  const { user } = useAuth()
  const { updateUserProfile } = useAuth()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [email] = useState(user?.email ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile({ displayName })
      showSuccessToast({
        title: 'Profile saved',
        description: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      showErrorToast({
        title: 'Failed to save profile',
        description: 'An error occurred while updating your profile.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Your account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Update your display name. Your avatar shows your initials.
        </p>
      </header>
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Basic info</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <CollaboratorAvatar
                collaborator={{
                  uid: user?.uid ?? 'me',
                  email: user?.email ?? '',
                  label: displayName || user?.email || 'You',
                }}
                size="lg"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Avatar</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Your avatar displays your initials based on your display name
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your initials will be generated from your first and last name
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Password</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Changing your password will sign you out of your other devices.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600"
          >
            Send password reset email
          </button>
        </div>
      </section>
    </div>
  )
}

