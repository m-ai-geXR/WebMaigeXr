'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { PlaygroundView } from '@/components/playground/playground-view'
import { ConversationList } from '@/components/conversation/conversation-list'
import { SnippetLibrary } from '@/components/snippets/snippet-library'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { Header } from '@/components/layout/header'
import { BottomNavigation } from '@/components/layout/bottom-navigation'
import { AdBanner } from '@/components/ads/AdBanner'
import { AdInterstitial } from '@/components/ads/AdInterstitial'
import { useAppStore } from '@/store/app-store'

export default function Home() {
  const { currentView, setCurrentView } = useAppStore()
  const [showSettings, setShowSettings] = useState(false)

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatInterface />
      case 'playground':
        return <PlaygroundView />
      case 'history':
        return <ConversationList />
      case 'snippets':
        return (
          <SnippetLibrary
            onClose={() => setCurrentView('playground')}
            onLoadSnippet={(snippet) => {
              // Snippet is already loaded by the component
              setCurrentView('playground')
            }}
          />
        )
      default:
        return <ChatInterface />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      <Header onOpenSettings={() => setShowSettings(true)} />
      
      <main className="flex-1 overflow-hidden">
        {renderCurrentView()}
      </main>
      
      <AdBanner />
      <BottomNavigation />
      <AdInterstitial />

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}