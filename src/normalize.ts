// 中立角色库 —— 归一化/校验纯函数（0 运行时依赖）。
// 从 GroupX `roles.ts` 迁移；与原实现一致，保留全部校验不变量。

import {
  type CouncilRoleDefinition,
  type CouncilRoleMetadata,
  type CouncilRolePhase,
  type CouncilRolePrompt,
  type CouncilRoleRequirements,
  type RoleContribution,
  type RoleRef,
  ROLE_PROTOCOL_LIMITS,
} from './types.js'

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const VERSION_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z._+-]*[0-9A-Za-z])?$/
const DISALLOWED_TEXT_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const SENSITIVE_TEXT_PATTERNS = Object.freeze([
  /(?:^|[\s"'`([{=,:])\/(?!\/)[^/\s"'`<>]+(?:\/[^/\s"'`<>]+)*/u,
  /(?:^|[\s"'`([{=,:])~\/[^/\s"'`<>]+(?:\/[^/\s"'`<>]+)*/u,
  /\b[A-Za-z]:[\\/][^\s"'`<>]+/,
  /(?:^|[\s"'`([{=,:])\\\\[^\\\s"'`<>]+\\[^\\\s"'`<>]+/,
  /\bfile:\/{2,3}[^\s"'`<>]+/i,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bbearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}\b/i,
  /\b(?:[A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|SECRET|COOKIE)|apiKey|accessToken|refreshToken)\b\s*[:=]\s*["']?[A-Za-z0-9+/_=-]{8,}/i,
])
const CONTRIBUTION_KEYS = new Set(['contributorId', 'version', 'roles'])
const ROLE_DEFINITION_KEYS = new Set([
  'id',
  'version',
  'namespace',
  'kind',
  'label',
  'shortDescription',
  'capabilityTags',
  'requiresHarnessCapabilities',
  'prefersModelCapabilities',
  'requires',
  'suggestedCognitiveRoles',
  'phases',
  'metadata',
  'prompt',
])
const ROLE_REF_KEYS = new Set(['id', 'version'])
const REQUIREMENT_KEYS = new Set(['roleRefs', 'artifactTypes'])
const METADATA_KEYS = new Set(['alpha24Role'])
const ALPHA24_METADATA_KEYS = new Set(['label', 'order'])
const PROMPT_KEYS = new Set(['identity', 'objectives', 'mustCheck', 'mustNot', 'outputContract'])
const ROLE_PHASES = new Set<CouncilRolePhase>([
  'proposal',
  'challenge',
  'response',
  'revision',
  'evaluation',
  'synthesis',
])

function invalid(path: string): never {
  throw new Error(`invalid-role-protocol:${path}`)
}

function record(
  value: unknown,
  path: string,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(path)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) invalid(path)
  const normalized = Object.create(null) as Record<string, unknown>
  const keys = Reflect.ownKeys(value)
  if (keys.length > allowedKeys.size) invalid(path)
  for (const key of keys) {
    if (typeof key !== 'string' || !allowedKeys.has(key)) invalid(path)
    const property = Object.getOwnPropertyDescriptor(value, key)
    if (property === undefined || !('value' in property)) invalid(path)
    normalized[key] = property.value
  }
  return normalized
}

function array(
  value: unknown,
  path: string,
  maximum: number = ROLE_PROTOCOL_LIMITS.valuesPerArray,
): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) invalid(path)
  const normalized: unknown[] = []
  for (let index = 0; index < value.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(value, String(index))
    if (property === undefined || !('value' in property)) invalid(`${path}[${String(index)}]`)
    normalized.push(property.value)
  }
  return normalized
}

export function containsSensitiveRoleText(value: string): boolean {
  return SENSITIVE_TEXT_PATTERNS.some(pattern => pattern.test(value))
}

function text(value: unknown, path: string, maximum: number, multiline = false): string {
  if (typeof value !== 'string' || value.length > maximum || DISALLOWED_TEXT_CONTROL.test(value)) invalid(path)
  if (!multiline && /[\r\n\t]/.test(value)) invalid(path)
  const normalized = value.trim()
  if (normalized === '' || containsSensitiveRoleText(normalized)) invalid(path)
  return normalized
}

function identifier(value: unknown, path: string): string {
  const normalized = text(value, path, ROLE_PROTOCOL_LIMITS.identifier)
  if (!IDENTIFIER_PATTERN.test(normalized)) invalid(path)
  return normalized
}

function version(value: unknown, path: string): string {
  const normalized = text(value, path, ROLE_PROTOCOL_LIMITS.version)
  if (!VERSION_PATTERN.test(normalized)) invalid(path)
  return normalized
}

function uniqueStrings(
  value: unknown,
  path: string,
  normalize: (entry: unknown, entryPath: string) => string,
  options: { readonly required?: boolean } = {},
): readonly string[] {
  const values = array(value, path)
  if (options.required === true && values.length === 0) invalid(path)
  const seen = new Set<string>()
  const result = values.map((entry, index) => {
    const normalized = normalize(entry, `${path}[${String(index)}]`)
    if (seen.has(normalized)) invalid(`${path}[${String(index)}]`)
    seen.add(normalized)
    return normalized
  })
  return Object.freeze(result)
}

function promptFragments(value: unknown, path: string, required = false): readonly string[] {
  return uniqueStrings(
    value,
    path,
    (entry, entryPath) => text(entry, entryPath, ROLE_PROTOCOL_LIMITS.promptFragment, true),
    { required },
  )
}

export function normalizeRoleRef(value: unknown, path = 'roleRef'): RoleRef {
  const input = record(value, path, ROLE_REF_KEYS)
  return Object.freeze({
    id: identifier(input.id, `${path}.id`),
    version: version(input.version, `${path}.version`),
  })
}

export function isRoleRef(value: unknown): value is RoleRef {
  try {
    normalizeRoleRef(value)
    return true
  } catch {
    return false
  }
}

export function roleRefKey(value: RoleRef): string {
  const normalized = normalizeRoleRef(value)
  return `${normalized.id}@${normalized.version}`
}

function roleRefs(value: unknown, path: string): readonly RoleRef[] {
  const values = array(value, path)
  const seen = new Set<string>()
  const result = values.map((entry, index) => {
    const ref = normalizeRoleRef(entry, `${path}[${String(index)}]`)
    const key = `${ref.id}@${ref.version}`
    if (seen.has(key)) invalid(`${path}[${String(index)}]`)
    seen.add(key)
    return ref
  })
  return Object.freeze(result)
}

function requirements(value: unknown, path: string): CouncilRoleRequirements {
  const input = record(value, path, REQUIREMENT_KEYS)
  return Object.freeze({
    ...(input.roleRefs === undefined ? {} : { roleRefs: roleRefs(input.roleRefs, `${path}.roleRefs`) }),
    ...(input.artifactTypes === undefined
      ? {}
      : {
          artifactTypes: uniqueStrings(
            input.artifactTypes,
            `${path}.artifactTypes`,
            (entry, entryPath) => identifier(entry, entryPath),
          ),
        }),
  })
}

function metadata(value: unknown, path: string): CouncilRoleMetadata {
  const input = record(value, path, METADATA_KEYS)
  if (input.alpha24Role === undefined) return Object.freeze({})
  const alpha24 = record(input.alpha24Role, `${path}.alpha24Role`, ALPHA24_METADATA_KEYS)
  const order = alpha24.order
  if (
    typeof order !== 'number'
    || !Number.isSafeInteger(order)
    || order < 0
    || order > ROLE_PROTOCOL_LIMITS.compatibilityOrder
  ) invalid(`${path}.alpha24Role.order`)
  return Object.freeze({
    alpha24Role: Object.freeze({
      label: text(alpha24.label, `${path}.alpha24Role.label`, ROLE_PROTOCOL_LIMITS.label),
      order,
    }),
  })
}

function prompt(value: unknown, path: string): CouncilRolePrompt {
  const input = record(value, path, PROMPT_KEYS)
  const normalized = Object.freeze({
    identity: text(input.identity, `${path}.identity`, ROLE_PROTOCOL_LIMITS.promptFragment, true),
    objectives: promptFragments(input.objectives, `${path}.objectives`, true),
    mustCheck: promptFragments(input.mustCheck, `${path}.mustCheck`, true),
    mustNot: promptFragments(input.mustNot, `${path}.mustNot`, true),
    outputContract: promptFragments(input.outputContract, `${path}.outputContract`, true),
  })
  const total = normalized.identity.length
    + normalized.objectives.reduce((sum, entry) => sum + entry.length, 0)
    + normalized.mustCheck.reduce((sum, entry) => sum + entry.length, 0)
    + normalized.mustNot.reduce((sum, entry) => sum + entry.length, 0)
    + normalized.outputContract.reduce((sum, entry) => sum + entry.length, 0)
  if (total > ROLE_PROTOCOL_LIMITS.promptTotal) invalid(path)
  return normalized
}

function roleDefinition(value: unknown, path: string): CouncilRoleDefinition {
  const input = record(value, path, ROLE_DEFINITION_KEYS)
  const id = identifier(input.id, `${path}.id`)
  const namespace = identifier(input.namespace, `${path}.namespace`)
  const separator = id.lastIndexOf('.')
  if (separator <= 0 || id.slice(0, separator) !== namespace) invalid(`${path}.namespace`)
  if (input.kind !== 'cognitive' && input.kind !== 'domain') invalid(`${path}.kind`)
  const phasesInput = array(input.phases, `${path}.phases`)
  if (phasesInput.length === 0) invalid(`${path}.phases`)
  const phaseSet = new Set<CouncilRolePhase>()
  const phases = Object.freeze(phasesInput.map((entry, index) => {
    if (typeof entry !== 'string' || !ROLE_PHASES.has(entry as CouncilRolePhase)) {
      invalid(`${path}.phases[${String(index)}]`)
    }
    const phase = entry as CouncilRolePhase
    if (phaseSet.has(phase)) invalid(`${path}.phases[${String(index)}]`)
    phaseSet.add(phase)
    return phase
  }))
  return Object.freeze({
    id,
    version: version(input.version, `${path}.version`),
    namespace,
    kind: input.kind,
    label: text(input.label, `${path}.label`, ROLE_PROTOCOL_LIMITS.label),
    shortDescription: text(
      input.shortDescription,
      `${path}.shortDescription`,
      ROLE_PROTOCOL_LIMITS.shortDescription,
      true,
    ),
    capabilityTags: uniqueStrings(
      input.capabilityTags,
      `${path}.capabilityTags`,
      (entry, entryPath) => identifier(entry, entryPath),
      { required: true },
    ),
    ...(input.requiresHarnessCapabilities === undefined
      ? {}
      : {
          requiresHarnessCapabilities: uniqueStrings(
            input.requiresHarnessCapabilities,
            `${path}.requiresHarnessCapabilities`,
            (entry, entryPath) => identifier(entry, entryPath),
          ),
        }),
    ...(input.prefersModelCapabilities === undefined
      ? {}
      : {
          prefersModelCapabilities: uniqueStrings(
            input.prefersModelCapabilities,
            `${path}.prefersModelCapabilities`,
            (entry, entryPath) => identifier(entry, entryPath),
          ),
        }),
    ...(input.requires === undefined ? {} : { requires: requirements(input.requires, `${path}.requires`) }),
    ...(input.suggestedCognitiveRoles === undefined
      ? {}
      : {
          suggestedCognitiveRoles: uniqueStrings(
            input.suggestedCognitiveRoles,
            `${path}.suggestedCognitiveRoles`,
            (entry, entryPath) => identifier(entry, entryPath),
          ),
        }),
    phases,
    ...(input.metadata === undefined ? {} : { metadata: metadata(input.metadata, `${path}.metadata`) }),
    prompt: prompt(input.prompt, `${path}.prompt`),
  })
}

export function normalizeRoleContribution(value: unknown): RoleContribution {
  const input = record(value, 'contribution', CONTRIBUTION_KEYS)
  const rawRoles = array(input.roles, 'contribution.roles', ROLE_PROTOCOL_LIMITS.rolesPerContribution)
  if (rawRoles.length === 0) invalid('contribution.roles')
  const ids = new Set<string>()
  let promptTotal = 0
  const roles = Object.freeze(rawRoles.map((entry, index) => {
    const role = roleDefinition(entry, `contribution.roles[${String(index)}]`)
    if (ids.has(role.id)) invalid(`contribution.roles[${String(index)}].id`)
    ids.add(role.id)
    promptTotal += role.prompt.identity.length
      + role.prompt.objectives.reduce((sum, fragment) => sum + fragment.length, 0)
      + role.prompt.mustCheck.reduce((sum, fragment) => sum + fragment.length, 0)
      + role.prompt.mustNot.reduce((sum, fragment) => sum + fragment.length, 0)
      + role.prompt.outputContract.reduce((sum, fragment) => sum + fragment.length, 0)
    return role
  }))
  if (promptTotal > ROLE_PROTOCOL_LIMITS.contributionPromptTotal) invalid('contribution.roles')
  return Object.freeze({
    contributorId: identifier(input.contributorId, 'contribution.contributorId'),
    version: version(input.version, 'contribution.version'),
    roles,
  })
}

export function isRoleContribution(value: unknown): value is RoleContribution {
  try {
    normalizeRoleContribution(value)
    return true
  } catch {
    return false
  }
}
