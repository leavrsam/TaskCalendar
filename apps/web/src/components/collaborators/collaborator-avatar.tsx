import clsx from 'clsx'

import type { CollaboratorProfile } from '@/features/sharing/api'

type CollaboratorAvatarProps = {
  collaborator: CollaboratorProfile
  size?: 'sm' | 'md' | 'lg'
  photoURL?: string
}

const sizeClasses: Record<NonNullable<CollaboratorAvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-12 w-12 text-base',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function CollaboratorAvatar({ collaborator, size = 'md', photoURL }: CollaboratorAvatarProps) {
  const initials = getInitials(collaborator.label)

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={collaborator.label}
        className={clsx(
          'rounded-full object-cover',
          sizeClasses[size],
        )}
        title={collaborator.label}
      />
    )
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300',
        sizeClasses[size],
      )}
      title={collaborator.label}
    >
      {initials}
    </div>
  )
}

