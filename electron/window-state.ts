/**
 * Window State Manager
 *
 * Persists and restores window size, position, and maximized state
 * across application restarts.
 */

import { app, BrowserWindow, screen } from 'electron'
import fs from 'fs'
import path from 'path'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

export interface WindowStateOptions {
  defaultWidth: number
  defaultHeight: number
  minWidth?: number
  minHeight?: number
}

export class WindowStateManager {
  private state: WindowState
  private stateFilePath: string
  private options: WindowStateOptions
  private saveTimeout: NodeJS.Timeout | null = null

  constructor(options: WindowStateOptions) {
    this.options = options
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json')
    this.state = this.loadState()
  }

  /**
   * Load saved window state from disk
   */
  private loadState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8')
        const savedState = JSON.parse(data) as WindowState

        // Validate saved state
        if (this.isValidState(savedState)) {
          return savedState
        }
      }
    } catch (error) {
      console.error('Failed to load window state:', error)
    }

    // Return default state
    return {
      width: this.options.defaultWidth,
      height: this.options.defaultHeight,
      isMaximized: false
    }
  }

  /**
   * Validate that the saved state is still valid
   * (e.g., the saved position is still on a connected display)
   */
  private isValidState(state: WindowState): boolean {
    // Check dimensions
    if (state.width < (this.options.minWidth || 400) ||
        state.height < (this.options.minHeight || 300)) {
      return false
    }

    // If position is specified, check that it's on a valid display
    if (state.x !== undefined && state.y !== undefined) {
      const displays = screen.getAllDisplays()
      const isOnDisplay = displays.some(display => {
        const { x, y, width, height } = display.bounds
        return (
          state.x! >= x &&
          state.x! < x + width &&
          state.y! >= y &&
          state.y! < y + height
        )
      })

      if (!isOnDisplay) {
        // Position is off-screen, reset to center
        delete state.x
        delete state.y
      }
    }

    return true
  }

  /**
   * Save current window state to disk
   */
  private saveState(): void {
    try {
      const dir = path.dirname(this.stateFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2))
    } catch (error) {
      console.error('Failed to save window state:', error)
    }
  }

  /**
   * Debounced save to avoid excessive disk writes during resize
   */
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => {
      this.saveState()
    }, 500)
  }

  /**
   * Get the current window state
   */
  public getState(): WindowState {
    return { ...this.state }
  }

  /**
   * Track a window and save state on changes
   */
  public track(window: BrowserWindow): void {
    // Update state when window is moved or resized
    const updateState = () => {
      if (!window.isMinimized() && !window.isMaximized()) {
        const bounds = window.getBounds()
        this.state.width = bounds.width
        this.state.height = bounds.height
        this.state.x = bounds.x
        this.state.y = bounds.y
      }
      this.state.isMaximized = window.isMaximized()
      this.debouncedSave()
    }

    window.on('resize', updateState)
    window.on('move', updateState)
    window.on('maximize', updateState)
    window.on('unmaximize', updateState)

    // Save state when window is about to close
    window.on('close', () => {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveState()
    })
  }
}
