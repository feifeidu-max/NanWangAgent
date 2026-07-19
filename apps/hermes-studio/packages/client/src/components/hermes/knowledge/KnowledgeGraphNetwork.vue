<script setup lang="ts">
import { nextTick, onUnmounted, shallowRef, watch } from 'vue'
import {
  VueFlow,
  useVueFlow,
  type Edge,
  type Node,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const props = defineProps<{
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}>()

const emit = defineEmits<{
  open: [node: Record<string, unknown>]
}>()

const flowNodes = shallowRef<Node[]>([])
const flowEdges = shallowRef<Edge[]>([])
const { fitView } = useVueFlow('knowledge-graph')
let fitTimer: ReturnType<typeof setTimeout> | null = null

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function graphNodeId(node: Record<string, unknown>): string {
  return text(node.id ?? node.path)
}

function nodeColor(type: string): string {
  if (type === 'paper') return '#2f6b4f'
  if (type === 'concept') return '#8a6a22'
  if (type === 'entity') return '#37658a'
  if (type === 'method') return '#765083'
  return '#666666'
}

function miniMapColor(node: Node): string {
  return nodeColor(text(node.data?.nodeType, 'other'))
}

function buildLayout(nodeInputs: Array<Record<string, unknown>>, edgeInputs: Array<Record<string, unknown>>) {
  const ids = nodeInputs.map(graphNodeId).filter(Boolean)
  const indexById = new Map(ids.map((id, index) => [id, index]))
  const positions = ids.map((_, index) => {
    const angle = index * 2.399963229728653
    const radius = 70 * Math.sqrt(index + 1)
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
  const layoutEdges = edgeInputs
    .map(edge => ({
      source: text(edge.source),
      target: text(edge.target),
      weight: Math.max(0.05, numeric(edge.weight, 1)),
    }))
    .filter(edge => indexById.has(edge.source) && indexById.has(edge.target) && edge.source !== edge.target)

  for (let iteration = 0; iteration < 180; iteration += 1) {
    const forces = ids.map(() => ({ x: 0, y: 0 }))
    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        let dx = positions[right].x - positions[left].x
        let dy = positions[right].y - positions[left].y
        let distanceSquared = dx * dx + dy * dy
        if (distanceSquared < 1) {
          dx = 1 + ((left * 17 + right * 13) % 7)
          dy = 1 + ((left * 11 + right * 19) % 5)
          distanceSquared = dx * dx + dy * dy
        }
        const distance = Math.sqrt(distanceSquared)
        const repulsion = Math.min(24, 95_000 / distanceSquared)
        const fx = (dx / distance) * repulsion
        const fy = (dy / distance) * repulsion
        forces[left].x -= fx
        forces[left].y -= fy
        forces[right].x += fx
        forces[right].y += fy
      }
    }
    for (const edge of layoutEdges) {
      const source = indexById.get(edge.source)!
      const target = indexById.get(edge.target)!
      const dx = positions[target].x - positions[source].x
      const dy = positions[target].y - positions[source].y
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const desired = edge.weight >= 0.99 ? 250 : 205
      const attraction = (distance - desired) * (edge.weight >= 0.99 ? 0.012 : 0.025)
      const fx = (dx / distance) * attraction
      const fy = (dy / distance) * attraction
      forces[source].x += fx
      forces[source].y += fy
      forces[target].x -= fx
      forces[target].y -= fy
    }
    const cooling = 1 - iteration / 200
    for (let index = 0; index < positions.length; index += 1) {
      forces[index].x -= positions[index].x * 0.0025
      forces[index].y -= positions[index].y * 0.0025
      positions[index].x += Math.max(-20, Math.min(20, forces[index].x)) * cooling
      positions[index].y += Math.max(-20, Math.min(20, forces[index].y)) * cooling
    }
  }
  return positions
}

async function rebuildGraph() {
  const validNodes = props.nodes.filter(node => graphNodeId(node))
  const validIds = new Set(validNodes.map(graphNodeId))
  const validEdges = props.edges.filter(edge => {
    const source = text(edge.source)
    const target = text(edge.target)
    return source && target && source !== target && validIds.has(source) && validIds.has(target)
  })
  const positions = buildLayout(validNodes, validEdges)
  flowNodes.value = validNodes.map((node, index) => {
    const nodeType = text(node.nodeType ?? node.node_type, 'other')
    return {
      id: graphNodeId(node),
      type: 'knowledge',
      position: positions[index] || { x: 0, y: 0 },
      data: {
        label: text(node.label ?? node.title ?? node.name ?? node.id, '未命名页面'),
        nodeType,
        linkCount: numeric(node.linkCount ?? node.link_count),
        color: nodeColor(nodeType),
        raw: node,
      },
      style: { width: '190px' },
    }
  })
  flowEdges.value = validEdges.map((edge, index) => {
    const kind = text(edge.kind, 'wikilink')
    const similarity = kind === 'keyword_similarity'
    return {
      id: `${kind}:${text(edge.source)}:${text(edge.target)}:${index}`,
      source: text(edge.source),
      target: text(edge.target),
      type: 'default',
      style: {
        stroke: similarity ? '#b98735' : '#6f7882',
        strokeWidth: similarity ? 1.35 : 1.8,
        strokeDasharray: similarity ? '5 4' : undefined,
        opacity: similarity ? 0.72 : 0.86,
      },
      data: {
        kind,
        sharedTerms: Array.isArray(edge.sharedTerms) ? edge.sharedTerms : edge.shared_terms,
      },
    }
  })
  await nextTick()
  if (fitTimer) clearTimeout(fitTimer)
  fitTimer = setTimeout(() => {
    void fitView({ padding: 0.16, minZoom: 0.12, maxZoom: 0.95, duration: 250 })
  }, 60)
}

function openNode(payload: NodeMouseEvent) {
  const raw = payload.node.data?.raw
  if (raw && typeof raw === 'object') emit('open', raw as Record<string, unknown>)
}

watch(() => [props.nodes, props.edges], () => { void rebuildGraph() }, { deep: true, immediate: true })

onUnmounted(() => {
  if (fitTimer) clearTimeout(fitTimer)
})
</script>

<template>
  <div class="knowledge-graph-network">
    <div class="knowledge-graph-legend" aria-label="图谱图例">
      <span><i class="legend-line legend-line--wiki" />Wiki 显式链接</span>
      <span><i class="legend-line legend-line--similar" />关键词相关</span>
      <small>双击节点打开 Wiki</small>
    </div>
    <VueFlow
      id="knowledge-graph"
      v-model:nodes="flowNodes"
      v-model:edges="flowEdges"
      :fit-view-on-init="true"
      :min-zoom="0.12"
      :max-zoom="2"
      :nodes-connectable="false"
      :edges-updatable="false"
      :zoom-on-double-click="false"
      class="knowledge-flow"
      @node-double-click="openNode"
    >
      <template #node-knowledge="{ data }">
        <div class="knowledge-flow-node" :style="{ '--node-color': data.color }" :title="`${data.label}，双击打开 Wiki`">
          <span>{{ data.nodeType }}</span>
          <strong>{{ data.label }}</strong>
          <small>{{ data.linkCount }} 条关系</small>
        </div>
      </template>
      <Background :gap="24" :size="1" color="var(--border-color)" />
      <MiniMap pannable zoomable :node-color="miniMapColor" />
      <Controls />
    </VueFlow>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.knowledge-graph-network {
  position: relative;
  min-height: 560px;
  height: min(68vh, 760px);
  overflow: hidden;
  border: 1px solid $border-color;
  background: $bg-secondary;
}

.knowledge-flow { width: 100%; height: 100%; }

.knowledge-graph-legend {
  position: absolute;
  z-index: 6;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid $border-color;
  padding: 7px 9px;
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  color: $text-secondary;
  font-size: 11px;

  span { display: inline-flex; align-items: center; gap: 5px; }
  small { color: $text-muted; }
}

.legend-line { display: inline-block; width: 24px; border-top: 2px solid #6f7882; }
.legend-line--similar { border-top: 2px dashed #b98735; }

.knowledge-flow-node {
  display: grid;
  width: 190px;
  min-height: 68px;
  box-sizing: border-box;
  gap: 4px;
  border: 1px solid color-mix(in srgb, var(--node-color) 72%, var(--border-color));
  border-left: 4px solid var(--node-color);
  padding: 9px 10px;
  background: $bg-primary;
  color: $text-primary;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .08);

  > span { color: var(--node-color); font-size: 10px; text-transform: uppercase; }
  > strong { display: -webkit-box; overflow: hidden; font-size: 12px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  > small { color: $text-muted; font-size: 10px; }
}

:deep(.vue-flow__node.selected .knowledge-flow-node) {
  outline: 2px solid $accent-primary;
  outline-offset: 2px;
}

:deep(.vue-flow__controls),
:deep(.vue-flow__minimap) {
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  background: $bg-primary;
}

:deep(.vue-flow__controls-button) {
  border-bottom-color: $border-light;
  background: $bg-primary;
  color: $text-primary;
}

@media (max-width: $breakpoint-mobile) {
  .knowledge-graph-network { min-height: 500px; height: 68vh; }
  .knowledge-graph-legend { right: 10px; flex-wrap: wrap; gap: 7px 12px; }
  .knowledge-graph-legend small { width: 100%; }
}
</style>
