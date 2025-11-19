import { useMemo, useState } from 'react'
import clsx from 'clsx'

import type { WorkspaceInvite } from '@taskcalendar/core'

import {
  useCreateInvite,
  useInvitesQuery,
  useRevokeInvite,
} from '@/features/sharing/api'

const roleLabels: Record<WorkspaceInvite['role'], string> = {
  viewer: 'Viewer',
  editor: 'Editor',
}

const statusTone: Record<WorkspaceInvite['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-rose-50 text-rose-700',
  revoked: 'bg-slate-100 text-slate-600',
}

export function ShareWorkspaceCard() {
  const invitesQuery = useInvitesQuery()
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceInvite['role']>('editor')
  const [error, setError] = useState<string | null>(null)

  const invites = invitesQuery.data ?? []
  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending'),
    [invites],
  )
  const activeCollaborators = useMemo(
    () => invites.filter((invite) => invite.status === 'accepted'),
    [invites],
  )

  const onSubmit = async () => {
    setError(null)
    try {
      await createInvite.mutateAsync({ email, role })
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send invite')
    }
  }

  return (
    <div className="flex h-fit flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Sharing</p>
        <h2 className="text-lg font-semibold text-slate-900">Workspace access</h2>
        <p className="text-sm text-slate-600">
          Invite collaborators to help plan lessons, contacts, and tasks. Pending invites can be revoked at any time.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceInvite['role'])}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="editor">Editor (can update records)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
        </div>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        <button
          type="button"
          onClick={() => {
            void onSubmit()
          }}
          disabled={createInvite.isPending || !email}
          className="w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {createInvite.isPending ? 'Sending invite…' : 'Send invite'}
        </button>
      </div>

      <InviteList
        title="Active collaborators"
        emptyText="No collaborators yet."
        invites={activeCollaborators}
      />
      <InviteList
        title="Pending invites"
        emptyText="No pending invites."
        invites={pendingInvites}
        onRevoke={(inviteId) => {
          revokeInvite.mutate(inviteId)
        }}
      />
      <InviteList
        title="Recent activity"
        emptyText="No invite history yet."
        invites={invites.slice(0, 5)}
        onRevoke={(inviteId) => {
          revokeInvite.mutate(inviteId)
        }}
      />
    </div>
  )
}

type InviteListProps = {
  title: string
  emptyText: string
  invites: WorkspaceInvite[]
  onRevoke?: (id: string) => void
}

function InviteList({ title, emptyText, invites, onRevoke }: InviteListProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        {invites.length > 0 && (
          <span className="text-xs font-semibold text-slate-400">{invites.length}</span>
        )}
      </div>
      <div className="mt-2 space-y-3">
        {invites.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {emptyText}
          </p>
        )}
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-900">{invite.email}</p>
              <p className="text-xs text-slate-500">
                {roleLabels[invite.role]} •{' '}
                <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', statusTone[invite.status])}>
                  {invite.status}
                </span>
              </p>
            </div>
            {invite.status === 'pending' && onRevoke && (
              <button
                type="button"
                onClick={() => onRevoke(invite.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

