import clsx from 'clsx'

import type { CollaboratorProfile } from '@/features/sharing/api'

type CollaboratorAvatarProps = {
  collaborator: CollaboratorProfile
  size?: 'sm' | 'md'
}

const sizeClasses: Record<NonNullable<CollaboratorAvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
}

export function CollaboratorAvatar({ collaborator, size = 'md' }: CollaboratorAvatarProps) {
  const initial = collaborator.label.charAt(0).toUpperCase()
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

