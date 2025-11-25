'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square, RotateCcw, Download, Upload, Maximize2, Minimize2, ChevronDown, Code as CodeIcon, BookOpen } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { CodeEditor } from './code-editor'
import { SceneRenderer } from './scene-renderer'
import { SandpackWebView } from './sandpack-webview'
import { downloadTextFile } from '@/lib/utils'
import { SandpackErrorBoundary } from './error-boundary'
import { ExamplesModal } from '../examples/examples-modal'
import toast from 'react-hot-toast'

export function PlaygroundView() {
  const { currentCode, setCurrentCode, getCurrentLibrary, libraries, updateSettings } = useAppStore()
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [splitView, setSplitView] = useState(true)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)
  
  const currentLibrary = getCurrentLibrary()
  
  // Determine if we should use Sandpack (React frameworks) or iframe (legacy frameworks)
  const useSandpack = currentLibrary?.id === 'react-three-fiber' || currentLibrary?.id === 'reactylon'
  const sandpackFramework: 'react-three-fiber' | 'reactylon' = currentLibrary?.id === 'reactylon' ? 'reactylon' : 'react-three-fiber'

  useEffect(() => {
    // Initialize with template if no code exists
    if (!currentCode && currentLibrary) {
      setCurrentCode(currentLibrary.codeTemplate)
    }
  }, [currentLibrary, currentCode, setCurrentCode])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setShowLibraryDropdown(false)
      }
    }

    if (showLibraryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLibraryDropdown])

  const handleLibraryChange = (libraryId: string) => {
    const newLibrary = libraries.find(l => l.id === libraryId)
    if (newLibrary) {
      updateSettings({ selectedLibrary: libraryId })
      setCurrentCode(newLibrary.codeTemplate)
      setShowLibraryDropdown(false)
      toast.success(`Switched to ${newLibrary.name}`)
    }
  }

  const handleRunCode = () => {
    if (!currentCode.trim()) {
      toast.error('No code to run')
      return
    }
    
    setIsRunning(true)
    toast.success('Running scene...')
    
    // Stop after a brief moment (in real implementation, this would be based on scene state)
    setTimeout(() => {
      setIsRunning(false)
    }, 1000)
  }

  const handleStopCode = () => {
    setIsRunning(false)
    toast.success('Scene stopped')
  }

  const handleResetCode = () => {
    if (currentLibrary) {
      setCurrentCode(currentLibrary.codeTemplate)
      toast.success('Code reset to template')
    }
  }

  const handleDownloadCode = () => {
    if (!currentCode.trim()) {
      toast.error('No code to download')
      return
    }
    
    const extension = (currentLibrary?.id === 'react-three-fiber' || currentLibrary?.id === 'reactylon') ? 'jsx' : 'js'
    downloadTextFile(currentCode, `scene.${extension}`)
    toast.success('Code downloaded!')
  }

  const handleUploadCode = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(js|jsx|ts|tsx)$/)) {
      toast.error('Please select a JavaScript or TypeScript file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCurrentCode(content)
      toast.success('Code uploaded successfully!')
    }
    reader.readAsText(file)
    
    // Reset input
    event.target.value = ''
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleSplitView = () => {
    setSplitView(!splitView)
  }

  if (!currentLibrary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No 3D Library Selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a 3D library in settings to start coding.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Library Dropdown */}
          <div className="relative mr-2" ref={libraryDropdownRef}>
            <button
              onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              <CodeIcon size={14} />
              <span>{currentLibrary.name}</span>
              <ChevronDown size={12} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
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
                        v{library.version}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {useSandpack && (
              <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded font-medium">
                Sandpack Live
              </span>
            )}
          </div>
          
          <button
            onClick={isRunning ? handleStopCode : handleRunCode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isRunning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isRunning ? <Square size={16} /> : <Play size={16} />}
            <span>{isRunning ? 'Stop' : 'Run'}</span>
          </button>
          
          <button
            onClick={handleResetCode}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowExamples(true)}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
          >
            <BookOpen size={16} />
            <span>Examples</span>
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

          <button
            onClick={handleUploadCode}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload size={16} />
            <span>Upload</span>
          </button>

          <button
            onClick={handleDownloadCode}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Download size={16} />
            <span>Download</span>
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
          
          <button
            onClick={toggleSplitView}
            className="px-2 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {splitView ? 'Scene Only' : 'Split View'}
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${splitView ? 'flex' : ''}`}>
        {/* Code Editor */}
        {(splitView || !isFullscreen) && (
          <div className={splitView ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'h-full'}>
            <CodeEditor
              value={currentCode}
              onChange={setCurrentCode}
              language={(currentLibrary.id === 'react-three-fiber' || currentLibrary.id === 'reactylon') ? 'jsx' : 'javascript'}
              library={currentLibrary}
            />
          </div>
        )}

        {/* Scene Renderer - Conditional based on framework type */}
        {(splitView || isFullscreen) && (
          <div className={splitView ? 'w-1/2' : 'h-full'}>
            {useSandpack ? (
              <SandpackErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('Playground Sandpack error:', error, errorInfo)
                  toast.error('React Three Fiber preview encountered an error. Check console for details.')
                }}
              >
                <SandpackWebView
                  initialCode={currentCode}
                  framework={sandpackFramework}
                  onCodeChange={setCurrentCode}
                  onSandboxCreated={(url) => {
                    console.log('Sandbox created:', url)
                    toast.success('Sandbox created! URL copied to clipboard.')
                  }}
                  showConsole={false}
                  showPreview={true}
                  autoReload={isRunning}
                />
              </SandpackErrorBoundary>
            ) : (
              <SceneRenderer
                code={currentCode}
                library={currentLibrary}
                isRunning={isRunning}
              />
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".js,.jsx,.ts,.tsx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Examples Modal */}
      <ExamplesModal isOpen={showExamples} onClose={() => setShowExamples(false)} />
    </div>
  )
}