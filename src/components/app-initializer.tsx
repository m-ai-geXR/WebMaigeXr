'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { APIKeyUnlock, PasswordSetup } from '@/components/settings/api-key-unlock'
import { cryptoService, type EncryptedData, type DecryptedApiKeys } from '@/lib/crypto-service'
import { dbService } from '@/lib/db-service'
import toast from 'react-hot-toast'

interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const { initialize, updateSettings, settings } = useAppStore()
  const [isInitializing, setIsInitializing] = useState(true)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [encryptedData, setEncryptedData] = useState<EncryptedData | null>(null)

  // Initialize app and check for encryption
  useEffect(() => {
    const initializeApp = async () => {
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
        console.error('Failed to initialize app:', error)
        toast.error('Failed to initialize application')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeApp()
  }, [initialize])

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
            Initializing XRAiAssistant...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Loading database and checking encryption
          </p>
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
