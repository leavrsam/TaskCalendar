import { CollaboratorAvatar } from './collaborator-avatar'
import { useCollaborators } from '@/features/sharing/api'

type CollaboratorStackProps = {
  uids: string[]
  max?: number
  size?: 'sm' | 'md'
}

export function CollaboratorStack({ uids, max = 3, size = 'sm' }: CollaboratorStackProps) {
  const { collaborators } = useCollaborators()
  if (!uids || uids.length === 0) return null
  const resolved = uids
    .map((uid) => collaborators[uid])
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
  if (resolved.length === 0) return null

  const visible = resolved.slice(0, max)
  const remaining = resolved.length - visible.length

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {visible.map((profile) => (
          <CollaboratorAvatar key={profile.uid} collaborator={profile} size={size} />
        ))}
      </div>
      {remaining > 0 && (
        <span className="text-xs font-semibold text-slate-500">+{remaining}</span>
      )}
    </div>
  )
}
