import Router from '@koa/router'
import type { Context } from 'koa'
import { knowledgeSummary } from '../services/knowledge/llm-wiki-client'

export const workbenchRoutes = new Router()

workbenchRoutes.get('/api/workbench/summary', async (ctx: Context) => {
  const knowledge = await knowledgeSummary()
  ctx.body = {
    generatedAt: new Date().toISOString(),
    knowledge,
    services: [
      { id: 'studio', name: 'Hermes Studio', status: 'ok' },
      { id: 'llm-wiki', name: 'LLM Wiki', status: knowledge.serviceOk ? 'ok' : 'unavailable' },
    ],
    dataBoundaries: {
      knowledge: 'public-papers-may-use-external-llm',
    },
  }
})
