// @harzva/dsh-role-registry —— 浏览器客户端模块注册（issue-1 FIX-A）测试。
// 证明：本包作为 dsh.client 模块，经 window.__ModuleLoader__ 以 id '@harzva/dsh-role-registry'
// 注册，且 factory 导出共享选角 API + apply/inject（满足 Cordis 插件校验），
// 使 GroupX / Supervisor 浏览器客户端能 require('@harzva/dsh-role-registry') 解析到同一实现。
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('neutral client bundle registers as @harzva/dsh-role-registry and exposes the shared picker API', async () => {
  let capturedId = null
  let capturedFactory = null
  const originalWindow = globalThis.window
  globalThis.window = {
    __ModuleLoader__: {
      load(registration) {
        capturedId = registration.id
        capturedFactory = registration.factory
      },
    },
  }
  try {
    await import('../lib/client.js')
    assert.equal(capturedId, '@harzva/dsh-role-registry', 'bundle must self-register under the bare package id')
    assert.equal(typeof capturedFactory, 'function')

    // 自包含 bundle：factory 不应需要任何外部 require。
    // 若意外 require 外部模块，用抛错 stub 立即暴露。
    const exportsOf = capturedFactory((spec) => { throw new Error('unexpected external require: ' + String(spec)) })
    assert.equal(typeof exportsOf.mountRolePicker, 'function')
    assert.equal(typeof exportsOf.fetchRoles, 'function')
    assert.equal(typeof exportsOf.roleRefOf, 'function')
    assert.equal(typeof exportsOf.filterRoleDescriptors, 'function')
    assert.equal(typeof exportsOf.distinctContributorIds, 'function')
    assert.equal(typeof exportsOf.distinctCapabilityTags, 'function')
    assert.equal(typeof exportsOf.distinctSpecialties, 'function')
    // apply/inject 必须存在，否则 Cordis 会拒绝将其作为插件注册。
    assert.equal(typeof exportsOf.apply, 'function', 'client module must export apply for Cordis plugin validity')
    assert.ok(Array.isArray(exportsOf.inject), 'client module must export inject (even empty)')
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

test('package.json declares ./client export + dsh.client.platform=web (host auto-registers the module)', async () => {
  // resolveMeta 判定 dsh.client 模块的两个条件：exports["./client"] 存在 + dsh.client.platform==='web'。
  const pkg = JSON.parse((await import('node:fs')).readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.exports['./client'].default, './lib/client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
})
