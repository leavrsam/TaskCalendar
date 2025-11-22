import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
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
      className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Email</label>
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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

