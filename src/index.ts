// @harzva/dsh-role-registry —— 中立角色库插件入口。
// 提供纯机制（类型 + createRoleRegistry + 归一化纯函数），不预置任何角色；
// 任何 provider（GroupX、supervisor、未来三方）经 ctx.get('roleRegistry') 注册/召集角色。
// 本包同时提供「中立读取通道」：GET /dsh-roles/api/roles 返回 roleRegistry.snapshot()，
// 供统一面板等消费者中立读取，不依赖任何单个 provider 的端点。

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  ROLE_REGISTRY_SERVICE,
  GROUPX_ROLE_REGISTRY_SERVICE,
  ROLE_PROTOCOL_LIMITS,
  ROLES_API_PATH,
  ROLES_API_ROLES_PATH,
} from './types.js'
export { ROLES_API_PATH, ROLES_API_ROLES_PATH }
import { createRoleRegistry, RoleRegistry } from './registry.js'
export {
  normalizeRoleContribution,
  normalizeRoleRef,
  isRoleRef,
  isRoleContribution,
  roleRefKey,
  containsSensitiveRoleText,
} from './normalize.js'

// 值导出（供消费方 import）：服务 key、limit、注册器实现。
export {
  ROLE_REGISTRY_SERVICE,
  GROUPX_ROLE_REGISTRY_SERVICE,
  ROLE_PROTOCOL_LIMITS,
  createRoleRegistry,
  RoleRegistry,
}

// 类型导出（仅编译期）。
export type {
  CouncilRoleKind,
  CouncilRolePhase,
  CouncilRoleDefinition,
  CouncilRoleMetadata,
  CouncilRolePrompt,
  CouncilRoleRequirements,
  RoleRef,
  RoleContribution,
  PublicRoleDescriptor,
  RoleRegistry as RoleRegistryContract,
  GroupXRoleRegistry,
} from './types.js'

/** 明文导出：读取通道路径已移入 types.ts 单一来源；此处 re-export 保持既有 `import { ROLES_API_ROLES_PATH } from '.../index'` 兼容。 */

/** 轻量宿主插件上下文：仅暴露本包 apply 需要的方法，保持中立包零强依赖。 */
export interface RoleRegistryPluginContext {
  provide(name: string, value: unknown): unknown
  get?(name: string): unknown
  /** webServer 为可选服务；用 inject 等待而非同步 get，保证 headless 下静默跳过。 */
  inject?(keys: readonly string[], callback: (ctx: RoleRegistryPluginContext) => void): void
  effect?(disposer: () => void, label?: string): void
  logger?: { info?(...args: unknown[]): void; warn?(...args: unknown[]): void }
}

export const name = 'harzva-dsh-role-registry'

export type NeutralRoutesHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

type WebServerLike = { register(route: { kind: 'exact'; path: string; handler: NeutralRoutesHandler }): () => void }

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

function isLoopback(req: IncomingMessage): boolean {
  const address = req.socket?.remoteAddress ?? ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin === undefined) return true
  if (host === undefined) return false
  try { return new URL(origin).host === host } catch { return false }
}

export function apply(ctx: RoleRegistryPluginContext): void {
  // 一个中立角色库实例。GroupX 的 'groupxRoleRegistry' 与中立 'roleRegistry' 指向同一实例，
  // 保证既有 ctx.get('groupxRoleRegistry') 调用方与新的 ctx.get('roleRegistry') 看到同一批角色。
  const registry = createRoleRegistry()
  ctx.provide(ROLE_REGISTRY_SERVICE, registry)
  ctx.provide(GROUPX_ROLE_REGISTRY_SERVICE, registry)

  // 中立读取通道：GET /dsh-roles/api/roles -> registry.snapshot()。
  // webServer 为可选宿主服务（headless 下缺失）；用 inject 等待 + try/catch 兜底。
  // 既有测试以 `apply({ provide })` 调用（无 inject），此时静默跳过读取通道，仅提供实例。
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['webServer'], (wctx) => {
        const server = (typeof wctx.get === 'function' ? wctx.get('webServer') : undefined) as WebServerLike | undefined
        if (server === undefined || typeof server.register !== 'function') return
        const handler: NeutralRoutesHandler = (req, res) => {
          const url = new URL(req.url ?? '/', 'http://local')
          if (url.pathname !== ROLES_API_ROLES_PATH) {
            writeJson(res, 404, { ok: false, error: 'not-found' })
            return
          }
          if (req.method !== 'GET') {
            writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          if (!isLoopback(req) || !sameOrigin(req)) {
            writeJson(res, 403, { ok: false, error: 'local-same-origin-required' })
            return
          }
          writeJson(res, 200, { ok: true, roles: registry.snapshot() })
        }
        wctx.effect?.(
          () => server.register({ kind: 'exact', path: ROLES_API_ROLES_PATH, handler }),
          'dsh-role-registry: neutral read channel',
        )
      })
    } catch (cause) {
      // headless / webServer permanently absent: 只记日志，不影响实例提供。
      ctx.logger?.warn?.('[role-registry] neutral read channel skipped: %o', cause)
    }
  }
}
