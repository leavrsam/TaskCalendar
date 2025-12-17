import { createContext, useContext, useEffect, useState } from 'react'
import { themeColors, type ThemeColor } from '@/lib/themes'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    defaultColor?: ThemeColor
    storageKey?: string
    colorStorageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    themeColor: ThemeColor
    setThemeColor: (color: ThemeColor) => void
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
    themeColor: 'blue',
    setThemeColor: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    defaultColor = 'blue',
    storageKey = 'vite-ui-theme',
    colorStorageKey = 'vite-ui-color-theme',
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )
    const [themeColor, setThemeColor] = useState<ThemeColor>(
        () => (localStorage.getItem(colorStorageKey) as ThemeColor) || defaultColor
    )

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove('light', 'dark')

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light'

            root.classList.add(systemTheme)

            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = (e: MediaQueryListEvent) => {
                root.classList.remove('light', 'dark')
                root.classList.add(e.matches ? 'dark' : 'light')
            }

            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }

        root.classList.add(theme)
    }, [theme])

    // Apply Theme Color Variables
    useEffect(() => {
        const root = window.document.documentElement
        const colors = themeColors[themeColor]?.colors || themeColors.blue.colors

        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--brand-${key}`, value)
        })
    }, [themeColor])


    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
        themeColor,
        setThemeColor: (color: ThemeColor) => {
            localStorage.setItem(colorStorageKey, color)
            setThemeColor(color)
        }
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider')

    return context
}
