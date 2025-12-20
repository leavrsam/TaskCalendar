import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'
import { useAuth } from '@/hooks/use-auth'

interface ConnectCalendarButtonProps {
    label?: string;
    variant?: 'primary' | 'secondary' // Extendable
}

export function ConnectCalendarButton({ label = 'Connect Google Calendar' }: ConnectCalendarButtonProps) {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    const handleConnect = async () => {
        if (!user) {
            alert('You must be signed in to connect Google Calendar.')
            return
        }

        setIsLoading(true)
        try {
            // Get Firebase Functions instance
            const functions = getFunctions(getApp())
            const getGoogleAuthURL = httpsCallable(functions, 'getGoogleAuthURL')

            // Call the Cloud Function
            // We don't strictly need to pass arguments if the function uses auth context for state,
            // but the function implementation expects `request.auth.uid`. 
            // The Firebase SDK automatically attaches the ID token, so `request.auth` will be populated on the server.
            const result = await getGoogleAuthURL()
            const data = result.data as { url: string }

            if (data.url) {
                // Redirect to Google Auth
                window.location.href = data.url
            } else {
                throw new Error('No URL returned from server')
            }

        } catch (error) {
            console.error('Failed to initiate Google connection:', error)
            alert('Failed to connect. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
            {/* Google Icon SVG */}
            <svg className="h-4 w-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24" >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-white">
                {isLoading ? 'Connecting...' : label}
            </span>
        </button>
    )
}
