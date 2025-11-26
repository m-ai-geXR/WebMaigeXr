'use client'

import { useState } from 'react'
import { Play, Trash2, Copy, Tag, Calendar, Share2 } from 'lucide-react'
import type { CodeSnippet } from '@/lib/db-service'
import toast from 'react-hot-toast'
import { copyToClipboard } from '@/lib/utils'

interface SnippetCardProps {
  snippet: CodeSnippet
  onLoad: (snippet: CodeSnippet) => void
  onDelete: (id: string) => void
}

export function SnippetCard({ snippet, onLoad, onDelete }: SnippetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  const getLibraryColor = (library: string) => {
    const colors: Record<string, string> = {
      'babylonjs': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'threejs': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'react-three-fiber': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'aframe': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'reactylon': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    }
    return colors[library] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await copyToClipboard(snippet.code)
      toast.success('Code copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy code')
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Create a shareable link (could be enhanced with actual sharing service)
    const shareText = `Check out this ${snippet.library} snippet: ${snippet.title}\n\n${snippet.description}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: snippet.title,
          text: shareText
        })
        toast.success('Shared successfully!')
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      await copyToClipboard(shareText)
      toast.success('Share text copied to clipboard!')
    }
  }

  const tags = snippet.tags ? snippet.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onLoad(snippet)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
            {snippet.title}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLibraryColor(snippet.library)}`}>
              {snippet.library}
            </span>
            {snippet.category && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                {snippet.category}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons (show on hover) */}
        {isHovered && (
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy code"
            >
              <Copy size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Share snippet"
            >
              <Share2 size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(snippet.id)
              }}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
              title="Delete snippet"
            >
              <Trash2 size={14} className="text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
        {snippet.description || 'No description'}
      </p>

      {/* Code Preview */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2 mb-3 overflow-hidden">
        <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono line-clamp-3 overflow-hidden">
          {snippet.code}
        </pre>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center flex-wrap gap-1 mb-3">
          <Tag size={12} className="text-gray-400" />
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Calendar size={12} className="mr-1" />
          {formatDate(snippet.updatedAt)}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onLoad(snippet)
          }}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <Play size={14} />
          <span>Load</span>
        </button>
      </div>
    </div>
  )
}
