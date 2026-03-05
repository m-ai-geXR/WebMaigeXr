import { useAppStore } from '@/store/app-store'

export interface AIResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamingResponse {
  content: string
  done: boolean
}

// Maximum output tokens per provider
function getMaxTokensForProvider(provider: string): number {
  switch (provider) {
    case 'anthropic': return 64000   // Claude 4 supports up to 64K output
    case 'google':    return 65536   // Gemini 2.5 Pro/Flash max output
    case 'together':  return 32768   // Most Together AI models support 32K
    case 'openai':    return 65536   // GPT-5.2 supports large outputs
    case 'xai':       return 32768   // Grok 4 supports 32K output
    default:          return 32768
  }
}

// Domains that block browser CORS — requests must go through the server-side proxy
const PROXY_DOMAINS = ['api.anthropic.com', 'api.x.ai']

export class AIService {
  private static instance: AIService

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  /**
   * Fetch wrapper that routes CORS-restricted AI APIs through the Next.js proxy.
   * For all other providers (Together AI, OpenAI, Google) it calls fetch directly.
   */
  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    const needsProxy = PROXY_DOMAINS.some(domain => url.includes(domain))
    if (!needsProxy) {
      return fetch(url, init)
    }
    return fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        headers: init.headers,
        body: init.body,
      }),
    })
  }

  async generateResponse(
    prompt: string,
    options: {
      provider: string
      model: string
      apiKey: string
      temperature?: number
      topP?: number
      systemPrompt?: string
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    const { provider, model, apiKey, temperature = 0.7, topP = 0.9, systemPrompt = '' } = options
    const maxTokens = options.maxTokens ?? getMaxTokensForProvider(provider)

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`API key required for ${provider}`)
    }

    switch (provider) {
      case 'together':
        return this.callTogetherAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens })
      case 'openai':
        return this.callOpenAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens })
      case 'anthropic':
        return this.callAnthropic({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens })
      case 'google':
        return this.callGoogleAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens })
      case 'xai':
        return this.callOpenAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens, baseUrl: 'https://api.x.ai/v1' })
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }
  }

  async generateStreamingResponse(
    prompt: string,
    options: {
      provider: string
      model: string
      apiKey: string
      temperature?: number
      topP?: number
      systemPrompt?: string
      maxTokens?: number
    },
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    const { provider, model, apiKey, temperature = 0.7, topP = 0.9, systemPrompt = '' } = options
    const maxTokens = options.maxTokens ?? getMaxTokensForProvider(provider)

    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`API key required for ${provider}`)
    }

    switch (provider) {
      case 'together':
        return this.streamTogetherAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens }, onChunk)
      case 'openai':
        return this.streamOpenAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens }, onChunk)
      case 'anthropic':
        return this.streamAnthropic({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens }, onChunk)
      case 'google':
        return this.streamGoogleAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens }, onChunk)
      case 'xai':
        return this.streamOpenAI({ prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens, baseUrl: 'https://api.x.ai/v1' }, onChunk)
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }
  }

  private async callTogetherAI(options: {
    prompt: string
    model: string
    apiKey: string
    temperature: number
    topP: number
    systemPrompt: string
    maxTokens: number
  }): Promise<AIResponse> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Together AI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    }
  }

  private async streamTogetherAI(
    options: {
      prompt: string
      model: string
      apiKey: string
      temperature: number
      topP: number
      systemPrompt: string
      maxTokens: number
    },
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Together AI API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onChunk({ content: '', done: true })
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''
              if (content) {
                onChunk({ content, done: false })
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async callOpenAI(options: {
    prompt: string
    model: string
    apiKey: string
    temperature: number
    topP: number
    systemPrompt: string
    maxTokens: number
    baseUrl?: string
  }): Promise<AIResponse> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens, baseUrl = 'https://api.openai.com/v1' } = options

    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.safeFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    }
  }

  private async streamOpenAI(
    options: {
      prompt: string
      model: string
      apiKey: string
      temperature: number
      topP: number
      systemPrompt: string
      maxTokens: number
      baseUrl?: string
    },
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens, baseUrl = 'https://api.openai.com/v1' } = options

    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.safeFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body reader available')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onChunk({ content: '', done: true })
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''
              if (content) onChunk({ content, done: false })
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async callAnthropic(options: {
    prompt: string
    model: string
    apiKey: string
    temperature: number
    topP: number
    systemPrompt: string
    maxTokens: number
  }): Promise<AIResponse> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

    const response = await this.safeFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      content: data.content[0].text,
      model: data.model,
      usage: data.usage
    }
  }

  private async streamAnthropic(
    options: {
      prompt: string
      model: string
      apiKey: string
      temperature: number
      topP: number
      systemPrompt: string
      maxTokens: number
    },
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    const { prompt, model, apiKey, temperature, systemPrompt, maxTokens } = options

    const response = await this.safeFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body reader available')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || ''
                if (text) onChunk({ content: text, done: false })
              } else if (parsed.type === 'message_stop') {
                onChunk({ content: '', done: true })
                return
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async callGoogleAI(options: {
    prompt: string
    model: string
    apiKey: string
    temperature: number
    topP: number
    systemPrompt: string
    maxTokens: number
  }): Promise<AIResponse> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        topP,
        maxOutputTokens: 65536
      }
    }

    // Add system instruction if provided
    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }]
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Google AI')
    }

    const candidate = data.candidates[0]
    const content = candidate.content.parts.map((part: any) => part.text).join('')

    return {
      content,
      model: data.modelVersion || model,
      usage: data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0
      } : undefined
    }
  }

  private async streamGoogleAI(
    options: {
      prompt: string
      model: string
      apiKey: string
      temperature: number
      topP: number
      systemPrompt: string
      maxTokens: number
    },
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    const { prompt, model, apiKey, temperature, topP, systemPrompt, maxTokens } = options

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        topP,
        maxOutputTokens: 65536
      }
    }

    // Add system instruction if provided
    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }]
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onChunk({ content: '', done: true })
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Google AI SSE format: each event is "data: {json}\n\n"
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const jsonStr = trimmed.slice(6) // strip "data: " prefix
          if (!jsonStr) continue

          try {
            const parsed = JSON.parse(jsonStr)

            if (parsed.candidates && parsed.candidates.length > 0) {
              const candidate = parsed.candidates[0]
              if (candidate.content && candidate.content.parts) {
                const content = candidate.content.parts
                  .map((part: any) => part.text || '')
                  .join('')

                if (content) {
                  onChunk({ content, done: false })
                }
              }

              // Check if generation is complete
              if (candidate.finishReason) {
                onChunk({ content: '', done: true })
                return
              }
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.debug('Skipping invalid JSON line:', trimmed)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}