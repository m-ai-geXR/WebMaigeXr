'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { APIKeyUnlock, PasswordSetup } from '@/components/settings/api-key-unlock'
import { cryptoService, type EncryptedData, type DecryptedApiKeys } from '@/lib/crypto-service'
import { dbService } from '@/lib/db-service'
import toast from 'react-hot-toast'
import { Wordmark } from '@/components/brand/wordmark'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const { initialize, updateSettings, settings } = useAppStore()
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [encryptedData, setEncryptedData] = useState<EncryptedData | null>(null)

  // Initialize app and check for encryption
  const initializeApp = useCallback(async () => {
      setIsInitializing(true)
      setInitError(null)
      try {
        // Initialize database and store
        await initialize()

        // Check if encryption is enabled
        const encryptedKeys = dbService.getEncryptedApiKeys()

        if (encryptedKeys) {
          // Parse encrypted data
          try {
            const parsed: EncryptedData = JSON.parse(encryptedKeys)
            setEncryptedData(parsed)
            setEncryptionEnabled(true)
            setIsUnlocked(false)
          } catch (error) {
            console.error('Failed to parse encrypted data:', error)
            toast.error('Encrypted data is corrupted. Please reset encryption.')
          }
        } else {
          // No encryption, proceed normally
          setEncryptionEnabled(false)
          setIsUnlocked(true)
        }
      } catch (error) {
        // Do NOT fall through to rendering the app here.
        //
        // This used to log, toast, and then clear isInitializing in a `finally`,
        // which rendered the full UI on top of an uninitialised database. Since
        // the store calls dbService directly in about twenty places, every
        // subsequent action — switching 3D library, changing a model, saving a
        // snippet — threw "Database not initialized" straight out of a Zustand
        // set() updater, surfacing as a wall of uncaught React errors far from
        // the real cause. Showing the actual failure once is far more useful.
        console.error('Failed to initialize app:', error)
        const message = error instanceof Error ? error.message : String(error)
        setInitError(message)
        toast.error('Failed to initialize application')
        setIsInitializing(false)
        return
      }

      setIsInitializing(false)
  }, [initialize])

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  // Handle successful unlock
  const handleUnlock = (apiKeys: DecryptedApiKeys) => {
    // Filter out undefined values and update settings
    const filteredKeys: Record<string, string> = Object.entries(apiKeys)
      .filter(([_, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value as string }), {})

    updateSettings({ apiKeys: filteredKeys })
    setIsUnlocked(true)
    toast.success('API keys unlocked!')
  }

  // Handle password setup
  const handlePasswordCreated = async (password: string, apiKeys: DecryptedApiKeys) => {
    try {
      // Encrypt API keys
      const encrypted = await cryptoService.encryptApiKeys(apiKeys, password)

      // Save encrypted data to database
      dbService.saveEncryptedApiKeys(JSON.stringify(encrypted))

      // Filter out undefined values and update settings
      const filteredKeys: Record<string, string> = Object.entries(apiKeys)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value as string }), {})

      // Update settings with decrypted keys (in memory only)
      updateSettings({ apiKeys: filteredKeys })

      // Cache password for session
      await cryptoService.unlockSession(encrypted, password)

      setEncryptedData(encrypted)
      setEncryptionEnabled(true)
      setIsUnlocked(true)
      setShowPasswordSetup(false)

      toast.success('Encryption enabled! API keys are now secure.')
    } catch (error) {
      console.error('Failed to setup encryption:', error)
      toast.error('Failed to setup encryption')
    }
  }

  // Handle reset encryption (start fresh)
  const handleSetupNewPassword = () => {
    setShowPasswordSetup(true)
    setEncryptedData(null)
  }

  // Loading state
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
            Initializing <Wordmark />...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Loading database and checking encryption
          </p>
        </div>
      </div>
    )
  }

  // Initialization failed — surface it instead of rendering a broken app
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Could not start maigeXR
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            The local database failed to initialize, so settings and conversations
            cannot be saved. The app is not usable in this state.
          </p>

          <pre className="text-xs bg-gray-100 dark:bg-gray-900 text-red-600 dark:text-red-400 rounded p-3 mb-4 overflow-x-auto whitespace-pre-wrap">
            {initError}
          </pre>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            The usual cause is a missing sql.js WebAssembly file. From the project
            directory run <code className="font-mono text-xs bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">pnpm run sql-wasm</code>,
            then reload.
          </p>

          <button
            onClick={() => initializeApp()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show password setup if requested
  if (showPasswordSetup) {
    return (
      <PasswordSetup
        onPasswordCreated={handlePasswordCreated}
        onCancel={() => {
          setShowPasswordSetup(false)
          // If no encryption was enabled before, proceed without it
          if (!encryptionEnabled) {
            setIsUnlocked(true)
          }
        }}
        existingApiKeys={settings.apiKeys}
      />
    )
  }

  // Show unlock screen if encryption is enabled and not unlocked
  if (encryptionEnabled && !isUnlocked) {
    return (
      <APIKeyUnlock
        encryptedData={encryptedData}
        onUnlock={handleUnlock}
        onSetupNewPassword={handleSetupNewPassword}
      />
    )
  }

  // App is ready, render children
  return <>{children}</>
}
