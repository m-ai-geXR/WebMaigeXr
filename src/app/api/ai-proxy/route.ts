/**
 * AI Proxy API Route
 *
 * Server-side proxy for AI providers that block browser CORS requests
 * (Anthropic, xAI). Forwards requests and streams responses back to the client.
 */

import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_DOMAINS = [
  'api.anthropic.com',
  'api.x.ai',
]

export async function POST(request: NextRequest) {
  try {
    const { url, headers: forwardHeaders, body } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 })
    }

    const targetHost = new URL(url).hostname
    if (!ALLOWED_DOMAINS.includes(targetHost)) {
      return NextResponse.json({ error: `Domain not allowed: ${targetHost}` }, { status: 403 })
    }

    const upstream = await fetch(url, {
      method: 'POST',
      headers: forwardHeaders as Record<string, string>,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })

    // Pipe response body directly — handles both streaming SSE and non-streaming JSON
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
