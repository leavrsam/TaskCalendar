import { useEffect } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import {
  useAcceptInvite,
  useDeclineInvite,
  useInviteDetails,
  useOwnerProfile,
} from '@/features/sharing/api'
import { useToast } from '@/hooks/use-toast'

export function InviteRoute() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const inviteId = params.get('invite')
  const ownerUid = params.get('owner')
  const navigate = useNavigate()
  const { success: showSuccessToast, error: showErrorToast } = useToast()

  const acceptInvite = useAcceptInvite()
  const declineInvite = useDeclineInvite()
  const inviteQuery = useInviteDetails(ownerUid, inviteId)
  const ownerProfileQuery = useOwnerProfile(ownerUid)

  if (!inviteId || !ownerUid) {
    return <Navigate to="/auth/sign-in" replace />
  }

  if (inviteQuery.isError) {
    return (
      <InviteError
        title="Invite not found"
        description="This invite link is invalid or has already been handled."
        actionHref="/auth/sign-in"
        actionLabel="Return to sign in"
      />
    )
  }

  if (inviteQuery.isLoading || ownerProfileQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Checking your invite…
        </div>
      </div>
    )
  }

  const invite = inviteQuery.data
  if (!invite) {
    return (
      <InviteError
        title="Invite not found"
        description="This invite link is invalid or has already been handled."
        actionHref="/auth/sign-in"
        actionLabel="Return to sign in"
      />
    )
  }
  const ownerProfile = ownerProfileQuery.data

  const acceptedByCurrentUser =
    invite.status === 'accepted' && invite.acceptedBy && invite.acceptedBy === user?.uid

  useEffect(() => {
    if (acceptInvite.isSuccess) {
      showSuccessToast({
        title: 'Invite accepted',
        description: 'You now have access to this workspace.',
      })
      navigate('/', { replace: true })
    }
  }, [acceptInvite.isSuccess, navigate, showSuccessToast])

  useEffect(() => {
    if (declineInvite.isSuccess) {
      showSuccessToast({
        title: 'Invite declined',
        description: 'The workspace owner has been notified.',
      })
      navigate('/', { replace: true })
    }
  }, [declineInvite.isSuccess, navigate, showSuccessToast])

  useEffect(() => {
    if (acceptInvite.isError) {
      showErrorToast({
        title: 'Unable to accept invite',
        description: acceptInvite.error instanceof Error ? acceptInvite.error.message : undefined,
      })
    }
  }, [acceptInvite.error, acceptInvite.isError, showErrorToast])

  useEffect(() => {
    if (declineInvite.isError) {
      showErrorToast({
        title: 'Unable to decline invite',
        description: declineInvite.error instanceof Error ? declineInvite.error.message : undefined,
      })
    }
  }, [declineInvite.error, declineInvite.isError, showErrorToast])

  if (invite.status === 'revoked') {
    return (
      <InviteError
        title="Invite revoked"
        description="The workspace owner has revoked this invite."
        actionHref="/auth/sign-in"
        actionLabel="Return to sign in"
      />
    )
  }

  if (invite.status === 'declined' && !acceptedByCurrentUser) {
    return (
      <InviteError
        title="Invite declined"
        description="This invite has already been declined."
        actionHref="/auth/sign-in"
        actionLabel="Return to sign in"
      />
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(`/invite?invite=${inviteId}&owner=${ownerUid}`)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Invite</p>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in to respond</h1>
          <p className="text-sm text-slate-600">
            {ownerProfile?.displayName ?? ownerProfile?.email ?? 'A workspace owner'} invited you to
            collaborate. Sign in to accept or decline.
          </p>
          <a
            href={`/auth/sign-in?redirect=${redirect}`}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign in
          </a>
        </div>
      </div>
    )
  }

  if (acceptInvite.isSuccess || declineInvite.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Redirecting to your workspace…
        </div>
      </div>
    )
  }

  if (acceptedByCurrentUser || (invite.status === 'accepted' && invite.acceptedBy && invite.acceptedBy !== user.uid)) {
    return <Navigate to="/" replace />
  }

  const disableActions = acceptInvite.isPending || declineInvite.isPending || loading
  const roleLabel =
    invite.role === 'editor' ? 'Editor (can update records)' : 'Viewer (read-only access)'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace invite</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Join {ownerProfile?.displayName ?? ownerProfile?.email ?? 'this workspace'}?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Accepting grants you access to contacts, lessons, tasks, and notes for this workspace.
            You can revoke access at any time.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-900">Owner email:</span>{' '}
            {ownerProfile?.email ?? 'Unknown'}
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-900">Role requested:</span> {roleLabel}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={() => {
              acceptInvite.mutate({
                ownerUid,
                inviteId,
                collaboratorUid: user.uid,
              })
            }}
            disabled={disableActions}
            className="flex-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {acceptInvite.isPending ? 'Accepting…' : 'Accept invite'}
          </button>
          <button
            type="button"
            onClick={() => {
              declineInvite.mutate({ ownerUid, inviteId })
            }}
            disabled={disableActions}
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-60"
          >
            {declineInvite.isPending ? 'Declining…' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}

type InviteErrorProps = {
  title: string
  description: string
  actionHref: string
  actionLabel: string
}

function InviteError({ title, description, actionHref, actionLabel }: InviteErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Invite</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
        <a
          href={actionHref}
          className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {actionLabel}
        </a>
      </div>
    </div>
  )
}

