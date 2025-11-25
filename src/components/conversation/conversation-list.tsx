'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Download } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { ConversationListItem } from './conversation-list-item'
import { dbService } from '@/lib/db-service'
import { toast } from 'react-hot-toast'

export function ConversationList() {
  const [searchQuery, setSearchQuery] = useState('')

  const conversations = useAppStore((state) => state.conversations)
  const currentConversationId = useAppStore((state) => state.currentConversationId)

  const loadConversation = useAppStore((state) => state.loadConversation)
  const deleteConversation = useAppStore((state) => state.deleteConversation)
  const updateConversationTitle = useAppStore((state) => state.updateConversationTitle)
  const createConversation = useAppStore((state) => state.createConversation)
  const loadConversations = useAppStore((state) => state.loadConversations)

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.preview?.toLowerCase().includes(query) ||
        conv.library.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  const handleCreateNew = () => {
    const id = createConversation('New Conversation')
    toast.success('New conversation created')
  }

  const handleExport = () => {
    try {
      dbService.exportDatabase()
      toast.success('Database exported successfully')
    } catch (error) {
      toast.error('Failed to export database')
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
              title="Export database"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={handleCreateNew}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{conversations.length} total</span>
          {searchQuery && (
            <>
              <span>•</span>
              <span>{filteredConversations.length} matching</span>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateNew}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Create your first conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              onLoad={loadConversation}
              onDelete={deleteConversation}
              onRename={updateConversationTitle}
            />
          ))
        )}
      </div>
    </div>
  )
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  )
}
