'use client'

import { MessageSquare, Trash2, Edit2 } from 'lucide-react'
import type { Conversation } from '@/lib/db-service'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
}

export function ConversationListItem({
  conversation,
  isActive,
  onLoad,
  onDelete,
  onRename
}: ConversationListItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(conversation.title)

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle !== conversation.title) {
      onRename(conversation.id, editedTitle.trim())
      toast.success('Conversation renamed')
    }
    setIsEditing(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete "${conversation.title}"?`)) {
      onDelete(conversation.id)
      toast.success('Conversation deleted')
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={`
        group relative p-4 rounded-lg border cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${isActive
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:border-primary/50'
        }
      `}
      onClick={() => !isEditing && onLoad(conversation.id)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <MessageSquare
            className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setEditedTitle(conversation.title)
                  setIsEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-sm font-medium bg-background border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <h3 className="text-sm font-medium truncate">{conversation.title}</h3>
          )}

          {conversation.preview && !isEditing && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {conversation.preview}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{formatDate(conversation.updatedAt)}</span>
            <span>•</span>
            <span>{conversation.messageCount} messages</span>
            <span>•</span>
            <span className="capitalize">{conversation.library}</span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-primary/10 transition-colors"
            title="Rename conversation"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
            title="Delete conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
