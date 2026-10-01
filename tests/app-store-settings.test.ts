import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Guards the crash the user hit: switching 3D library called updateSettings,
 * which wrote to the database from inside a Zustand set() updater. With the
 * database uninitialised that write threw straight out of the React event
 * handler, so every click produced an uncaught "Database not initialized".
 *
 * Settings are allowed to fail to persist. They are not allowed to take the UI
 * down with them.
 */

const saveSettings = vi.fn()

vi.mock('@/lib/db-service', () => ({
  dbService: {
    saveSettings: (...args: unknown[]) => saveSettings(...args),
    getSettings: () => null,
    getConversations: () => [],
    getMessages: () => [],
    initialize: async () => {},
  },
}))

async function freshStore() {
  vi.resetModules()
  const mod = await import('@/store/app-store')
  return mod.useAppStore
}

beforeEach(() => {
  saveSettings.mockReset()
})

describe('updateSettings', () => {
  it('persists the merged settings on the happy path', async () => {
    const useAppStore = await freshStore()

    useAppStore.getState().updateSettings({ selectedLibrary: 'nova64' })

    expect(useAppStore.getState().settings.selectedLibrary).toBe('nova64')
    expect(saveSettings).toHaveBeenCalledTimes(1)
    // The whole settings object is persisted, not just the delta.
    expect(saveSettings.mock.calls[0][0]).toMatchObject({ selectedLibrary: 'nova64' })
  })

  it('does not throw when the database is unavailable', async () => {
    const useAppStore = await freshStore()
    saveSettings.mockImplementation(() => {
      throw new Error('Database not initialized')
    })

    expect(() =>
      useAppStore.getState().updateSettings({ selectedLibrary: 'nova64' })
    ).not.toThrow()
  })

  it('still applies the change in memory when persistence fails', async () => {
    const useAppStore = await freshStore()
    saveSettings.mockImplementation(() => {
      throw new Error('Database not initialized')
    })

    useAppStore.getState().updateSettings({ selectedLibrary: 'nova64' })

    // The user's choice must survive even though it could not be written.
    expect(useAppStore.getState().settings.selectedLibrary).toBe('nova64')
  })

  it('keeps working across repeated failing updates', async () => {
    const useAppStore = await freshStore()
    saveSettings.mockImplementation(() => {
      throw new Error('Database not initialized')
    })

    // The reported symptom was a wall of errors from clicking repeatedly.
    for (const id of ['threejs', 'nova64', 'aframe', 'babylonjs']) {
      expect(() => useAppStore.getState().updateSettings({ selectedLibrary: id })).not.toThrow()
    }

    expect(useAppStore.getState().settings.selectedLibrary).toBe('babylonjs')
  })

  it('does not write to the database from inside the state updater', async () => {
    const useAppStore = await freshStore()

    // If the write happens inside set(), it runs while the store is mid-update.
    // Reading the store from the write proves the ordering is safe.
    let librarySeenDuringWrite: string | undefined
    saveSettings.mockImplementation(() => {
      librarySeenDuringWrite = useAppStore.getState().settings.selectedLibrary
    })

    useAppStore.getState().updateSettings({ selectedLibrary: 'nova64' })

    // State is committed before persistence runs.
    expect(librarySeenDuringWrite).toBe('nova64')
  })
})
