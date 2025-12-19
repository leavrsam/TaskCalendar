
import { create } from 'zustand'
import type { TaskEvent } from '@/features/tasks/api'

type CalendarStore = {
    importedEvents: TaskEvent[]
    addImportedEvents: (events: TaskEvent[]) => void
    clearImportedEvents: () => void
}

export const useCalendarStore = create<CalendarStore>((set) => ({
    importedEvents: [],
    addImportedEvents: (events) => set((state) => ({
        importedEvents: [...state.importedEvents, ...events]
    })),
    clearImportedEvents: () => set({ importedEvents: [] }),
}))
