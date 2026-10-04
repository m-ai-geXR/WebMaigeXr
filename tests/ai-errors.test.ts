import { describe, it, expect } from 'vitest'
import {
  classifyAIError,
  formatAIErrorLine,
  formatAIErrorMessage,
  AIProviderError,
} from '../src/lib/ai-errors'

describe('classifyAIError', () => {
  describe('by HTTP status', () => {
    const cases: Array<[number, string]> = [
      [401, 'invalid-api-key'],
      [402, 'quota-exceeded'],
      [403, 'access-denied'],
      [404, 'model-unavailable'],
      [429, 'rate-limited'],
      [500, 'server-error'],
      [503, 'server-error'],
    ]

    it.each(cases)('maps %i to %s', (status, category) => {
      const info = classifyAIError(new AIProviderError('Anthropic', status))
      expect(info.category).toBe(category)
    })

    it('names the provider in the message', () => {
      const info = classifyAIError(new AIProviderError('Together AI', 401))
      expect(info.message).toContain('Together AI')
    })

    it('marks transient failures retryable and permanent ones not', () => {
      expect(classifyAIError(new AIProviderError('x', 429)).retryable).toBe(true)
      expect(classifyAIError(new AIProviderError('x', 503)).retryable).toBe(true)
      expect(classifyAIError(new AIProviderError('x', 401)).retryable).toBe(false)
      expect(classifyAIError(new AIProviderError('x', 402)).retryable).toBe(false)
    })
  })

  describe('by message, where no status is available', () => {
    it('detects a missing key', () => {
      expect(classifyAIError(new Error('API key required for together')).category)
        .toBe('missing-api-key')
    })

    it('detects the changeMe placeholder', () => {
      expect(classifyAIError(new Error('apiKey is still changeMe')).category)
        .toBe('missing-api-key')
    })

    it('detects a context overflow', () => {
      expect(classifyAIError(new Error('maximum context length exceeded')).category)
        .toBe('context-too-long')
    })

    it('detects a timeout', () => {
      expect(classifyAIError(new Error('Request timed out')).category).toBe('timeout')
    })

    it('detects being offline', () => {
      expect(classifyAIError(new TypeError('Failed to fetch')).category).toBe('offline')
    })

    it('detects an empty response', () => {
      expect(classifyAIError(new Error('No response body reader available')).category)
        .toBe('empty-response')
    })

    it('reads a status code embedded in older prose throws', () => {
      const info = classifyAIError(new Error('Together AI API error: 429 - slow down'))
      expect(info.category).toBe('rate-limited')
    })
  })

  describe('the thing this exists to prevent', () => {
    it('never leaks a provider response body into the message', () => {
      const body = '{"error":{"message":"invalid x-api-key","type":"authentication_error"}}'
      const info = classifyAIError(new AIProviderError('Anthropic', 401, body))

      expect(info.message).not.toContain('x-api-key')
      expect(info.message).not.toContain('{')
      expect(formatAIErrorMessage(info)).not.toContain(body)
    })

    it('does not put a bare status code in front of the user', () => {
      const info = classifyAIError(new AIProviderError('OpenAI', 401))
      expect(info.message).not.toMatch(/\b401\b/)
    })

    it('always gives the user something to do', () => {
      const errors: unknown[] = [
        new AIProviderError('x', 401),
        new AIProviderError('x', 429),
        new AIProviderError('x', 500),
        new Error('Failed to fetch'),
        new Error('something nobody anticipated'),
        'a bare string',
        null,
        undefined,
      ]
      for (const e of errors) {
        const info = classifyAIError(e)
        expect(info.action.length).toBeGreaterThan(0)
        expect(info.title.length).toBeGreaterThan(0)
        expect(info.message.length).toBeGreaterThan(0)
      }
    })

    it('falls back to a usable message for anything unrecognised', () => {
      const info = classifyAIError(null)
      expect(info.category).toBe('unknown')
      expect(info.action).toContain('Settings')
    })

    it('does not throw on odd input', () => {
      expect(() => classifyAIError({ weird: true })).not.toThrow()
      expect(() => classifyAIError(42)).not.toThrow()
    })
  })

  describe('formatting', () => {
    it('gives a one-line form for toasts', () => {
      const line = formatAIErrorLine(classifyAIError(new AIProviderError('OpenAI', 429)))
      expect(line).not.toContain('\n')
      expect(line).toContain('Too many requests')
    })

    it('gives a chat form with what happened and what to do', () => {
      const info = classifyAIError(new AIProviderError('OpenAI', 401))
      const body = formatAIErrorMessage(info)
      expect(body).toContain(info.title)
      expect(body).toContain(info.message)
      expect(body).toContain(info.action)
    })
  })
})
