import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import tailwindColors from 'tailwindcss/colors'

export const colors = {
  brand: {
    50: '#f0f7ff',
    100: '#d9e9ff',
    200: '#b0d3ff',
    300: '#7fb5ff',
    400: '#4a90ff',
    500: '#1f6aff',
    600: '#0f4edb',
    700: '#0d3da8',
    800: '#0f2f7c',
    900: '#0f275f',
  },
  slate: tailwindColors.slate,
  success: '#0a9b63',
  warning: '#febb40',
  danger: '#ff6b6b',
}

export const radii = {
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '999px',
}

export const spacing = {
  gutter: '1.5rem',
  section: '2.5rem',
}

export const fonts = {
  sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
  mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
}

export const tokens = {
  colors,
  radii,
  spacing,
  fonts,
} as const

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors,
      fontFamily: fonts,
      borderRadius: {
        lg: radii.lg,
        xl: radii.xl,
        full: radii.full,
      },
      spacing: {
        gutter: spacing.gutter,
        section: spacing.section,
      },
      boxShadow: {
        card: '0 10px 40px rgba(15, 31, 60, 0.08)',
      },
    },
  },
}

export const buildCssVariables = () => {
  const lines: string[] = []

  Object.entries(colors.brand).forEach(([key, value]) => {
    lines.push(`  --tc-color-brand-${key}: ${value};`)
  })
  lines.push(`  --tc-color-success: ${colors.success};`)
  lines.push(`  --tc-color-warning: ${colors.warning};`)
  lines.push(`  --tc-color-danger: ${colors.danger};`)

  Object.entries(radii).forEach(([key, value]) => {
    lines.push(`  --tc-radius-${key}: ${value};`)
  })

  Object.entries(spacing).forEach(([key, value]) => {
    lines.push(`  --tc-spacing-${key}: ${value};`)
  })

  return `:root {\n${lines.join('\n')}\n}`
}

