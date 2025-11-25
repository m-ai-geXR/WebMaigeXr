'use client'

/**
 * Database Initializer Component
 *
 * Initializes the SQLite database on app startup.
 * This must be a client component to use useEffect and browser APIs.
 */

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'

export function DbInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const initialize = useAppStore((state) => state.initialize)
  const isInitialized = useAppStore((state) => state.isInitialized)

  useEffect(() => {
    // Only initialize on the client side
    if (typeof window === 'undefined') return

    const initializeDb = async () => {
      try {
        console.log('🚀 Initializing database...')
        await initialize()
        setIsReady(true)
        console.log('✅ Database initialized successfully')
      } catch (error) {
        console.error('❌ Database initialization failed:', error)
        // Still set ready to true to allow app to run (with fallback)
        setIsReady(true)
      }
    }

    if (!isInitialized) {
      initializeDb()
    } else {
      setIsReady(true)
    }
  }, [initialize, isInitialized])

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
