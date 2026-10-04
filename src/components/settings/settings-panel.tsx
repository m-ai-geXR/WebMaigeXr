'use client'

import { useState } from 'react'
import { X, Eye, EyeOff, Save, RotateCcw, Lock, Unlock, Shield } from 'lucide-react'
import { useAppStore, AI_EFFORT_LEVELS } from '@/store/app-store'
import { getParameterDescription, validateApiKey } from '@/lib/utils'
import { cryptoService } from '@/lib/crypto-service'
import { dbService } from '@/lib/db-service'
import toast from 'react-hot-toast'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, providers, libraries, getCurrentProvider, getCurrentModel } = useAppStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [encryptionEnabled, setEncryptionEnabled] = useState(dbService.hasEncryptedApiKeys())
  const [isLocked, setIsLocked] = useState(!cryptoService.isUnlocked())

  const currentProvider = providers.find(p => p.id === localSettings.selectedProvider)
  const currentModel = currentProvider?.models.find(m => m.id === localSettings.selectedModel)
  const currentLibrary = libraries.find(l => l.id === localSettings.selectedLibrary)

  // Claude 5 series and GPT-5.6/GPT-6 reject temperature and top_p outright.
  const usesEffortControl = (currentModel?.control ?? 'sampling') === 'effort'
  const currentEffort = AI_EFFORT_LEVELS.find(l => l.id === localSettings.effort)

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleApiKeyChange = (providerId: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: value }
    }))
    setHasChanges(true)
  }

  const toggleShowApiKey = (providerId: string) => {
    setShowApiKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const handleSave = () => {
    updateSettings(localSettings)
    setHasChanges(false)
    toast.success('Settings saved successfully!')
    setTimeout(onClose, 1000)
  }

  const handleReset = () => {
    setLocalSettings(settings)
    setHasChanges(false)
    toast.success('Changes reset')
  }

  const handleLockSession = () => {
    cryptoService.lockSession()
    setIsLocked(true)
    toast.success('Session locked. API keys are encrypted.')
    // Optionally reload to show unlock screen
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleEnableEncryption = async () => {
    // This would trigger the password setup flow
    toast('Please refresh the app to enable encryption', { icon: '🔐' })
    // In a real implementation, you'd navigate to the setup flow
  }

  const parameterDescription = getParameterDescription(localSettings.temperature, localSettings.topP)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-bg  shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-divider flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">Settings</h2>
            <p className="text-sm text-brand-muted mt-1">
              Configure your AI providers and 3D libraries
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2  hover:bg-brand-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-6 space-y-8">
            {/* Encryption Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-brand-text flex items-center">
                  <Shield className="mr-2" size={20} />
                  API Key Security
                </h3>
              </div>

              <div className={`p-4  border ${
                encryptionEnabled
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-brand-surface border-brand-divider'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {encryptionEnabled ? (
                        <Lock className="text-green-600 dark:text-green-400" size={16} />
                      ) : (
                        <Unlock className="text-brand-muted" size={16} />
                      )}
                      <h4 className="font-medium text-brand-text">
                        {encryptionEnabled ? 'Encryption Enabled' : 'Encryption Disabled'}
                      </h4>
                    </div>

                    <p className="text-sm text-brand-muted">
                      {encryptionEnabled ? (
                        <>
                          Your API keys are encrypted with AES-256-GCM.
                          {isLocked ? ' Session is locked.' : ' Session is unlocked.'}
                        </>
                      ) : (
                        'API keys are stored in plain text. Enable encryption for better security.'
                      )}
                    </p>
                  </div>

                  <div>
                    {encryptionEnabled ? (
                      <button
                        onClick={handleLockSession}
                        disabled={isLocked}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white  hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <Lock size={14} />
                        <span>{isLocked ? 'Locked' : 'Lock Now'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleEnableEncryption}
                        className="flex items-center space-x-1 px-3 py-2 bg-brand-accent text-white hover:opacity-90 transition-colors text-sm"
                      >
                        <Shield size={14} />
                        <span>Enable</span>
                      </button>
                    )}
                  </div>
                </div>

                {encryptionEnabled && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <ul className="text-xs text-brand-muted space-y-1">
                      <li>• Auto-locks after 30 minutes of inactivity</li>
                      <li>• Password never stored, only in memory</li>
                      <li>• 100,000 PBKDF2 iterations</li>
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* AI Provider Section */}
            <section>
              <h3 className="text-lg font-medium text-brand-text mb-4">
                AI Provider Configuration
              </h3>
              
              {/* Provider Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    AI Provider
                  </label>
                  <select
                    value={localSettings.selectedProvider}
                    onChange={(e) => {
                      handleSettingChange('selectedProvider', e.target.value)
                      // Reset model selection when provider changes
                      const newProvider = providers.find(p => p.id === e.target.value)
                      if (newProvider) {
                        handleSettingChange('selectedModel', newProvider.models[0]?.id || '')
                      }
                    }}
                    className="w-full p-3 border border-brand-divider  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                {currentProvider && (
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">
                      Model
                    </label>
                    <select
                      value={localSettings.selectedModel}
                      onChange={(e) => handleSettingChange('selectedModel', e.target.value)}
                      className="w-full p-3 border border-brand-divider  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent"
                    >
                      {currentProvider.models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.pricing}
                        </option>
                      ))}
                    </select>
                    {currentModel && (
                      <p className="text-sm text-brand-muted mt-1">
                        {currentModel.description}
                      </p>
                    )}
                  </div>
                )}

                {/* API Keys */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brand-text">
                    API Keys
                  </label>
                  {providers.map(provider => {
                    const validation = validateApiKey(localSettings.apiKeys[provider.id] || '', provider.id)
                    const isCurrentProvider = provider.id === localSettings.selectedProvider
                    return (
                      <div key={provider.id} className="relative">
                        <label className="block text-xs text-brand-muted mb-1">
                          {provider.name}
                          {isCurrentProvider && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              Current
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKeys[provider.id] ? 'text' : 'password'}
                            value={localSettings.apiKeys[provider.id] || ''}
                            onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                            placeholder={`Enter your ${provider.name} API key`}
                            className={`w-full p-3 pr-12 border  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent ${
                              isCurrentProvider && !validation.isValid 
                                ? 'border-red-300 dark:border-red-600' 
                                : 'border-brand-divider'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey(provider.id)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showApiKeys[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {isCurrentProvider && !validation.isValid && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {validation.message}
                          </p>
                        )}
                        {isCurrentProvider && validation.isValid && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ {validation.message}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Model Parameters */}
            <section>
              <h3 className="text-lg font-medium text-brand-text mb-4">
                Model Parameters
              </h3>
              
              <div className="bg-brand-surface  p-4 mb-4">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Current Configuration
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-200">
                  {usesEffortControl
                    ? `${currentEffort?.name ?? 'High'} Reasoning \u2014 ${currentEffort?.summary ?? ''}`
                    : parameterDescription}
                </div>
              </div>

              {usesEffortControl ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-brand-text">
                    Reasoning Effort
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {AI_EFFORT_LEVELS.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => handleSettingChange('effort', level.id)}
                        className={`px-2 py-2 text-xs  border transition-colors ${
                          localSettings.effort === level.id
                            ? 'bg-brand-accent text-white border-blue-600'
                            : 'bg-brand-bg text-brand-text border-brand-divider hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {level.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-brand-muted">
                    {currentEffort?.summary}
                  </p>
                  <p className="text-xs text-brand-muted">
                    This model sets reasoning depth instead of temperature and top-p.
                  </p>
                </div>
              ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Temperature: {localSettings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={localSettings.temperature}
                    onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                    className="w-full h-2 bg-brand-surface  appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-brand-muted mt-1">
                    <span>Focused (0.0)</span>
                    <span>Creative (2.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">
                    Top-p: {localSettings.topP}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={localSettings.topP}
                    onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))}
                    className="w-full h-2 bg-brand-surface  appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-brand-muted mt-1">
                    <span>Precise (0.1)</span>
                    <span>Diverse (1.0)</span>
                  </div>
                </div>
              </div>
              )}
            </section>

            {/* 3D Library Selection */}
            <section>
              <h3 className="text-lg font-medium text-brand-text mb-4">
                3D Library
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Selected Library
                </label>
                <select
                  value={localSettings.selectedLibrary}
                  onChange={(e) => handleSettingChange('selectedLibrary', e.target.value)}
                  className="w-full p-3 border border-brand-divider  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  {libraries.map(library => (
                    <option key={library.id} value={library.id}>
                      {library.name} v{library.version}
                    </option>
                  ))}
                </select>
                {currentLibrary && (
                  <p className="text-sm text-brand-muted mt-2">
                    {currentLibrary.description}
                  </p>
                )}
              </div>
            </section>

            {/* Appearance */}
            <section>
              <h3 className="text-lg font-medium text-brand-text mb-4">
                Appearance
              </h3>

              <div className="mb-5">
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Theme
                </label>
                <div className="flex gap-2">
                  {(['system', 'light', 'dark'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSettingChange('theme', option)}
                      className={`flex-1 px-3 py-2 text-sm capitalize border  transition-colors ${
                        localSettings.theme === option
                          ? 'border-transparent text-white'
                          : 'border-brand-divider text-brand-text hover:bg-brand-surface'
                      }`}
                      style={
                        localSettings.theme === option
                          ? { backgroundColor: 'var(--brand-accent)' }
                          : undefined
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-muted mt-1">
                  System follows your operating system setting.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Custom CSS (Optional)
                </label>
                <textarea
                  value={localSettings.customCss}
                  onChange={(e) => handleSettingChange('customCss', e.target.value)}
                  placeholder={':root {\n  --brand-accent: #2050e0;\n}'}
                  rows={6}
                  spellCheck={false}
                  className="w-full p-3 font-mono text-xs border border-brand-divider  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent resize-y"
                />
                <p className="text-xs text-brand-muted mt-1">
                  Applied last, so it overrides the brand theme. Override the
                  tokens rather than individual rules where you can:{' '}
                  <code className="font-mono">--brand-accent</code>,{' '}
                  <code className="font-mono">--brand-bg</code>,{' '}
                  <code className="font-mono">--brand-surface</code>,{' '}
                  <code className="font-mono">--brand-text</code>.
                </p>
              </div>
            </section>

            {/* System Prompt */}
            <section>
              <h3 className="text-lg font-medium text-brand-text mb-4">
                System Prompt
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={localSettings.systemPrompt}
                  onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                  placeholder="Add custom instructions for the AI assistant..."
                  rows={4}
                  className="w-full p-3 border border-brand-divider  bg-brand-bg text-brand-text focus:outline-none focus:border-brand-accent resize-none"
                />
                <p className="text-xs text-brand-muted mt-1">
                  This will be added to the library-specific system prompt.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-brand-divider bg-brand-surface flex-shrink-0">
          <div className="text-sm text-brand-muted">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </div>
          
          <div className="flex space-x-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 text-brand-text hover:bg-brand-surface transition-colors"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}