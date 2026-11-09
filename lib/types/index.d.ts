import type { IncomingMessage, ServerResponse } from 'node:http';
import { ROLE_REGISTRY_SERVICE, GROUPX_ROLE_REGISTRY_SERVICE, ROLE_PROTOCOL_LIMITS, ROLES_API_PATH, ROLES_API_ROLES_PATH } from './types.js';
export { ROLES_API_PATH, ROLES_API_ROLES_PATH };
import { createRoleRegistry, RoleRegistry } from './registry.js';
export { normalizeRoleContribution, normalizeRoleRef, isRoleRef, isRoleContribution, roleRefKey, containsSensitiveRoleText, } from './normalize.js';
export { ROLE_REGISTRY_SERVICE, GROUPX_ROLE_REGISTRY_SERVICE, ROLE_PROTOCOL_LIMITS, createRoleRegistry, RoleRegistry, };
export type { CouncilRoleKind, CouncilRolePhase, CouncilRoleDefinition, CouncilRoleMetadata, CouncilRolePrompt, CouncilRoleRequirements, RoleRef, RoleContribution, PublicRoleDescriptor, RoleRegistry as RoleRegistryContract, GroupXRoleRegistry, } from './types.js';
/** 明文导出：读取通道路径已移入 types.ts 单一来源；此处 re-export 保持既有 `import { ROLES_API_ROLES_PATH } from '.../index'` 兼容。 */
/** 轻量宿主插件上下文：仅暴露本包 apply 需要的方法，保持中立包零强依赖。 */
export interface RoleRegistryPluginContext {
    provide(name: string, value: unknown): unknown;
    get?(name: string): unknown;
    /** webServer 为可选服务；用 inject 等待而非同步 get，保证 headless 下静默跳过。 */
    inject?(keys: readonly string[], callback: (ctx: RoleRegistryPluginContext) => void): void;
    effect?(disposer: () => void, label?: string): void;
    logger?: {
        info?(...args: unknown[]): void;
        warn?(...args: unknown[]): void;
    };
}
export declare const name = "harzva-dsh-role-registry";
export type NeutralRoutesHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
export declare function apply(ctx: RoleRegistryPluginContext): void;
