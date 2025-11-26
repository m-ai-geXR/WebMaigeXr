'use client'

import { Play, Trash2, Copy, Tag, Calendar, Share2, Code2 } from 'lucide-react'
import type { CodeSnippet } from '@/lib/db-service'
import toast from 'react-hot-toast'
import { copyToClipboard } from '@/lib/utils'

interface SnippetListItemProps {
  snippet: CodeSnippet
  onLoad: (snippet: CodeSnippet) => void
  onDelete: (id: string) => void
}

export function SnippetListItem({ snippet, onLoad, onDelete }: SnippetListItemProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
  const codeLines = snippet.code.split('\n').length

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onLoad(snippet)}
    >
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Code2 size={20} className="text-blue-600 dark:text-blue-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {snippet.title}
              </h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getLibraryColor(snippet.library)}`}>
                {snippet.library}
              </span>
              {snippet.category && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex-shrink-0">
                  {snippet.category}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="truncate max-w-md">{snippet.description || 'No description'}</span>
              <span className="flex items-center flex-shrink-0">
                <Calendar size={14} className="mr-1" />
                {formatDate(snippet.updatedAt)}
              </span>
              <span className="flex-shrink-0">{codeLines} lines</span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-1 mt-2">
                <Tag size={12} className="text-gray-400" />
                {tags.slice(0, 5).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {tags.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{tags.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Copy code"
          >
            <Copy size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Share snippet"
          >
            <Share2 size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(snippet.id)
            }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
            title="Delete snippet"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onLoad(snippet)
            }}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play size={16} />
            <span>Load</span>
          </button>
        </div>
      </div>
    </div>
  )
}
