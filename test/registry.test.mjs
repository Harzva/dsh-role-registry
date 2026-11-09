import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoleRegistry } from '../lib/registry.js'
import {
  normalizeRoleContribution,
  normalizeRoleRef,
  roleRefKey,
} from '../lib/normalize.js'

function role(id, namespace, kind = 'domain') {
  // 校验要求 id 以 namespace 为前缀：id 必须形如 `<namespace>.<name>`。
  const qualified = id.includes('.') ? id : `${namespace}.${id}`
  return {
    id: qualified,
    version: '1',
    namespace,
    kind,
    label: id,
    shortDescription: `${id} 领域监督`,
    capabilityTags: ['supervisor', 'domain'],
    phases: ['proposal', 'challenge', 'evaluation', 'synthesis'],
    prompt: {
      identity: `你是「${id}」。`,
      objectives: ['给出可执行建议。'],
      mustCheck: ['基于领域视角。'],
      mustNot: ['不要解释过度。'],
      outputContract: ['一句不超过80字的中文总结性建议。'],
    },
  }
}

test('neutral registry starts empty (no preset roles)', () => {
  const r = createRoleRegistry()
  assert.deepEqual(r.snapshot(), [])
})

test('register + snapshot + resolve roundtrip', () => {
  const r = createRoleRegistry()
  const dispose = r.register({
    contributorId: 'dsh-supervisor',
    version: '1',
    roles: [role('strategy', 'dsh-supervisor'), role('code', 'dsh-supervisor')],
  })
  const snap = r.snapshot()
  assert.equal(snap.length, 2)
  assert.deepEqual(snap.map(x => x.id).sort(), ['dsh-supervisor.code', 'dsh-supervisor.strategy'])
  const resolved = r.resolve({ id: 'dsh-supervisor.strategy', version: '1' })
  assert.equal(resolved?.label, 'strategy')
  assert.equal(r.resolve({ id: 'dsh-supervisor.strategy', version: '9' }), undefined)
  // dispose 后移除
  dispose()
  assert.equal(r.snapshot().length, 0)
})

test('reserved-core namespace is reserved to its owner', () => {
  const r = createRoleRegistry()
  // 非 core-owner 的贡献者占用 core.* 命名空间 → 拒绝。
  assert.throws(() => r.register({
    contributorId: 'dsh-supervisor',
    version: '1',
    roles: [{ id: 'core.council.chair', version: '1', namespace: 'core.council', kind: 'cognitive', label: 'chair', shortDescription: 'chair', capabilityTags: ['core'], phases: ['proposal'], prompt: { identity: 'x', objectives: ['a'], mustCheck: ['a'], mustNot: ['a'], outputContract: ['a'] } }],
  }), /reserved-core-role-namespace/)
  // 裸 `core` 不是合法贡献者 id → 拒绝。
  assert.throws(() => r.register({
    contributorId: 'core', version: '1',
    roles: [{ id: 'core.council.chair', version: '1', namespace: 'core.council', kind: 'cognitive', label: 'chair', shortDescription: 'chair', capabilityTags: ['core'], phases: ['proposal'], prompt: { identity: 'x', objectives: ['a'], mustCheck: ['a'], mustNot: ['a'], outputContract: ['a'] } }],
  }), /reserved-core-role-namespace/)
})

test('core owner (groupx) may register its reserved cognitive roles', () => {
  const r = createRoleRegistry()
  const dispose = r.register({
    contributorId: 'core.dsh-groupx',
    version: '1',
    roles: [{ id: 'core.council.chair', version: '1', namespace: 'core.council', kind: 'cognitive', label: 'chair', shortDescription: 'chair', capabilityTags: ['core'], phases: ['proposal'], prompt: { identity: 'x', objectives: ['a'], mustCheck: ['a'], mustNot: ['a'], outputContract: ['a'] } }],
  })
  const snap = r.snapshot()
  assert.equal(snap.length, 1)
  assert.equal(snap[0].id, 'core.council.chair')
  assert.equal(snap[0].contributorId, 'core.dsh-groupx')
  dispose()
  assert.equal(r.snapshot().length, 0)
})

test('namespace-owner mismatch is rejected', () => {
  const r = createRoleRegistry()
  assert.throws(() => r.register({
    contributorId: 'dsh-supervisor',
    version: '1',
    roles: [role('other.x', 'other')],
  }), /role-namespace-owner-mismatch/)
})

test('duplicate contributor is rejected', () => {
  const r = createRoleRegistry()
  r.register({ contributorId: 'dsh-supervisor', version: '1', roles: [role('strategy', 'dsh-supervisor')] })
  assert.throws(() => r.register({
    contributorId: 'dsh-supervisor', version: '2', roles: [role('code', 'dsh-supervisor')],
  }), /duplicate-role-contributor/)
})

test('normalize pure functions keep invariants', () => {
  assert.equal(normalizeRoleRef({ id: 'a.b', version: '1' }).id, 'a.b')
  assert.throws(() => normalizeRoleRef({ id: 'Bad', version: '1' }))
  assert.equal(roleRefKey({ id: 'a.b', version: '1' }), 'a.b@1')
  // contribution normalize requires non-empty roles.
  assert.throws(() => normalizeRoleContribution({ contributorId: 'x', version: '1', roles: [] }))
})

test('groupxRoleRegistry alias points to the same instance (index apply)', async () => {
  const { apply, ROLE_REGISTRY_SERVICE, GROUPX_ROLE_REGISTRY_SERVICE } = await import('../lib/index.js')
  const provides = {}
  apply({ provide: (name, value) => { provides[name] = value } })
  assert.ok(provides[ROLE_REGISTRY_SERVICE])
  assert.equal(provides[GROUPX_ROLE_REGISTRY_SERVICE], provides[ROLE_REGISTRY_SERVICE])
})
