// @harzva/dsh-role-registry —— build: esbuild CLI transpile src/*.ts -> lib/*.js。
// 类型声明交给 package.json build 里的 tsc --emitDeclarationOnly。
// 使用项目内固定版本的 esbuild CLI，避免依赖其他工作区的工具链。
// 类型声明由 package.json scripts.build 追加 tsc。
import { execFileSync } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const esbuild = join(root, 'node_modules', '.bin', 'esbuild')
const entries = ['src/index.ts', 'src/types.ts', 'src/normalize.ts', 'src/registry.ts', 'src/picker.ts']

await rm(join(root, 'lib'), { recursive: true, force: true })
await mkdir(join(root, 'lib'), { recursive: true })

for (const entry of entries) {
  const outfile = join(root, 'lib', entry.replace('src/', '').replace(/\.ts$/, '.js'))
  await mkdir(dirname(outfile), { recursive: true })
  execFileSync(esbuild, [entry, '--outfile=' + outfile, '--format=esm', '--platform=node', '--target=node22'], {
    cwd: root,
    stdio: 'inherit',
  })
}

// 浏览器客户端模块：与 GroupX 客户端的 ModuleLoader 格式一致，注册 id '@harzva/dsh-role-registry'。
// 让本包成为一个 dsh.client 模块，使 GroupX / Supervisor 等浏览器客户端能
// require('@harzva/dsh-role-registry') 解析到同一份共享选角组件（不复制源码）。
// 消费方必须 require 裸包名——ModuleLoader 只解析尾部 /client，无法解析 /picker 子路径。
execFileSync(esbuild, [
  'src/client.ts',
  '--outfile=' + join(root, 'lib', 'client.js'),
  '--format=cjs', '--platform=browser', '--target=es2022', '--bundle',
  '--banner:js=window.__ModuleLoader__.load({ id: "@harzva/dsh-role-registry", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
  '--footer:js=return module.exports; } });',
], { cwd: root, stdio: 'inherit' })

process.stdout.write(`Built ${entries.length} runtime modules + 1 browser client bundle from src/.\n`)
