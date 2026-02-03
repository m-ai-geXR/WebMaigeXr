/**
 * Keychain Service for Electron
 *
 * Provides secure credential storage using OS-native keychains:
 * - Windows: Credential Manager
 * - macOS: Keychain
 * - Linux: Secret Service API (libsecret)
 */

// keytar is optional - may not be available on all platforms
let keytar: any
try {
  keytar = require('keytar')
} catch (e) {
  console.warn('keytar not available, secure credential storage will be limited')
}

// Service name used for all maigeXR credentials
const SERVICE_NAME = 'maigeXR'

export class KeychainService {
  private available: boolean

  constructor() {
    this.available = !!keytar
    if (!this.available) {
      console.warn('Keychain service not available - credentials will be stored in database')
    }
  }

  /**
   * Check if keychain service is available
   */
  isAvailable(): boolean {
    return this.available
  }

  /**
   * Get a stored credential
   *
   * @param service - The service name (e.g., 'together', 'openai', 'anthropic')
   * @param account - The account identifier (e.g., 'api_key')
   * @returns The stored password or null if not found
   */
  async get(service: string, account: string): Promise<string | null> {
    if (!this.available) {
      console.warn('Keychain not available')
      return null
    }

    try {
      const fullService = `${SERVICE_NAME}_${service}`
      const password = await keytar.getPassword(fullService, account)
      return password
    } catch (error) {
      console.error('Failed to get credential from keychain:', error)
      return null
    }
  }

  /**
   * Store a credential
   *
   * @param service - The service name
   * @param account - The account identifier
   * @param password - The credential to store
   */
  async set(service: string, account: string, password: string): Promise<void> {
    if (!this.available) {
      console.warn('Keychain not available')
      throw new Error('Secure credential storage not available')
    }

    try {
      const fullService = `${SERVICE_NAME}_${service}`
      await keytar.setPassword(fullService, account, password)
    } catch (error) {
      console.error('Failed to store credential in keychain:', error)
      throw error
    }
  }

  /**
   * Delete a stored credential
   *
   * @param service - The service name
   * @param account - The account identifier
   * @returns True if deleted, false if not found
   */
  async delete(service: string, account: string): Promise<boolean> {
    if (!this.available) {
      console.warn('Keychain not available')
      return false
    }

    try {
      const fullService = `${SERVICE_NAME}_${service}`
      const deleted = await keytar.deletePassword(fullService, account)
      return deleted
    } catch (error) {
      console.error('Failed to delete credential from keychain:', error)
      return false
    }
  }

  /**
   * Check if a credential exists
   *
   * @param service - The service name
   * @param account - The account identifier
   * @returns True if credential exists
   */
  async has(service: string, account: string): Promise<boolean> {
    const password = await this.get(service, account)
    return password !== null
  }

  /**
   * Get all credentials for a service
   *
   * @param service - The service name
   * @returns Array of account/password pairs
   */
  async getAll(service: string): Promise<Array<{ account: string; password: string }>> {
    if (!this.available) {
      return []
    }

    try {
      const fullService = `${SERVICE_NAME}_${service}`
      const credentials = await keytar.findCredentials(fullService)
      return credentials.map((cred: any) => ({
        account: cred.account,
        password: cred.password
      }))
    } catch (error) {
      console.error('Failed to get all credentials:', error)
      return []
    }
  }

  /**
   * Store multiple API keys at once
   *
   * @param keys - Object mapping provider names to API keys
   */
  async setApiKeys(keys: Record<string, string>): Promise<void> {
    for (const [provider, apiKey] of Object.entries(keys)) {
      if (apiKey && apiKey.trim() !== '') {
        await this.set(provider, 'api_key', apiKey)
      }
    }
  }

  /**
   * Get all stored API keys
   *
   * @returns Object mapping provider names to API keys
   */
  async getApiKeys(): Promise<Record<string, string>> {
    const providers = ['together', 'openai', 'anthropic', 'google']
    const keys: Record<string, string> = {}

    for (const provider of providers) {
      const key = await this.get(provider, 'api_key')
      if (key) {
        keys[provider] = key
      }
    }

    return keys
  }

  /**
   * Delete all stored API keys
   */
  async clearApiKeys(): Promise<void> {
    const providers = ['together', 'openai', 'anthropic', 'google']

    for (const provider of providers) {
      await this.delete(provider, 'api_key')
    }
  }
}
