'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { cryptoService, type EncryptedData, type DecryptedApiKeys } from '@/lib/crypto-service'
import { useAppStore } from '@/store/app-store'
import toast from 'react-hot-toast'

interface APIKeyUnlockProps {
  encryptedData: EncryptedData | null
  onUnlock: (apiKeys: DecryptedApiKeys) => void
  onSetupNewPassword: () => void
}

export function APIKeyUnlock({ encryptedData, onUnlock, onSetupNewPassword }: APIKeyUnlockProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 5

  // Check if crypto is supported
  useEffect(() => {
    if (!cryptoService.isSupported()) {
      setError('Web Crypto API not supported in this browser')
    }
  }, [])

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your password')
      return
    }

    if (!encryptedData) {
      setError('No encrypted data found')
      return
    }

    if (attempts >= maxAttempts) {
      setError('Too many failed attempts. Please refresh the page.')
      return
    }

    setIsUnlocking(true)
    setError('')

    try {
      const decryptedKeys = await cryptoService.unlockSession(encryptedData, password)
      toast.success('API keys unlocked successfully!')
      onUnlock(decryptedKeys)
      setPassword('') // Clear password from input
    } catch (err) {
      console.error('Unlock error:', err)
      setAttempts(prev => prev + 1)
      const remainingAttempts = maxAttempts - attempts - 1

      if (remainingAttempts > 0) {
        setError(`Incorrect password. ${remainingAttempts} attempts remaining.`)
      } else {
        setError('Too many failed attempts. Please refresh the page.')
      }

      toast.error('Incorrect password')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock()
    }
  }

  // If no encrypted data exists, show setup flow
  if (!encryptedData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Setup Encryption
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create a password to encrypt your API keys
              </p>
            </div>

            <button
              onClick={onSetupNewPassword}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Lock size={20} />
              <span>Setup Password</span>
            </button>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Your API keys will be encrypted with AES-256-GCM encryption
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Unlock API Keys
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your password to access encrypted API keys
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter your password"
                disabled={isUnlocking || attempts >= maxAttempts}
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={isUnlocking || attempts >= maxAttempts}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Unlock Button */}
            <button
              onClick={handleUnlock}
              disabled={isUnlocking || !password || attempts >= maxAttempts}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isUnlocking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <Unlock size={20} />
                  <span>Unlock</span>
                </>
              )}
            </button>

            {/* Info */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Session will auto-lock after 30 minutes of inactivity</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Password is never stored, only kept in memory</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>AES-256-GCM encryption with PBKDF2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Forgot your password?{' '}
          <button
            onClick={onSetupNewPassword}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Setup new password
          </button>
          <br />
          <span className="text-xs text-gray-500">
            (This will require re-entering all API keys)
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Password Setup Component
 */
interface PasswordSetupProps {
  onPasswordCreated: (password: string, apiKeys: DecryptedApiKeys) => void
  onCancel: () => void
  existingApiKeys?: DecryptedApiKeys
}

export function PasswordSetup({ onPasswordCreated, onCancel, existingApiKeys }: PasswordSetupProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [apiKeys, setApiKeys] = useState<DecryptedApiKeys>(existingApiKeys || {})

  const handleCreate = () => {
    const newErrors: string[] = []

    // Validate password
    if (password !== confirmPassword) {
      newErrors.push('Passwords do not match')
    }

    const validation = cryptoService.validatePassword(password)
    if (!validation.valid) {
      newErrors.push(...validation.errors)
    }

    // Check if at least one API key is provided
    const hasApiKey = Object.values(apiKeys).some(key => key && key.trim() !== '')
    if (!hasApiKey) {
      newErrors.push('Please provide at least one API key')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    onPasswordCreated(password, apiKeys)
  }

  const handleGeneratePassword = () => {
    const generated = cryptoService.generateRandomPassword(16)
    setPassword(generated)
    setConfirmPassword(generated)
    setShowPassword(true)
    toast.success('Strong password generated!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Create Encryption Password
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This password will encrypt your API keys
            </p>
          </div>

          <div className="space-y-4">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors([])
                  }}
                  placeholder="Enter a strong password"
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setErrors([])
                }}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Generate Password Button */}
            <button
              onClick={handleGeneratePassword}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Generate strong password
            </button>

            {/* API Keys Input */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                API Keys (at least one required)
              </h3>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Together AI API Key"
                  value={apiKeys.together || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, together: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="OpenAI API Key"
                  value={apiKeys.openai || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="Anthropic API Key"
                  value={apiKeys.anthropic || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="Google AI API Key"
                  value={apiKeys.google || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, google: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create & Encrypt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
