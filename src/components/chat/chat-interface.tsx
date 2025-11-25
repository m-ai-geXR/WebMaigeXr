'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Code, Copy, Download, ChevronDown, Sparkles, BookOpen } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { AIService } from '@/lib/ai-service'
import { extractCodeFromMessage, copyToClipboard, downloadTextFile } from '@/lib/utils'
import { ChatMessage } from './chat-message'
import { ExamplesModal } from '../examples/examples-modal'
import toast from 'react-hot-toast'

export function ChatInterface() {
  const {
    messages,
    addMessage,
    isLoading,
    setLoading,
    settings,
    libraries,
    providers,
    getCurrentLibrary,
    getCurrentProvider,
    getCurrentModel,
    setCurrentCode,
    setCurrentView,
    updateSettings
  } = useAppStore()

  const [input, setInput] = useState('')
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const aiService = AIService.getInstance()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setShowLibraryDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    if (showLibraryDropdown || showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLibraryDropdown, showModelDropdown])

  const handleLibraryChange = (libraryId: string) => {
    updateSettings({ selectedLibrary: libraryId })
    setShowLibraryDropdown(false)
    toast.success(`Switched to ${libraries.find(l => l.id === libraryId)?.name}`)
  }

  const handleModelChange = (providerId: string, modelId: string) => {
    updateSettings({
      selectedProvider: providerId,
      selectedModel: modelId
    })
    setShowModelDropdown(false)
    const provider = providers.find(p => p.id === providerId)
    const model = provider?.models.find(m => m.id === modelId)
    toast.success(`Switched to ${model?.name}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message
    addMessage({
      role: 'user',
      content: userMessage
    })

    const provider = getCurrentProvider()
    const model = getCurrentModel()
    const library = getCurrentLibrary()

    if (!provider || !model) {
      toast.error('Please configure AI provider and model in settings')
      return
    }

    const apiKey = settings.apiKeys[provider.id]
    if (!apiKey || apiKey.trim() === '') {
      toast.error(`Please set your ${provider.name} API key in settings`)
      return
    }

    setLoading(true)

    try {
      // Build enhanced prompt with library context
      let enhancedPrompt = userMessage
      
      if (library) {
        enhancedPrompt = `${library.systemPrompt}\n\nUser request: ${userMessage}`
        
        // Add library context
        enhancedPrompt += `\n\nLibrary: ${library.name} v${library.version}`
        enhancedPrompt += `\nDescription: ${library.description}`
        
        // Add code template if generating new code
        if (userMessage.toLowerCase().includes('create') || userMessage.toLowerCase().includes('make') || userMessage.toLowerCase().includes('generate')) {
          enhancedPrompt += `\n\nUse this as a starting template:\n\`\`\`javascript\n${library.codeTemplate}\n\`\`\``
        }
      }

      // Add placeholder for streaming response
      const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      addMessage({
        role: 'assistant',
        content: '',
        library: library?.id,
        hasCode: false
      })

      let streamedContent = ''
      
      await aiService.generateStreamingResponse(enhancedPrompt, {
        provider: provider.id,
        model: model.id,
        apiKey,
        temperature: settings.temperature,
        topP: settings.topP,
        systemPrompt: settings.systemPrompt
      }, (chunk) => {
        if (!chunk.done) {
          streamedContent += chunk.content
          
          // Update the last message with streamed content
          const updatedMessages = [...useAppStore.getState().messages]
          const lastMessageIndex = updatedMessages.length - 1
          if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: streamedContent,
              hasCode: extractCodeFromMessage(streamedContent) !== null
            }
            useAppStore.setState({ messages: updatedMessages })
          }
        }
      })

      // Final update
      const hasCode = extractCodeFromMessage(streamedContent) !== null

      // Auto-extract and set code if found
      if (hasCode) {
        const extractedCode = extractCodeFromMessage(streamedContent)
        if (extractedCode) {
          setCurrentCode(extractedCode)
          toast.success('Code extracted and ready to run!')
        }
      }

    } catch (error) {
      console.error('AI API Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease check your API key and try again.`
      })
      
      toast.error(`AI Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleCodeExtract = (content: string) => {
    const code = extractCodeFromMessage(content)
    if (code) {
      setCurrentCode(code)
      setCurrentView('playground')
      toast.success('Code sent to playground!')
    } else {
      toast.error('No code found in this message')
    }
  }

  const handleCopyMessage = async (content: string) => {
    const success = await copyToClipboard(content)
    if (success) {
      toast.success('Message copied to clipboard')
    } else {
      toast.error('Failed to copy message')
    }
  }

  const handleDownloadCode = (content: string) => {
    const code = extractCodeFromMessage(content)
    if (code) {
      const library = getCurrentLibrary()
      const extension = library?.id === 'react-three-fiber' ? 'jsx' : 'js'
      downloadTextFile(code, `scene.${extension}`)
      toast.success('Code downloaded!')
    } else {
      toast.error('No code found to download')
    }
  }

  const currentLibrary = getCurrentLibrary()
  const currentModel = getCurrentModel()
  const currentProvider = getCurrentProvider()

  return (
    <div className="flex flex-col h-full">
      {/* Header with dropdowns */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          {/* Library Dropdown */}
          <div className="relative" ref={libraryDropdownRef}>
            <button
              onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <Code size={16} />
              <span>{currentLibrary?.name || 'Select Library'}</span>
              <ChevronDown size={14} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLibraryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="py-1">
                  {libraries.map((library) => (
                    <button
                      key={library.id}
                      onClick={() => handleLibraryChange(library.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        currentLibrary?.id === library.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {library.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        v{library.version} • {library.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 hover:from-purple-200 hover:to-blue-200 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <Sparkles size={16} />
              <span>{currentModel?.name || 'Select Model'}</span>
              <ChevronDown size={14} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showModelDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="py-1">
                  {providers.map((provider) => (
                    <div key={provider.id}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {provider.name}
                      </div>
                      {provider.models.map((model) => (
                        <button
                          key={`${provider.id}-${model.id}`}
                          onClick={() => handleModelChange(provider.id, model.id)}
                          disabled={!settings.apiKeys[provider.id]}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            currentProvider?.id === provider.id && currentModel?.id === model.id
                              ? 'bg-purple-50 dark:bg-purple-900/20'
                              : ''
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {model.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {model.description}
                            {!settings.apiKeys[provider.id] && ' • API key required'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExamples(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-200 hover:to-emerald-200 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <BookOpen size={14} />
            <span>Examples</span>
          </button>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Temp: {settings.temperature} • Top-p: {settings.topP}
          </div>
        </div>
      </div>

      {/* Examples Modal */}
      <ExamplesModal isOpen={showExamples} onClose={() => setShowExamples(false)} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">XR</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to XRAiAssistant Station
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Start creating amazing 3D experiences with AI assistance. 
              Ask me to create scenes, explain concepts, or help with debugging.
            </p>
            
            {currentLibrary && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Current Library: {currentLibrary.name} v{currentLibrary.version}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  {currentLibrary.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onExtractCode={() => handleCodeExtract(message.content)}
                onCopy={() => handleCopyMessage(message.content)}
                onDownload={() => handleDownloadCode(message.content)}
              />
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">
                  {currentModel?.name} is thinking...
                </span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask me to create a 3D scene with ${currentLibrary?.name || '3D library'}...`}
              className="w-full p-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={Math.min(Math.max(input.split('\n').length, 1), 4)}
              disabled={isLoading}
            />
            
            {currentLibrary && (
              <div className="absolute bottom-3 right-3">
                <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {currentLibrary.name}
                </div>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        
        {currentModel && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Using {currentModel.name} • Temperature: {settings.temperature} • Top-p: {settings.topP}
          </div>
        )}
      </div>
    </div>
  )
}