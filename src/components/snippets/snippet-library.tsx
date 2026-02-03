'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Filter, Grid, List, X } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { SnippetCard } from './snippet-card'
import { SnippetListItem } from './snippet-list-item'
import { SaveSnippetDialog } from './save-snippet-dialog'
import type { CodeSnippet } from '@/lib/db-service'

interface SnippetLibraryProps {
  onClose: () => void
  onLoadSnippet?: (snippet: CodeSnippet) => void
}

export function SnippetLibrary({ onClose, onLoadSnippet }: SnippetLibraryProps) {
  const { snippets, loadSnippets, deleteSnippet, searchSnippets, loadSnippetToEditor, settings, currentCode } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLibrary, setSelectedLibrary] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load snippets on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (selectedLibrary === 'all') {
          loadSnippets()
        } else {
          loadSnippets(selectedLibrary)
        }
      } catch (error) {
        console.error('Failed to load snippets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedLibrary, loadSnippets])

  // Filter and search snippets
  const filteredSnippets = useMemo(() => {
    let results = searchQuery ? searchSnippets(searchQuery) : snippets

    // Filter by library
    if (selectedLibrary !== 'all') {
      results = results.filter(s => s.library === selectedLibrary)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      results = results.filter(s => s.category === selectedCategory)
    }

    // Sort by updated date (newest first)
    return results.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [snippets, searchQuery, selectedLibrary, selectedCategory, searchSnippets])

  // Get unique categories from all snippets
  const categories = useMemo(() => {
    const cats = new Set<string>()
    snippets.forEach(s => {
      if (s.category) cats.add(s.category)
    })
    return Array.from(cats).sort()
  }, [snippets])

  // Get available libraries
  const libraries = ['all', 'babylonjs', 'threejs', 'react-three-fiber', 'aframe', 'reactylon']

  const handleLoadSnippet = (snippet: CodeSnippet) => {
    if (onLoadSnippet) {
      onLoadSnippet(snippet)
    } else {
      loadSnippetToEditor(snippet.id)
    }
    onClose()
  }

  const handleDeleteSnippet = (id: string) => {
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      deleteSnippet(id)
    }
  }

  return (
    <>
      <div className="h-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-7xl h-full overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Code Snippets Library
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>Save Current Code</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search snippets by title, description, or tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              {/* Library Filter */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Library
                </label>
                <select
                  value={selectedLibrary}
                  onChange={(e) => setSelectedLibrary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {libraries.map(lib => (
                    <option key={lib} value={lib}>
                      {lib === 'all' ? 'All Libraries' : lib}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  View
                </label>
                <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 shadow'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 shadow'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Snippets Display */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading snippets...</p>
                </div>
              </div>
            ) : filteredSnippets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No snippets found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery || selectedLibrary !== 'all' || selectedCategory !== 'all'
                      ? 'Try adjusting your filters or search query'
                      : 'Save your first code snippet to get started'}
                  </p>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Current Code
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSnippets.map(snippet => (
                  <SnippetCard
                    key={snippet.id}
                    snippet={snippet}
                    onLoad={handleLoadSnippet}
                    onDelete={handleDeleteSnippet}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSnippets.map(snippet => (
                  <SnippetListItem
                    key={snippet.id}
                    snippet={snippet}
                    onLoad={handleLoadSnippet}
                    onDelete={handleDeleteSnippet}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Snippet Dialog */}
      {showSaveDialog && (
        <SaveSnippetDialog
          code={currentCode}
          currentLibrary={settings.selectedLibrary}
          onClose={() => setShowSaveDialog(false)}
          onSave={() => {
            setShowSaveDialog(false)
            // Reload snippets
            if (selectedLibrary === 'all') {
              loadSnippets()
            } else {
              loadSnippets(selectedLibrary)
            }
          }}
        />
      )}
    </>
  )
}
