'use client'

import { MessageCircle, Code, History, BookMarked } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

export function BottomNavigation() {
  const { currentView, setCurrentView } = useAppStore()

  const tabs = [
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: MessageCircle,
      description: 'AI Conversation'
    },
    {
      id: 'playground' as const,
      label: 'Playground',
      icon: Code,
      description: '3D Scene Editor'
    },
    {
      id: 'snippets' as const,
      label: 'Snippets',
      icon: BookMarked,
      description: 'Code Library'
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: History,
      description: 'Conversations'
    }
  ]

  return (
    <nav className="flex bg-brand-bg border-t border-brand-divider">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = currentView === tab.id
        
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={cn(
              // Active state is a 2px accent rule along the top edge rather than
              // a tinted panel, so the bar stays one flat surface.
              "relative flex-1 flex flex-col items-center justify-center px-3 py-3 transition-colors",
              "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:transition-colors",
              isActive
                ? "text-brand-text before:bg-brand-accent"
                : "text-brand-muted hover:text-brand-text before:bg-transparent"
            )}
          >
            <Icon size={18} className="mb-1.5" />
            <span className="text-[11px] font-semibold tracking-label uppercase">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}