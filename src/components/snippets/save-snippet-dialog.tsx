'use client'

import { useState } from 'react'
import { X, Save, Tag } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import toast from 'react-hot-toast'

interface SaveSnippetDialogProps {
  code: string
  currentLibrary: string
  onClose: () => void
  onSave: () => void
}

const categories = [
  'Geometry',
  'Materials',
  'Animation',
  'Lighting',
  'Physics',
  'Interaction',
  'Camera',
  'Effects',
  'Optimization',
  'Utilities',
  'Other'
]

export function SaveSnippetDialog({ code, currentLibrary, onClose, onSave }: SaveSnippetDialogProps) {
  const { addSnippet } = useAppStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [library, setLibrary] = useState(currentLibrary)
  const [category, setCategory] = useState('Other')
  const [tags, setTags] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const libraries = ['babylonjs', 'threejs', 'react-three-fiber', 'aframe', 'reactylon']

  const handleSave = async () => {
    const newErrors: string[] = []

    // Validate inputs
    if (!title.trim()) {
      newErrors.push('Title is required')
    }

    if (!code.trim()) {
      newErrors.push('Code cannot be empty')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    setErrors([])

    try {
      addSnippet({
        title: title.trim(),
        description: description.trim(),
        code,
        library,
        category,
        tags: tags.trim()
      })

      toast.success('Snippet saved successfully!')
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save snippet:', error)
      toast.error('Failed to save snippet')
      setErrors(['Failed to save snippet. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }

  const codeLines = code.split('\n').length
  const codeChars = code.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Save Code Snippet
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {codeLines} lines, {codeChars} characters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors([])
              }}
              placeholder="e.g., Rotating Cube with Lighting"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this snippet does..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Library and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Library
              </label>
              <select
                value={library}
                onChange={(e) => setLibrary(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {libraries.map(lib => (
                  <option key={lib} value={lib}>
                    {lib}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., cube, rotation, lighting, beginner"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tags help you find snippets faster
            </p>
          </div>

          {/* Code Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Code Preview
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono overflow-x-auto">
                {code}
              </pre>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-700 dark:text-red-300">
                {errors.map((error, idx) => (
                  <p key={idx}>• {error}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !code.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Snippet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
