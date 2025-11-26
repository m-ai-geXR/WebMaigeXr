'use client'

import { useState, useMemo } from 'react'
import { Package, Plus, X, Search, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { buildService } from '@/lib/build-service'
import toast from 'react-hot-toast'

interface PackageManagerProps {
  framework: string
  installedPackages: string[]
  onInstallPackage: (packageName: string) => void
  onUninstallPackage: (packageName: string) => void
  onClose: () => void
  useNpmPackages: boolean
  onToggleNpmPackages: (enabled: boolean) => void
}

export function PackageManager({
  framework,
  installedPackages,
  onInstallPackage,
  onUninstallPackage,
  onClose,
  useNpmPackages,
  onToggleNpmPackages
}: PackageManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customPackage, setCustomPackage] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)

  // Get common packages for this framework
  const commonPackages = useMemo(() => {
    return buildService.getCommonPackages(framework)
  }, [framework])

  // Filter packages by search
  const filteredPackages = useMemo(() => {
    if (!searchQuery) return commonPackages

    const query = searchQuery.toLowerCase()
    return commonPackages.filter(
      pkg => pkg.name.toLowerCase().includes(query) || pkg.description.toLowerCase().includes(query)
    )
  }, [commonPackages, searchQuery])

  const handleInstall = (packageName: string) => {
    if (installedPackages.includes(packageName)) {
      toast('Package already installed', { icon: '📦' })
      return
    }

    onInstallPackage(packageName)
    toast.success(`Installing ${packageName}...`)
  }

  const handleUninstall = (packageName: string) => {
    onUninstallPackage(packageName)
    toast.success(`Uninstalled ${packageName}`)
  }

  const handleAddCustom = () => {
    if (!customPackage.trim()) {
      toast.error('Please enter a package name')
      return
    }

    if (installedPackages.includes(customPackage)) {
      toast('Package already installed', { icon: '📦' })
      return
    }

    onInstallPackage(customPackage.trim())
    setCustomPackage('')
    setShowAddCustom(false)
    toast.success(`Installing ${customPackage}...`)
  }

  const handleToggleMode = (enabled: boolean) => {
    onToggleNpmPackages(enabled)

    if (enabled) {
      toast.success('npm packages enabled! Build system active.')
    } else {
      toast('Switched to CDN mode. Faster but no npm packages.', { icon: '⚡' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Package className="mr-2" size={24} />
              Package Manager
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Install npm packages for {framework}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* npm Mode Toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Build System Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {useNpmPackages
                  ? 'Using npm packages with bundler (slower but full ecosystem)'
                  : 'Using CDN imports (faster but limited packages)'}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useNpmPackages}
                onChange={(e) => handleToggleMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {useNpmPackages ? 'npm' : 'CDN'}
              </span>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Installed Packages */}
          {installedPackages.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-500" />
                Installed ({installedPackages.length})
              </h3>
              <div className="space-y-2">
                {installedPackages.map(pkg => (
                  <div
                    key={pkg}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Package size={16} className="text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {pkg}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {buildService.getPackageVersion(pkg)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUninstall(pkg)}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Uninstall"
                    >
                      <X size={16} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Available Packages */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Available Packages
            </h3>
            {filteredPackages.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                {searchQuery ? 'No packages found' : 'No common packages available'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPackages.map(pkg => {
                  const isInstalled = installedPackages.includes(pkg.name)

                  return (
                    <div
                      key={pkg.name}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        isInstalled
                          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {pkg.name}
                          </p>
                          {isInstalled && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                              Installed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {pkg.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleInstall(pkg.name)}
                        disabled={isInstalled || !useNpmPackages}
                        className="ml-4 flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download size={14} />
                        <span>Install</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add Custom Package */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {showAddCustom ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customPackage}
                    onChange={(e) => setCustomPackage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                    placeholder="package-name@version"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleAddCustom}
                    disabled={!useNpmPackages}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCustom(false)
                      setCustomPackage('')
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter any npm package name. Optionally specify version: package@1.2.3
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                disabled={!useNpmPackages}
                className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Add Custom Package</span>
              </button>
            )}
          </div>

          {/* Info */}
          {!useNpmPackages && (
            <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Enable npm mode to install packages. CDN mode only supports built-in libraries.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {installedPackages.length} package{installedPackages.length !== 1 ? 's' : ''} installed
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
