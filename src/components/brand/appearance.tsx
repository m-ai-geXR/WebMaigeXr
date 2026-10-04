'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/store/app-store'

const STYLE_ELEMENT_ID = 'maigexr-user-css'

/**
 * Applies the appearance settings: keeps next-themes in step with the stored
 * theme, and injects the user's stylesheet.
 *
 * The stored theme is the source of truth because it is what Settings edits and
 * what persists to the database. next-themes owns the `dark` class that Tailwind
 * keys off, so the two have to be kept aligned.
 *
 * Render once, near the root.
 */
export function AppearanceEffects() {
  const theme = useAppStore((s) => s.settings.theme)
  const customCss = useAppStore((s) => s.settings.customCss)
  const { setTheme, theme: activeTheme } = useTheme()

  useEffect(() => {
    if (theme && theme !== activeTheme) {
      setTheme(theme)
    }
  }, [theme, activeTheme, setTheme])

  useEffect(() => {
    if (typeof document === 'undefined') return

    let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null

    if (!customCss?.trim()) {
      el?.remove()
      return
    }

    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ELEMENT_ID
      // Last in <head> so it overrides the brand tokens and component styles.
      document.head.appendChild(el)
    }
    el.textContent = customCss
  }, [customCss])

  return null
}
