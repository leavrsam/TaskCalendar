import type { Meta, StoryObj } from '@storybook/react'

import { ContactCard } from './contact-card'

const meta: Meta<typeof ContactCard> = {
  title: 'Contacts/ContactCard',
  component: ContactCard,
  args: {
    contact: {
      id: 'contact-demo',
      ownerUid: 'demo-owner',
      name: 'Maria Santos',
      stage: 'teaching',
      phone: '+1-555-123-4444',
      email: 'maria@example.com',
      address: '123 Elm St',
      tags: ['family', 'spanish'],
      notes: 'Prefers weeknight lessons with a member present.',
      lastContactedAt: new Date().toISOString(),
      nextVisitAt: new Date(Date.now() + 86400000).toISOString(),
      sharedWith: ['avery-demo'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
}

export default meta

type Story = StoryObj<typeof ContactCard>

export const Default: Story = {}

