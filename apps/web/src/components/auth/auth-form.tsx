import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type AuthFormValues = z.infer<typeof schema>

type AuthFormProps = {
  mode: 'signIn' | 'create'
  onSubmit: (values: AuthFormValues) => Promise<void>
  loading?: boolean
}

export function AuthForm({ onSubmit, loading, mode }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'demo@taskcalendar.dev',
      password: 'demo-owner',
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      const fallback = mode === 'signIn' ? 'Failed to sign in' : 'Failed to create account'
      setError(err instanceof Error ? err.message : fallback)
    }
  })

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-xs text-rose-600">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? (mode === 'signIn' ? 'Signing in…' : 'Creating account…') : mode === 'signIn' ? 'Sign in' : 'Create account'}
      </button>
    </form>
  )
}

