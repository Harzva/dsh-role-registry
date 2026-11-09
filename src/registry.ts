// 中立角色库 —— 注册/取用实现（0 运行时依赖，0 预置角色）。
// 从 GroupX `council/role-registry.ts` 迁移；**移除构造函数里的 CORE_ROLE 预置**——
// 中立包不内置任何角色，由各 provider 在启动时注册自己的角色内容。

import {
  type CouncilRoleDefinition,
  type CouncilRoleMetadata,
  type CouncilRoleRequirements,
  type PublicRoleDescriptor,
  type RoleContribution,
  type RoleRef,
  type GroupXRoleRegistry,
  ROLE_PROTOCOL_LIMITS,
} from './types.js'
import { normalizeRoleContribution, normalizeRoleRef } from './normalize.js'

interface RegisteredContribution {
  readonly token: symbol
  readonly contribution: RoleContribution
  readonly publicRoles: readonly PublicRoleDescriptor[]
}

function frozenStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values])
}

function frozenRequirements(value: CouncilRoleRequirements | undefined): CouncilRoleRequirements | undefined {
  if (value === undefined) return undefined
  return Object.freeze({
    ...(value.roleRefs === undefined
      ? {}
      : { roleRefs: Object.freeze(value.roleRefs.map(ref => Object.freeze({ id: ref.id, version: ref.version }))) }),
    ...(value.artifactTypes === undefined ? {} : { artifactTypes: frozenStrings(value.artifactTypes) }),
  })
}

function frozenMetadata(value: CouncilRoleMetadata | undefined): CouncilRoleMetadata | undefined {
  if (value === undefined) return undefined
  return Object.freeze({
    ...(value.alpha24Role === undefined
      ? {}
      : {
          alpha24Role: Object.freeze({
            label: value.alpha24Role.label,
            order: value.alpha24Role.order,
          }),
        }),
  })
}

function publicDescriptor(
  contribution: RoleContribution,
  role: CouncilRoleDefinition,
): PublicRoleDescriptor {
  return Object.freeze({
    contributorId: contribution.contributorId,
    contributionVersion: contribution.version,
    id: role.id,
    version: role.version,
    namespace: role.namespace,
    kind: role.kind,
    label: role.label,
    shortDescription: role.shortDescription,
    capabilityTags: frozenStrings(role.capabilityTags),
    ...(role.requiresHarnessCapabilities === undefined
      ? {}
      : { requiresHarnessCapabilities: frozenStrings(role.requiresHarnessCapabilities) }),
    ...(role.prefersModelCapabilities === undefined
      ? {}
      : { prefersModelCapabilities: frozenStrings(role.prefersModelCapabilities) }),
    ...(role.requires === undefined ? {} : { requires: frozenRequirements(role.requires) }),
    ...(role.suggestedCognitiveRoles === undefined
      ? {}
      : { suggestedCognitiveRoles: frozenStrings(role.suggestedCognitiveRoles) }),
    phases: frozenStrings(role.phases) as PublicRoleDescriptor['phases'],
    ...(role.metadata === undefined ? {} : { metadata: frozenMetadata(role.metadata) }),
  })
}

function isReservedCoreIdentifier(value: string): boolean {
  return value === 'core' || value.startsWith('core.')
}

function namespaceOwner(value: string): string {
  const separator = value.indexOf('.')
  return separator === -1 ? value : value.slice(0, separator)
}

export class RoleRegistry implements GroupXRoleRegistry {
  readonly #contributors = new Map<string, RegisteredContribution>()
  readonly #roles = new Map<string, CouncilRoleDefinition>()

  register(value: RoleContribution): () => void {
    const contribution = normalizeRoleContribution(value)
    // 保留 `core.*` 命名空间给其合法 owner（如 GroupX 的 core.dsh-groupx）。
    // 非 core-owner 的贡献者不得占用 reserved core id/namespace/alpha24Role。
    const owner = namespaceOwner(contribution.contributorId)
    const usesReservedCore = contribution.roles.some(role => (
      isReservedCoreIdentifier(role.id)
      || isReservedCoreIdentifier(role.namespace)
      || role.metadata?.alpha24Role !== undefined
    ))
    // 裸 `core`（无子 id）不是合法贡献者 id。
    if (contribution.contributorId === 'core') {
      throw new Error('reserved-core-role-namespace')
    }
    if (owner !== 'core' && usesReservedCore) {
      throw new Error('reserved-core-role-namespace')
    }
    if (contribution.roles.some(role => namespaceOwner(role.namespace) !== owner)) {
      throw new Error('role-namespace-owner-mismatch')
    }
    return this.#commit(contribution)
  }

  resolve(value: RoleRef): CouncilRoleDefinition | undefined {
    let ref: RoleRef
    try {
      ref = normalizeRoleRef(value)
    } catch {
      return undefined
    }
    const role = this.#roles.get(ref.id)
    return role?.version === ref.version ? role : undefined
  }

  snapshot(): readonly PublicRoleDescriptor[] {
    const roles: PublicRoleDescriptor[] = []
    for (const registered of this.#contributors.values()) roles.push(...registered.publicRoles)
    return Object.freeze(roles)
  }

  #commit(contribution: RoleContribution): () => void {
    if (this.#contributors.has(contribution.contributorId)) {
      throw new Error(`duplicate-role-contributor:${contribution.contributorId}`)
    }
    if (this.#contributors.size >= ROLE_PROTOCOL_LIMITS.contributorsPerRegistry) {
      throw new Error('role-registry-contributor-limit')
    }
    if (this.#roles.size + contribution.roles.length > ROLE_PROTOCOL_LIMITS.rolesPerRegistry) {
      throw new Error('role-registry-role-limit')
    }
    for (const role of contribution.roles) {
      if (this.#roles.has(role.id)) throw new Error(`duplicate-role-id:${role.id}`)
    }

    const registered: RegisteredContribution = Object.freeze({
      token: Symbol(contribution.contributorId),
      contribution,
      publicRoles: Object.freeze(contribution.roles.map(role => publicDescriptor(contribution, role))),
    })

    this.#contributors.set(contribution.contributorId, registered)
    for (const role of contribution.roles) this.#roles.set(role.id, role)

    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      if (this.#contributors.get(contribution.contributorId)?.token !== registered.token) return
      this.#contributors.delete(contribution.contributorId)
      for (const role of contribution.roles) {
        if (this.#roles.get(role.id) === role) this.#roles.delete(role.id)
      }
    }
  }
}

export function createRoleRegistry(): GroupXRoleRegistry {
  return new RoleRegistry()
}
