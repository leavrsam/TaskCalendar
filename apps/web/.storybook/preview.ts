import type { Preview } from '@storybook/react'

import '../src/index.css'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#f8f9fb' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
}

export default preview

