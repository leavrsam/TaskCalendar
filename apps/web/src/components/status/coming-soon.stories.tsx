import type { Meta, StoryObj } from '@storybook/react'

import { ComingSoon } from './coming-soon'

const meta: Meta<typeof ComingSoon> = {
  title: 'Status/ComingSoon',
  component: ComingSoon,
  args: {
    title: 'Goal tracking',
    description: 'Slice 6 will unlock KPI widgets and progress alerts.',
  },
}

export default meta

type Story = StoryObj<typeof ComingSoon>

export const Default: Story = {}

