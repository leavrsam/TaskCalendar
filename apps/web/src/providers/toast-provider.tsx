import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

type ToastVariant = 'success' | 'error' | 'info'

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastRecord = ToastOptions & { id: number }

type ToastContextValue = {
  addToast: (toast: ToastOptions) => void
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timeout = timeouts.current[id]
    if (timeout) {
      clearTimeout(timeout)
      delete timeouts.current[id]
    }
  }, [])

  const addToast = useCallback(
    ({ duration = 4000, ...rest }: ToastOptions) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, ...rest }])
      timeouts.current[id] = setTimeout(() => {
        dismissToast(id)
      }, duration)
    },
    [dismissToast],
  )

  const value = useMemo(
    () => ({
      addToast,
      dismissToast,
    }),
    [addToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

type ToastItemProps = {
  toast: ToastRecord
  onDismiss: () => void
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-slate-200 bg-white text-slate-900',
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { title, description, variant = 'info' } = toast
  return (
    <div
      className={clsx(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg',
        variantClasses[variant],
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-sm opacity-80">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-sm font-semibold opacity-70 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}

