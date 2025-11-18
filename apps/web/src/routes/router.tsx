import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { DashboardRoute } from '@/routes/sections/dashboard-route'
import { ContactsRoute } from '@/routes/sections/contacts-route'
import { LessonsRoute } from '@/routes/sections/lessons-route'
import { ScheduleRoute } from '@/routes/sections/schedule-route'
import { NotFoundRoute } from '@/routes/sections/not-found-route'
import { SignInRoute } from '@/routes/sections/sign-in-route'
import { CreateAccountRoute } from '@/routes/sections/create-account-route'
import { ComingSoon } from '@/components/status/coming-soon'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <Navigate to="/auth/sign-in" replace />,
  },
  {
    path: '/auth/sign-in',
    element: <SignInRoute />,
  },
  {
    path: '/auth/create',
    element: <CreateAccountRoute />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardRoute /> },
          {
            path: 'contacts',
            element: <ContactsRoute />,
          },
          {
            path: 'lessons',
            element: <LessonsRoute />,
          },
          {
            path: 'schedule',
            element: <ScheduleRoute />,
          },
          {
            path: 'goals',
            element: (
              <ComingSoon
                title="Goal tracking"
                description="Slice 6 will unlock KPIs and progress alerts for your personal focus areas."
              />
            ),
          },
          {
            path: 'map',
            element: (
              <ComingSoon
                title="Interactive map"
                description="Slice 7 gives you a live map of contacts, tasks, and travel estimates."
              />
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
])
