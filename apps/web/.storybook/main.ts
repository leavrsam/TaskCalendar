import { fileURLToPath, URL } from 'node:url'

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '@taskcalendar/core': fileURLToPath(
        new URL('../../packages/core/src', import.meta.url),
      ),
      '@taskcalendar/design-tokens': fileURLToPath(
        new URL('../../packages/design-tokens/src', import.meta.url),
      ),
    }
    return config
  },
}

export default config

