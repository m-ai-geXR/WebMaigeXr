/**
 * Updated App Store with SQLite Integration
 *
 * This replaces the old localStorage-only persistence with SQLite for better
 * performance and relational data support (conversations, messages, snippets).
 */

import { create } from 'zustand'
import { dbService, type Conversation, type Message as DBMessage, type AppSettings as DBSettings, type CodeSnippet } from '@/lib/db-service'
import { defaultLibraries, defaultProviders, defaultSettings } from './store-defaults'

export type ViewType = 'chat' | 'playground' | 'history' | 'snippets'

export interface Library3D {
  id: string
  name: string
  version: string
  description: string
  cdnUrls: string[]
  systemPrompt: string
  codeTemplate: string
}

export interface AIProvider {
  id: string
  name: string
  baseUrl: string
  models: Array<{
    id: string
    name: string
    description: string
    pricing: string
  }>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  library?: string
  hasCode?: boolean
}

export interface AppSettings {
  apiKeys: Record<string, string>
  selectedProvider: string
  selectedModel: string
  selectedLibrary: string
  temperature: number
  topP: number
  systemPrompt: string
  theme: 'light' | 'dark' | 'system'
}

interface AppState {
  // Initialization
  isInitialized: boolean
  initialize: () => Promise<void>

  // View state
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // Conversation state (NEW with SQLite)
  conversations: Conversation[]
  currentConversationId: string | null
  loadConversations: () => void
  createConversation: (title?: string) => string
  loadConversation: (id: string) => void
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  searchConversations: (query: string) => Conversation[]

  // Chat/Message state
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  deleteMessage: (id: string) => void
  editMessage: (id: string, newContent: string) => void
  regenerateMessage: (id: string) => Promise<void>

  // Code state
  currentCode: string
  setCurrentCode: (code: string) => void

  // Settings state
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // Library state
  libraries: Library3D[]
  setLibraries: (libraries: Library3D[]) => void
  getCurrentLibrary: () => Library3D | undefined

  // AI Provider state
  providers: AIProvider[]
  setProviders: (providers: AIProvider[]) => void
  getCurrentProvider: () => AIProvider | undefined
  getCurrentModel: () => AIProvider['models'][0] | undefined

  // Code Snippets state (NEW with SQLite)
  snippets: CodeSnippet[]
  loadSnippets: (library?: string) => void
  addSnippet: (snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>) => string
  deleteSnippet: (id: string) => void
  loadSnippetToEditor: (id: string) => void
  searchSnippets: (query: string) => CodeSnippet[]
}

export const useAppStore = create<AppState>((set, get) => ({
  // ==================== Initialization ====================

  isInitialized: false,

  initialize: async () => {
    try {
      // Initialize SQLite database
      await dbService.initialize()

      // Load settings from database and merge with defaults
      const dbSettings = dbService.getSettings()
      if (dbSettings) {
        // Merge database settings with defaults to ensure all fields are present
        const mergedSettings = { ...defaultSettings, ...dbSettings }
        set({ settings: mergedSettings })
      } else {
        // No settings in database, save defaults
        dbService.saveSettings(defaultSettings)
      }

      // Load conversations list
      const conversations = dbService.getConversations()
      set({ conversations })

      // If there's a current conversation, load its messages
      const { currentConversationId } = get()
      if (currentConversationId) {
        const messages = dbService.getMessages(currentConversationId)
        set({
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            library: m.library,
            hasCode: m.hasCode
          }))
        })
      }

      set({ isInitialized: true })
      console.log('✅ App store initialized with SQLite')
    } catch (error) {
      console.error('Failed to initialize app store:', error)
      // Fall back to defaults on error
      set({ isInitialized: true })
    }
  },

  // ==================== View State ====================

  currentView: 'chat',
  setCurrentView: (view) => set({ currentView: view }),

  // ==================== Conversation Management (NEW) ====================

  conversations: [],
  currentConversationId: null,

  loadConversations: () => {
    const conversations = dbService.getConversations()
    set({ conversations })
  },

  createConversation: (title) => {
    const { settings } = get()
    const id = dbService.createConversation({
      title: title || `New Conversation ${new Date().toLocaleString()}`,
      library: settings.selectedLibrary,
      preview: undefined
    })

    // Reload conversations list
    get().loadConversations()

    // Switch to new conversation
    set({
      currentConversationId: id,
      messages: []
    })

    return id
  },

  loadConversation: (id) => {
    const messages = dbService.getMessages(id)
    set({
      currentConversationId: id,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        library: m.library,
        hasCode: m.hasCode
      })),
      currentView: 'chat'
    })
  },

  deleteConversation: (id) => {
    dbService.deleteConversation(id)

    // Reload conversations
    get().loadConversations()

    // If deleting current conversation, create a new one
    if (get().currentConversationId === id) {
      get().createConversation()
    }
  },

  updateConversationTitle: (id, title) => {
    dbService.updateConversation(id, { title })
    get().loadConversations()
  },

  searchConversations: (query) => {
    return dbService.searchConversations(query)
  },

  // ==================== Chat/Message State ====================

  messages: [],
  isLoading: false,

  addMessage: (message) => {
    const { currentConversationId, settings } = get()

    // Create conversation if none exists
    let conversationId = currentConversationId
    if (!conversationId) {
      conversationId = get().createConversation()
    }

    const timestamp = Date.now()
    const hasCode = message.content.includes('```')

    // Add to database
    const id = dbService.addMessage({
      conversationId,
      role: message.role,
      content: message.content,
      timestamp,
      hasCode,
      library: message.library || settings.selectedLibrary
    })

    // Update local state
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: message.role,
          content: message.content,
          timestamp,
          library: message.library,
          hasCode
        }
      ]
    }))

    // Auto-generate title from first user message
    if (message.role === 'user' && get().messages.length <= 1) {
      const title = message.content.length > 50
        ? message.content.substring(0, 50) + '...'
        : message.content

      dbService.updateConversation(conversationId, { title })
      get().loadConversations()
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearMessages: () => {
    // Create new conversation instead of just clearing
    get().createConversation('New Conversation')
  },

  deleteMessage: (id) => {
    dbService.deleteMessage(id)
    set((state) => ({
      messages: state.messages.filter(m => m.id !== id)
    }))
  },

  editMessage: (id, newContent) => {
    dbService.updateMessage(id, newContent)
    set((state) => ({
      messages: state.messages.map(m =>
        m.id === id ? { ...m, content: newContent } : m
      )
    }))
  },

  regenerateMessage: async (id) => {
    // This will be implemented with AI integration
    // For now, just delete the message
    get().deleteMessage(id)
  },

  // ==================== Code State ====================

  currentCode: '',
  setCurrentCode: (code) => set({ currentCode: code }),

  // ==================== Settings State ====================

  settings: defaultSettings,

  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings }
      dbService.saveSettings(updated)
      return { settings: updated }
    })
  },

  // ==================== Library State ====================

  libraries: defaultLibraries,
  setLibraries: (libraries) => set({ libraries }),
  getCurrentLibrary: () => {
    const { libraries, settings } = get()
    return libraries.find(lib => lib.id === settings.selectedLibrary)
  },

  // ==================== AI Provider State ====================

  providers: defaultProviders,
  setProviders: (providers) => set({ providers }),
  getCurrentProvider: () => {
    const { providers, settings } = get()
    return providers.find(provider => provider.id === settings.selectedProvider)
  },
  getCurrentModel: () => {
    const { providers, settings } = get()
    const provider = providers.find(p => p.id === settings.selectedProvider)
    return provider?.models.find(m => m.id === settings.selectedModel)
  },

  // ==================== Code Snippets (NEW) ====================

  snippets: [],

  loadSnippets: (library) => {
    const snippets = dbService.getSnippets(library)
    set({ snippets })
  },

  addSnippet: (snippet) => {
    const id = dbService.addSnippet(snippet)
    get().loadSnippets()
    return id
  },

  deleteSnippet: (id) => {
    dbService.deleteSnippet(id)
    get().loadSnippets()
  },

  loadSnippetToEditor: (id) => {
    const { snippets } = get()
    const snippet = snippets.find(s => s.id === id)
    if (snippet) {
      set({
        currentCode: snippet.code,
        currentView: 'playground'
      })
    }
  },

  searchSnippets: (query) => {
    return dbService.searchSnippets(query)
  }
}))
