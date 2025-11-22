import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  subtitle: string
  footer: ReactNode
  children: ReactNode
}

export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">TaskCalendar</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {children}
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>
      </div>
    </div>
  )
}

