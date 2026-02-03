/**
 * Crypto Service for Encrypted API Key Storage
 *
 * Uses Web Crypto API for AES-GCM encryption with PBKDF2 key derivation.
 * API keys are encrypted before storage and decrypted on unlock.
 *
 * Security Features:
 * - AES-256-GCM encryption
 * - PBKDF2 with 100,000 iterations
 * - Random salt and IV for each encryption
 * - Password never stored, only in memory during session
 * - Auto-lock on inactivity
 */

export interface EncryptedData {
  encrypted: string  // Base64-encoded encrypted data
  salt: string       // Base64-encoded salt for key derivation
  iv: string         // Base64-encoded initialization vector
}

export interface DecryptedApiKeys {
  together?: string
  openai?: string
  anthropic?: string
  google?: string
  codesandbox?: string
  [key: string]: string | undefined
}

class CryptoService {
  private static instance: CryptoService
  private cachedPassword: string | null = null
  private lockTimeout: NodeJS.Timeout | null = null
  private readonly LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
  private readonly PBKDF2_ITERATIONS = 100000
  private readonly KEY_LENGTH = 256

  private constructor() {}

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService()
    }
    return CryptoService.instance
  }

  /**
   * Check if Web Crypto API is available
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' &&
           window.crypto &&
           window.crypto.subtle !== undefined
  }

  /**
   * Encrypt API keys with a password
   */
  public async encryptApiKeys(
    apiKeys: DecryptedApiKeys,
    password: string
  ): Promise<EncryptedData> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API not supported')
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Convert API keys object to JSON string
    const plaintext = JSON.stringify(apiKeys)
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Derive encryption key from password
    const key = await this.deriveKey(password, salt)

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    // Return encrypted data with salt and IV
    return {
      encrypted: this.arrayBufferToBase64(encrypted),
      salt: this.arrayBufferToBase64(salt.buffer as ArrayBuffer),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer)
    }
  }

  /**
   * Decrypt API keys with a password
   */
  public async decryptApiKeys(
    encryptedData: EncryptedData,
    password: string
  ): Promise<DecryptedApiKeys> {
    if (!this.isSupported()) {
      throw new Error('Web Crypto API not supported')
    }

    if (!password) {
      throw new Error('Password required')
    }

    try {
      // Convert Base64 strings back to Uint8Arrays
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encrypted)
      const saltArray = new Uint8Array(this.base64ToArrayBuffer(encryptedData.salt))
      const ivArray = new Uint8Array(this.base64ToArrayBuffer(encryptedData.iv))

      // Derive decryption key from password
      const key = await this.deriveKey(password, saltArray)

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray },
        key,
        encryptedBuffer
      )

      // Convert decrypted data to JSON
      const decoder = new TextDecoder()
      const plaintext = decoder.decode(decrypted)
      return JSON.parse(plaintext)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Incorrect password or corrupted data')
    }
  }

  /**
   * Unlock API keys for the session
   * Caches the password in memory for auto-lock
   */
  public async unlockSession(
    encryptedData: EncryptedData,
    password: string
  ): Promise<DecryptedApiKeys> {
    const apiKeys = await this.decryptApiKeys(encryptedData, password)

    // Cache password for session
    this.cachedPassword = password

    // Reset auto-lock timer
    this.resetLockTimer()

    return apiKeys
  }

  /**
   * Lock the session (clear cached password)
   */
  public lockSession(): void {
    this.cachedPassword = null
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = null
    }
  }

  /**
   * Check if session is unlocked
   */
  public isUnlocked(): boolean {
    return this.cachedPassword !== null
  }

  /**
   * Get cached password (if session is unlocked)
   */
  public getCachedPassword(): string | null {
    if (this.isUnlocked()) {
      this.resetLockTimer() // Reset timer on access
      return this.cachedPassword
    }
    return null
  }

  /**
   * Reset auto-lock timer
   */
  private resetLockTimer(): void {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
    }

    this.lockTimeout = setTimeout(() => {
      console.log('🔒 Auto-locking session due to inactivity')
      this.lockSession()
    }, this.LOCK_TIMEOUT_MS)
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Generate a random password (for initial setup)
   */
  public generateRandomPassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    const randomValues = crypto.getRandomValues(new Uint8Array(length))
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length]
    }
    return password
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const cryptoService = CryptoService.getInstance()
