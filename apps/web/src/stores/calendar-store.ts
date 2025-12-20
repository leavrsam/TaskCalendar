
import { create } from 'zustand'
import type { TaskEvent } from '@/features/tasks/api'

import { persist } from 'zustand/middleware'

type CalendarStore = {
    importedEvents: TaskEvent[]
    googleAccessToken: string | null
    addImportedEvents: (events: TaskEvent[]) => void
    clearImportedEvents: () => void
    setGoogleToken: (token: string) => void
    disconnectGoogle: () => void
}

export const useCalendarStore = create<CalendarStore>()(
    persist(
        (set) => ({
            importedEvents: [],
            googleAccessToken: null,
            addImportedEvents: (events) => set((state) => ({
                importedEvents: [...state.importedEvents, ...events]
            })),
            clearImportedEvents: () => set({ importedEvents: [] }),
            setGoogleToken: (token) => set({ googleAccessToken: token }),
            disconnectGoogle: () => set({ googleAccessToken: null, importedEvents: [] }), // Clear events on disconnect
        }),
        {
            name: 'calendar-storage',
            partialize: (state) => ({ googleAccessToken: state.googleAccessToken }), // Only persist token
        }
    )
)
