'use client'

import { Settings, Moon, Sun, Monitor, BookMarked } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Wordmark } from '@/components/brand/wordmark'

interface HeaderProps {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { setCurrentView } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getThemeIcon = () => {
    if (!mounted) return <Monitor size={20} />
    
    switch (theme) {
      case 'light':
        return <Sun size={20} />
      case 'dark':
        return <Moon size={20} />
      default:
        return <Monitor size={20} />
    }
  }

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-brand-bg border-b border-brand-divider">
      <div className="flex items-center space-x-3">
        {/* Brand mascot: hooded figure with the {ai} braces as its face. */}
        <img
          src="/brand/maigexr-mascot.jpg"
          alt="m{ai}geXR"
          width={32}
          height={32}
          className="w-8 h-8 object-cover"
        />
        <div>
          <h1 className="font-heading text-lg font-extrabold tracking-heading text-brand-text">
            <Wordmark />
          </h1>
          <p className="brand-label mt-0.5">
            AI-powered XR Development
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={cycleTheme}
          className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
          aria-label="Toggle theme"
        >
          {getThemeIcon()}
        </button>

        <button
          onClick={() => setCurrentView('snippets')}
          className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
          aria-label="Open snippets"
          title="Code Snippets Library"
        >
          <BookMarked size={20} />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
          aria-label="Open settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  )
}