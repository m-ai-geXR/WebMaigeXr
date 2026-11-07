/**
 * Turning provider failures into messages a person can act on.
 *
 * The AI calls used to surface raw text — "Together AI API error: 401 -
 * {"error":{"message":...}}" — straight into the chat. That tells the user
 * nothing they can do something about, and leaks response bodies into the UI.
 *
 * Every failure is classified into a small set of categories. Each carries a
 * short title, a plain explanation, and the next action. The taxonomy is shared
 * with the Android and iOS clients so the three say the same thing.
 */

export type AIErrorCategory =
  | 'missing-api-key'
  | 'invalid-api-key'
  | 'access-denied'
  | 'rate-limited'
  | 'quota-exceeded'
  | 'model-unavailable'
  | 'context-too-long'
  | 'server-error'
  | 'timeout'
  | 'offline'
  | 'empty-response'
  | 'unknown'

export interface AIErrorInfo {
  category: AIErrorCategory
  /** Short, shown as the heading or toast. */
  title: string
  /** What happened, in plain words. No status codes, no response bodies. */
  message: string
  /** The next thing to try. Always present: a dead end is not a useful error. */
  action: string
  /** True when trying the same request again could plausibly work. */
  retryable: boolean
}

/** Error carrying the HTTP status, so classification does not parse prose. */
export class AIProviderError extends Error {
  readonly status?: number
  readonly provider: string
  /** Provider's own message, kept for logs. Never shown raw. */
  readonly providerMessage?: string

  constructor(provider: string, status?: number, providerMessage?: string) {
    super(`${provider} request failed${status ? ` (${status})` : ''}`)
    this.name = 'AIProviderError'
    this.provider = provider
    this.status = status
    this.providerMessage = providerMessage
  }
}

const SETTINGS_HINT = 'Open Settings to check your API key.'

function byStatus(status: number, provider: string): AIErrorInfo | null {
  if (status === 401) {
    return {
      category: 'invalid-api-key',
      title: 'API key rejected',
      message: `${provider} did not accept your API key. It may be mistyped, revoked, or from a different provider.`,
      action: `${SETTINGS_HINT} Keys often pick up a stray space when copied.`,
      retryable: false,
    }
  }
  if (status === 403) {
    return {
      category: 'access-denied',
      title: 'Access denied',
      message: `Your ${provider} key is valid but is not allowed to use this model.`,
      action: 'Pick a different model, or enable access for this one in your provider dashboard.',
      retryable: false,
    }
  }
  if (status === 402) {
    return {
      category: 'quota-exceeded',
      title: 'Out of credit',
      message: `Your ${provider} account has no remaining balance for this request.`,
      action: 'Add credit in your provider dashboard, or switch to a free model.',
      retryable: false,
    }
  }
  if (status === 404) {
    return {
      category: 'model-unavailable',
      title: 'Model unavailable',
      message: `${provider} does not currently offer the selected model.`,
      action: 'Choose another model in Settings.',
      retryable: false,
    }
  }
  if (status === 429) {
    return {
      category: 'rate-limited',
      title: 'Too many requests',
      message: `${provider} is rate limiting you, usually from sending several requests in quick succession.`,
      action: 'Wait a few seconds and try again. Free tiers have tighter limits.',
      retryable: true,
    }
  }
  if (status >= 500) {
    return {
      category: 'server-error',
      title: `${provider} is having trouble`,
      message: 'The provider returned a server error. This is on their side, not yours.',
      action: 'Try again shortly, or switch provider in Settings.',
      retryable: true,
    }
  }
  return null
}

/** Patterns that only appear in prose, where no status code is available. */
function byMessage(text: string, provider: string): AIErrorInfo | null {
  const t = text.toLowerCase()

  // "api key", "apikey" and "api_key" all appear across the three clients.
  const mentionsKey = t.includes('api key') || t.includes('apikey') || t.includes('api_key')
  if (mentionsKey && (t.includes('not configured') || t.includes('required') || t.includes('changeme'))) {
    return {
      category: 'missing-api-key',
      title: 'API key needed',
      message: `${provider} needs an API key before it can answer.`,
      action: SETTINGS_HINT,
      retryable: false,
    }
  }
  if (t.includes('context length') || t.includes('too many tokens') || t.includes('maximum context')) {
    return {
      category: 'context-too-long',
      title: 'Conversation too long',
      message: 'This conversation has outgrown what the model can read at once.',
      action: 'Start a new conversation, or switch to a model with a larger context window.',
      retryable: false,
    }
  }
  if (t.includes('timed out') || t.includes('timeout')) {
    return {
      category: 'timeout',
      title: 'Request timed out',
      message: 'The model took too long to respond. Reasoning models can think for over a minute on hard scenes.',
      action: 'Try again, or lower the reasoning effort in Settings for a faster answer.',
      retryable: true,
    }
  }
  if (
    t.includes('failed to fetch') || t.includes('networkerror') || t.includes('enotfound') ||
    t.includes('econnrefused') || t.includes('offline') || t.includes('cannot reach')
  ) {
    return {
      category: 'offline',
      title: 'No connection',
      message: `Could not reach ${provider}.`,
      action: 'Check your internet connection and try again.',
      retryable: true,
    }
  }
  if (t.includes('empty response') || t.includes('no response body')) {
    return {
      category: 'empty-response',
      title: 'Empty response',
      message: `${provider} accepted the request but returned nothing.`,
      action: 'Try again. If it keeps happening, switch model or provider.',
      retryable: true,
    }
  }
  return null
}

/**
 * Classify any thrown value into something worth showing a user.
 *
 * Never throws, and never returns a raw provider body: an unrecognised failure
 * still produces a usable message rather than leaking JSON into the chat.
 */
export function classifyAIError(error: unknown, providerName = 'The AI provider'): AIErrorInfo {
  if (error instanceof AIProviderError) {
    const provider = error.provider || providerName
    if (typeof error.status === 'number') {
      const byCode = byStatus(error.status, provider)
      if (byCode) return byCode
    }
    if (error.providerMessage) {
      const byText = byMessage(error.providerMessage, provider)
      if (byText) return byText
    }
    return unknownError(provider, error.status)
  }

  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (text) {
    const byText = byMessage(text, providerName)
    if (byText) return byText

    // A status code embedded in prose, from older throw sites.
    const status = text.match(/\b(4\d{2}|5\d{2})\b/)
    if (status) {
      const byCode = byStatus(Number(status[1]), providerName)
      if (byCode) return byCode
    }
  }

  return unknownError(providerName)
}

function unknownError(provider: string, status?: number): AIErrorInfo {
  return {
    category: 'unknown',
    title: 'Something went wrong',
    message: status
      ? `${provider} returned an unexpected error (status ${status}).`
      : `${provider} returned an unexpected error.`,
    action: 'Try again. If it keeps happening, switch model or provider in Settings.',
    retryable: true,
  }
}

/** One-line form, for toasts. */
export function formatAIErrorLine(info: AIErrorInfo): string {
  return `${info.title}. ${info.action}`
}

/** Chat-bubble form: what happened, then what to do. */
export function formatAIErrorMessage(info: AIErrorInfo): string {
  return `**${info.title}**\n\n${info.message}\n\n${info.action}`
}
