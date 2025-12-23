import { DashboardRoute } from '@/routes/sections/dashboard-route'
import { ContactsRoute } from '@/routes/sections/contacts-route'
import { VisitsRoute } from '@/routes/sections/visits-route'
import { ScheduleRoute } from '@/routes/sections/schedule-route'
import { GoalsRoute } from '@/routes/sections/goals-route'
import { MapRoute } from '@/routes/sections/map-route'
import { SettingsRoute } from '@/routes/sections/settings-route'
import { ProfileRoute } from '@/routes/sections/profile-route'
import { InviteRoute } from '@/routes/sections/invite-route'
import { SignInRoute } from '@/routes/sections/sign-in-route'
import { CreateAccountRoute } from '@/routes/sections/create-account-route'
import { NotFoundRoute } from '@/routes/sections/not-found-route'
import { AppLayout } from '@/components/layout/app-layout'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/auth-guard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DashboardRoute />,
      },
      {
        path: 'contacts',
        element: <ContactsRoute />,
      },
      {
        path: 'visits',
        element: <VisitsRoute />,
      },
      {
        path: 'schedule',
        element: <ScheduleRoute />,
      },
      {
        path: 'goals',
        element: <GoalsRoute />,
      },
      {
        path: 'map',
        element: <MapRoute />,
      },
      {
        path: 'settings',
        element: <SettingsRoute />,
      },
      {
        path: 'profile',
        element: <ProfileRoute />,
      },
      {
        path: 'invite/:id',
        element: <InviteRoute />,
      },
    ],
  },
  {
    path: '/lessons',
    element: <Navigate to="/visits" replace />,
  },
  {
    path: 'auth',
    children: [
      {
        path: 'sign-in',
        element: <SignInRoute />,
      },
      {
        path: 'create',
        element: <CreateAccountRoute />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
])
