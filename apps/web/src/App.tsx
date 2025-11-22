import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { router } from '@/routes/router'

export function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <RouterProvider router={router} />
          </ThemeProvider>
        </AuthProvider>
        <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      </QueryClientProvider>
    </ToastProvider>
  )
}

export default App
