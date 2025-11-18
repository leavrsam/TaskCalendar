import type { ReactNode } from 'react'
import {
  CalendarDays,
  ClipboardList,
  NotebookText,
  Users,
  House,
} from 'lucide-react'

export type NavItem = {
  label: string
  path: string
  icon: ReactNode
}

export const mainNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <House className="h-4 w-4" /> },
  { label: 'Contacts', path: '/contacts', icon: <Users className="h-4 w-4" /> },
  { label: 'Lessons', path: '/lessons', icon: <NotebookText className="h-4 w-4" /> },
  { label: 'Tasks & Calendar', path: '/schedule', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Goals', path: '/goals', icon: <ClipboardList className="h-4 w-4" /> },
]

