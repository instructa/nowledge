import type { CommandDef } from 'citty'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  ingest: () => import('./ingest').then(_rDefault),
  query: () => import('./query').then(_rDefault),
  watch: () => import('./watch').then(_rDefault),
  init: () => import('./init').then(_rDefault),
  vacuum: () => import('./vacuum').then(_rDefault),
  server: () => import('./mcp').then(_rDefault),
} as const
