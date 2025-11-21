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

export function CollaboratorAvatar({ collaborator, size = 'md', photoURL }: CollaboratorAvatarProps) {
  const initial = collaborator.label.charAt(0).toUpperCase()

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
        'flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700',
        sizeClasses[size],
      )}
      title={collaborator.label}
    >
      {initial}
    </div>
  )
}

