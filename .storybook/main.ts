import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
    '../src/**/*.story.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    'msw-storybook-addon',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Reuse the same path aliases from vite.config.ts
    const path = await import('path')
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      '@':           path.resolve(__dirname, '../src'),
      '@app':        path.resolve(__dirname, '../src/app'),
      '@components': path.resolve(__dirname, '../src/components'),
      '@lib':        path.resolve(__dirname, '../src/lib'),
      '@hooks':      path.resolve(__dirname, '../src/hooks'),
      '@providers':  path.resolve(__dirname, '../src/providers'),
      '@config':     path.resolve(__dirname, '../src/config'),
    }
    return config
  },
  docs: { autodocs: 'tag' },
}

export default config
