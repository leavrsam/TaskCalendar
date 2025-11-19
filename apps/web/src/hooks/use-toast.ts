import { useToastContext, type ToastOptions } from '@/providers/toast-provider'

export const useToast = () => {
  const { addToast, dismissToast } = useToastContext()
  return {
    toast: addToast,
    dismissToast,
    success: (opts: Omit<ToastOptions, 'variant'>) => addToast({ variant: 'success', ...opts }),
    error: (opts: Omit<ToastOptions, 'variant'>) => addToast({ variant: 'error', ...opts }),
    info: (opts: Omit<ToastOptions, 'variant'>) => addToast({ variant: 'info', ...opts }),
  }
}

