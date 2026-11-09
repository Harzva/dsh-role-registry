// @harzva/dsh-role-registry —— 共享选角组件纯逻辑测试。
// 证明：① roleRefOf 派生固定 { id, version }（与 registry.resolve 的键一致）；
// ② 按专业/能力/贡献来源/文本筛选；③ 框架无关，node 可导入（同一实现）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  roleRefOf,
  filterRoleDescriptors,
  distinctContributorIds,
  distinctCapabilityTags,
} from '../lib/picker.js'
import { createRoleRegistry } from '../lib/registry.js'
import { roleRefKey } from '../lib/normalize.js'

const cognitive = Object.freeze({
  contributorId: 'core.dsh-groupx',
  contributionVersion: '1',
  id: 'core.council.architect',
  version: '1',
  namespace: 'core.council',
  kind: 'cognitive',
  label: '架构师',
  shortDescription: '模块边界与接口设计',
  capabilityTags: ['design', 'architecture', 'refactor'],
  phases: ['proposal', 'synthesis'],
})
const domain = Object.freeze({
  contributorId: 'dsh-supervisor',
  contributionVersion: '0.2.4',
  id: 'dsh-supervisor.code',
  version: '1',
  namespace: 'dsh-supervisor',
  kind: 'domain',
  label: '代码学院',
  shortDescription: '代码实现监管',
  capabilityTags: ['supervisor', 'code', 'implementation'],
  phases: ['proposal', 'challenge', 'evaluation'],
})
const ROLES = Object.freeze([cognitive, domain])

test('roleRefOf derives a fixed { id, version } that matches registry.resolve keys', () => {
  const ref = roleRefOf(cognitive)
  assert.deepEqual(ref, { id: 'core.council.architect', version: '1' })
  assert.equal(roleRefKey(ref), 'core.council.architect@1')
  // 且该 ref 能在一份真实注册表中 resolve 到同一个角色定义。
  const registry = createRoleRegistry()
  const dispose = registry.register({
    contributorId: 'core.dsh-groupx',
    version: '1',
    roles: [{
      id: 'core.council.architect',
      version: '1',
      namespace: 'core.council',
      kind: 'cognitive',
      label: '架构师',
      shortDescription: '模块边界与接口设计',
      capabilityTags: ['design', 'architecture', 'refactor'],
      phases: ['proposal', 'synthesis'],
      prompt: { identity: 'x', objectives: ['y'], mustCheck: ['z'], mustNot: ['n'], outputContract: ['o'] },
    }],
  })
  assert.equal(registry.resolve(ref)?.label, '架构师')
  dispose()
  // 卸载后该 ref resolve 不到（fail-closed 的依据）。
  assert.equal(registry.resolve(ref), undefined)
})

test('filterRoleDescriptors filters by kind (专业)', () => {
  assert.deepEqual(filterRoleDescriptors(ROLES, { kind: 'domain' }).map(r => r.id), ['dsh-supervisor.code'])
  assert.deepEqual(filterRoleDescriptors(ROLES, { kind: 'cognitive' }).map(r => r.id), ['core.council.architect'])
})

test('filterRoleDescriptors filters by capabilityTags (能力, AND 语义)', () => {
  assert.deepEqual(filterRoleDescriptors(ROLES, { capabilityTags: ['code'] }).map(r => r.id), ['dsh-supervisor.code'])
  assert.deepEqual(filterRoleDescriptors(ROLES, { capabilityTags: ['code', 'supervisor'] }).map(r => r.id), ['dsh-supervisor.code'])
  assert.deepEqual(filterRoleDescriptors(ROLES, { capabilityTags: ['code', 'design'] }).map(r => r.id), [])
})

test('filterRoleDescriptors filters by contributorId (贡献来源)', () => {
  assert.deepEqual(filterRoleDescriptors(ROLES, { contributorId: 'dsh-supervisor' }).map(r => r.id), ['dsh-supervisor.code'])
  assert.deepEqual(filterRoleDescriptors(ROLES, { contributorId: 'core.dsh-groupx' }).map(r => r.id), ['core.council.architect'])
})

test('filterRoleDescriptors filters by text query and preserves order', () => {
  assert.deepEqual(filterRoleDescriptors(ROLES, { query: '代码' }).map(r => r.id), ['dsh-supervisor.code'])
  assert.deepEqual(filterRoleDescriptors(ROLES, { query: '架构' }).map(r => r.id), ['core.council.architect'])
  assert.deepEqual(filterRoleDescriptors(ROLES, {}).map(r => r.id), ['core.council.architect', 'dsh-supervisor.code'])
})

test('distinctContributorIds / distinctCapabilityTags are stable and de-duplicated', () => {
  assert.deepEqual(distinctContributorIds(ROLES), ['core.dsh-groupx', 'dsh-supervisor'])
  const tags = distinctCapabilityTags(ROLES)
  assert.equal(new Set(tags).size, tags.length)
  assert.ok(tags.includes('code'))
  assert.ok(tags.includes('design'))
})

test('specialty is independent from kind and execution capability', async () => {
  const { distinctSpecialties } = await import('../lib/picker.js')
  const specialized = [
    { ...cognitive, capabilityTags: [...cognitive.capabilityTags, 'specialty.engineering'] },
    { ...domain, capabilityTags: [...domain.capabilityTags, 'specialty.engineering'] },
  ]
  assert.equal(filterRoleDescriptors(specialized, { specialty: 'engineering' }).length, 2)
  assert.deepEqual(filterRoleDescriptors(specialized, { specialty: 'engineering', kind: 'domain' }).map(r => r.id), [domain.id])
  assert.deepEqual(distinctSpecialties(specialized), ['engineering'])
  assert.ok(!distinctCapabilityTags(specialized).includes('specialty.engineering'))
})

test('fetchRoles bounds hanging requests and rejects malformed descriptors', async () => {
  const { fetchRoles } = await import('../lib/picker.js')
  const originalFetch = globalThis.fetch
  try {
    let signal
    globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
      signal = options.signal
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    })
    const response = await fetchRoles('', { timeoutMs: 20 })
    assert.equal(response.ok, false)
    assert.equal(signal.aborted, true)
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, roles: [{}] }) })
    assert.equal((await fetchRoles()).error, 'bad-response')
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, roles: [] }) })
    assert.deepEqual((await fetchRoles()).roles, [])
  } finally { globalThis.fetch = originalFetch }
})
