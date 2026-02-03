/**
 * Build Service for npm Package Support
 *
 * Enables npm package installation for all 3D frameworks using Sandpack's bundler.
 * Supports Babylon.js, Three.js, A-Frame, React Three Fiber, and Reactylon.
 */

export interface BuildOptions {
  code: string
  framework: 'babylonjs' | 'threejs' | 'react-three-fiber' | 'aframe' | 'reactylon'
  packages?: string[]  // Additional npm packages to install
  useNpmPackages?: boolean  // If true, use npm packages instead of CDN
}

export interface BuildResult {
  files: Record<string, { code: string }>
  dependencies: Record<string, string>
  success: boolean
  error?: string
}

export class BuildService {
  private static instance: BuildService

  public static getInstance(): BuildService {
    if (!BuildService.instance) {
      BuildService.instance = new BuildService()
    }
    return BuildService.instance
  }

  /**
   * Get default package versions for common libraries
   */
  private getDefaultVersions(): Record<string, string> {
    return {
      // Babylon.js
      '@babylonjs/core': '^7.31.0',
      '@babylonjs/loaders': '^7.31.0',
      '@babylonjs/materials': '^7.31.0',
      '@babylonjs/gui': '^7.31.0',
      '@babylonjs/serializers': '^7.31.0',

      // Three.js
      'three': '^0.171.0',
      '@react-three/fiber': '^8.17.10',
      '@react-three/drei': '^9.114.3',

      // Physics engines
      'cannon-es': '^0.20.0',
      'ammo.js': '^0.0.10',

      // Animation
      'gsap': '^3.12.5',

      // A-Frame
      'aframe': '^1.7.0',

      // Reactylon
      'reactylon': '^3.2.1',

      // React
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-reconciler': '^0.29.0'
    }
  }

  /**
   * Build Babylon.js scene with npm packages
   */
  public buildBabylonJS(options: BuildOptions): BuildResult {
    const { code, packages = [], useNpmPackages = false } = options

    if (!useNpmPackages) {
      // Return CDN-based version (current behavior)
      return {
        files: {
          '/index.js': { code }
        },
        dependencies: {},
        success: true
      }
    }

    try {
      // Convert Babylon.js code to use ES6 imports
      const convertedCode = this.convertBabylonJSToModules(code)

      // Get dependencies
      const defaultVersions = this.getDefaultVersions()
      const dependencies: Record<string, string> = {
        '@babylonjs/core': defaultVersions['@babylonjs/core']
      }

      // Add requested packages
      packages.forEach(pkg => {
        if (defaultVersions[pkg]) {
          dependencies[pkg] = defaultVersions[pkg]
        } else {
          dependencies[pkg] = 'latest'
        }
      })

      // Generate files for Sandpack
      const files = {
        '/package.json': {
          code: JSON.stringify({
            name: 'babylonjs-scene',
            version: '1.0.0',
            main: 'index.js',
            dependencies
          }, null, 2)
        },
        '/index.html': {
          code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Babylon.js Scene</title>
  <style>
    body { margin: 0; overflow: hidden; }
    #renderCanvas { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="renderCanvas"></canvas>
  <script src="./index.js"></script>
</body>
</html>`
        },
        '/index.js': {
          code: convertedCode
        }
      }

      return { files, dependencies, success: true }
    } catch (error) {
      return {
        files: {},
        dependencies: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Build Three.js scene with npm packages
   */
  public buildThreeJS(options: BuildOptions): BuildResult {
    const { code, packages = [], useNpmPackages = false } = options

    if (!useNpmPackages) {
      // Return CDN-based version (current behavior)
      return {
        files: {
          '/index.js': { code }
        },
        dependencies: {},
        success: true
      }
    }

    try {
      // Convert Three.js code to use ES6 imports
      const convertedCode = this.convertThreeJSToModules(code)

      // Get dependencies
      const defaultVersions = this.getDefaultVersions()
      const dependencies: Record<string, string> = {
        'three': defaultVersions['three']
      }

      // Add requested packages
      packages.forEach(pkg => {
        if (defaultVersions[pkg]) {
          dependencies[pkg] = defaultVersions[pkg]
        } else {
          dependencies[pkg] = 'latest'
        }
      })

      // Generate files for Sandpack
      const files = {
        '/package.json': {
          code: JSON.stringify({
            name: 'threejs-scene',
            version: '1.0.0',
            main: 'index.js',
            dependencies
          }, null, 2)
        },
        '/index.html': {
          code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Three.js Scene</title>
  <style>
    body { margin: 0; overflow: hidden; }
  </style>
</head>
<body>
  <script src="./index.js"></script>
</body>
</html>`
        },
        '/index.js': {
          code: convertedCode
        }
      }

      return { files, dependencies, success: true }
    } catch (error) {
      return {
        files: {},
        dependencies: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Convert Babylon.js global namespace code to ES6 modules
   */
  private convertBabylonJSToModules(code: string): string {
    // Check if code already uses imports
    if (code.includes('import') && code.includes('from')) {
      return code
    }

    // Add common Babylon.js imports at the top
    const imports = `import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

// Make BABYLON global for compatibility
window.BABYLON = BABYLON;

`

    return imports + code
  }

  /**
   * Convert Three.js global namespace code to ES6 modules
   */
  private convertThreeJSToModules(code: string): string {
    // Check if code already uses imports
    if (code.includes('import') && code.includes('from')) {
      return code
    }

    // Add common Three.js imports at the top
    const imports = `import * as THREE from 'three';

// Make THREE global for compatibility
window.THREE = THREE;

`

    return imports + code
  }

  /**
   * Parse installed packages from code
   */
  public parseRequiredPackages(code: string, framework: string): string[] {
    const packages = new Set<string>()

    // Parse import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    let match

    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1]

      // Skip relative imports
      if (pkg.startsWith('.') || pkg.startsWith('/')) continue

      // Extract package name (handle scoped packages)
      const pkgName = pkg.startsWith('@')
        ? pkg.split('/').slice(0, 2).join('/')
        : pkg.split('/')[0]

      packages.add(pkgName)
    }

    // Parse require statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    while ((match = requireRegex.exec(code)) !== null) {
      const pkg = match[1]

      // Skip relative imports
      if (pkg.startsWith('.') || pkg.startsWith('/')) continue

      // Extract package name
      const pkgName = pkg.startsWith('@')
        ? pkg.split('/').slice(0, 2).join('/')
        : pkg.split('/')[0]

      packages.add(pkgName)
    }

    return Array.from(packages)
  }

  /**
   * Check if a package is available in default versions
   */
  public isPackageSupported(packageName: string): boolean {
    const defaultVersions = this.getDefaultVersions()
    return packageName in defaultVersions
  }

  /**
   * Get package version
   */
  public getPackageVersion(packageName: string): string {
    const defaultVersions = this.getDefaultVersions()
    return defaultVersions[packageName] || 'latest'
  }

  /**
   * Generate package list for UI
   */
  public getCommonPackages(framework: string): Array<{ name: string; description: string }> {
    switch (framework) {
      case 'babylonjs':
        return [
          { name: '@babylonjs/core', description: 'Core Babylon.js engine' },
          { name: '@babylonjs/loaders', description: 'Model loaders (glTF, OBJ, etc.)' },
          { name: '@babylonjs/materials', description: 'Advanced materials library' },
          { name: '@babylonjs/gui', description: '2D/3D GUI system' },
          { name: 'cannon-es', description: 'Physics engine' },
          { name: 'gsap', description: 'Animation library' }
        ]

      case 'threejs':
        return [
          { name: 'three', description: 'Three.js core library' },
          { name: 'cannon-es', description: 'Physics engine' },
          { name: 'gsap', description: 'Animation library' }
        ]

      case 'react-three-fiber':
        return [
          { name: '@react-three/fiber', description: 'React renderer for Three.js' },
          { name: '@react-three/drei', description: 'Useful helpers and abstractions' },
          { name: 'three', description: 'Three.js core library' },
          { name: '@react-three/postprocessing', description: 'Post-processing effects' },
          { name: 'cannon-es', description: 'Physics engine' }
        ]

      case 'reactylon':
        return [
          { name: 'reactylon', description: 'React renderer for Babylon.js' },
          { name: '@babylonjs/core', description: 'Babylon.js core engine' },
          { name: '@babylonjs/loaders', description: 'Model loaders' },
          { name: '@babylonjs/materials', description: 'Advanced materials' }
        ]

      default:
        return []
    }
  }
}

// Export singleton instance
export const buildService = BuildService.getInstance()
