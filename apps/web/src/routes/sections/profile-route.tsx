import { useState } from 'react'
import { Upload } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { CollaboratorAvatar } from '@/components/collaborators/collaborator-avatar'
import { getFirebaseStorage } from '@/lib/firebase'

export function ProfileRoute() {
  const { user } = useAuth()
  const { updateUserProfile } = useAuth()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL ?? '')
  const [email] = useState(user?.email ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    console.log('Starting file upload:', file.name, file.size, file.type)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showErrorToast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
      })
      return
    }

    setIsUploading(true)
    try {
      console.log('Getting Firebase Storage...')
      const storage = getFirebaseStorage()
      console.log('Storage instance:', storage)

      const storageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}-${file.name}`)
      console.log('Storage ref created:', storageRef.fullPath)

      console.log('Uploading bytes...')
      await uploadBytes(storageRef, file)
      console.log('Upload complete, getting download URL...')

      const downloadURL = await getDownloadURL(storageRef)
      console.log('Download URL:', downloadURL)

      setAvatarUrl(downloadURL)
      showSuccessToast({
        title: 'Upload successful',
        description: 'Your profile picture has been uploaded. Click "Save changes" to apply.',
      })
    } catch (error) {
      console.error('Upload error:', error)
      showErrorToast({
        title: 'Upload failed',
        description: 'An error occurred while uploading your profile picture.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile({ displayName, photoURL: avatarUrl })
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
                size="lg"
                photoURL={avatarUrl}
              />
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase text-slate-500">Profile Picture</label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="profile-picture-upload"
                  />
                  <label
                    htmlFor="profile-picture-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
                {avatarUrl && (
                  <p className="mt-1 text-xs text-slate-500">Current image set</p>
                )}
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
              disabled={isSaving}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
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

