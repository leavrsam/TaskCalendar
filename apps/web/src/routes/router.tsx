import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { DashboardRoute } from '@/routes/sections/dashboard-route'
import { ContactsRoute } from '@/routes/sections/contacts-route'
import { LessonsRoute } from '@/routes/sections/lessons-route'
import { ScheduleRoute } from '@/routes/sections/schedule-route'
import { GoalsRoute } from '@/routes/sections/goals-route'
import { NotFoundRoute } from '@/routes/sections/not-found-route'
import { SignInRoute } from '@/routes/sections/sign-in-route'
import { CreateAccountRoute } from '@/routes/sections/create-account-route'
import { InviteRoute } from '@/routes/sections/invite-route'
import { ProfileRoute } from '@/routes/sections/profile-route'
import { SettingsRoute } from '@/routes/sections/settings-route'
import { MapRoute } from '@/routes/sections/map-route'
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
    path: '/invite',
    element: <InviteRoute />,
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
            path: 'profile',
            element: <ProfileRoute />,
          },
          {
            path: 'settings',
            element: <SettingsRoute />,
          },
          {
            path: 'goals',
            element: <GoalsRoute />,
          },
          {
            path: 'map',
            element: <MapRoute />,
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
