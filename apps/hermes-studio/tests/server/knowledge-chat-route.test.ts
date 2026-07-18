import Koa from 'koa'
import bodyParser from '@koa/bodyparser'
import { createServer, request as httpRequest, type Server as HttpServer } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { knowledgeRoutes } from '../../packages/server/src/routes/knowledge'

function listen(server: HttpServer): Promise<string> {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('missing address')
    resolve(`http://127.0.0.1:${address.port}`)
  }))
}

function postJson(url: string, body: unknown): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const request = httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({ status: response.statusCode || 0, body: text ? JSON.parse(text) : null })
      })
    })
    request.on('error', reject)
    request.end(payload)
  })
}

function getJson(url: string): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: 'GET' }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({ status: response.statusCode || 0, body: text ? JSON.parse(text) : null })
      })
    })
    request.on('error', reject)
    request.end()
  })
}

describe('knowledge Wiki chat BFF', () => {
  let server: HttpServer
  let baseUrl: string
  let upstreamFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    upstreamFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      message: 'Local answer',
      references: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', upstreamFetch)

    const app = new Koa()
    app.use(bodyParser())
    app.use(knowledgeRoutes.routes())
    server = createServer(app.callback())
    baseUrl = await listen(server)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await new Promise<void>(resolve => server.close(() => resolve()))
  })

  it('forces a stateless, local-only, read-only upstream request', async () => {
    const response = await postJson(`${baseUrl}/api/knowledge/chat`, {
      question: '  What does the approved Wiki say?  ',
      readOnly: false,
      tools: { web: true },
    })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ message: 'Local answer' })
    expect(upstreamFetch).toHaveBeenCalledTimes(1)

    const [url, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:19828/api/v1/projects/current/chat')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      message: 'What does the approved Wiki say?',
      mode: 'local_first',
      retrievalMode: 'smart',
      tools: { wiki: true, web: false, anytxt: false },
      topK: 8,
      includeContent: false,
      history: [],
      historyExplicit: true,
      skills: [],
      persistSession: false,
      readOnly: true,
    })
  })

  it('rejects empty and oversized questions before calling LLM Wiki', async () => {
    const empty = await postJson(`${baseUrl}/api/knowledge/chat`, { question: '   ' })
    const oversized = await postJson(`${baseUrl}/api/knowledge/chat`, { question: 'x'.repeat(8_001) })

    expect(empty).toEqual({ status: 400, body: { error: 'question_required' } })
    expect(oversized).toEqual({ status: 413, body: { error: 'question_too_long' } })
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it('proxies the Studio-managed workspace and switches by project ID', async () => {
    upstreamFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/projects')) {
        return Promise.resolve(new Response(JSON.stringify({
          projects: [{ id: 'wiki-a', name: '研究资料库', path: 'C:/wiki-a', current: true }],
          currentProject: { id: 'wiki-a', name: '研究资料库', path: 'C:/wiki-a', current: true },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      if (url.endsWith('/health')) {
        return Promise.resolve(new Response(JSON.stringify({ status: 'running', version: '0.6.4', retrievalMode: 'keyword_graph', studioManaged: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.endsWith('/projects/current/select')) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true, project: { id: 'wiki-a' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.reject(new Error(`Unexpected upstream request: ${url} ${init?.method || 'GET'}`))
    })

    const workspace = await getJson(`${baseUrl}/api/knowledge/workspace`)
    const missing = await postJson(`${baseUrl}/api/knowledge/workspace/select`, {})
    const selected = await postJson(`${baseUrl}/api/knowledge/workspace/select`, { projectId: 'wiki-a' })

    expect(workspace).toEqual({
      status: 200,
      body: expect.objectContaining({
        projects: [expect.objectContaining({ id: 'wiki-a' })],
        currentProject: expect.objectContaining({ id: 'wiki-a' }),
        service: expect.objectContaining({
          status: 'running',
          version: '0.6.4',
          retrievalMode: 'keyword_graph',
          studioManaged: true,
          llmConfigured: false,
          llmConfigSource: 'none',
        }),
      }),
    })
    expect(missing).toEqual({ status: 400, body: { error: 'project_id_required' } })
    expect(selected).toEqual({ status: 200, body: { ok: true, project: { id: 'wiki-a' } } })
    const [url, init] = upstreamFetch.mock.calls.find(([requestUrl]) => String(requestUrl).endsWith('/projects/current/select')) as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:19828/api/v1/projects/current/select')
    expect(JSON.parse(String(init.body))).toEqual({ projectId: 'wiki-a' })
  })
})
