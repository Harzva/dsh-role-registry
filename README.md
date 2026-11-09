# @harzva/dsh-role-registry

中立角色库插件：提供**纯机制**（角色定义类型 + `createRoleRegistry()` + 归一化纯函数），**不预置任何角色**。

任何 provider（GroupX、supervisor、未来三方）通过 `ctx.get('roleRegistry')` 注册/召集角色。角色内容由各 provider 在启动时注册，机制与内容严格分离。

## 用法

```ts
// 注册：GroupX 注册 9 认知角色，supervisor 注册 5 领域学院
const registry = ctx.get('roleRegistry')
const dispose = registry.register({
  contributorId: 'dsh-supervisor',
  version: '1',
  roles: [{ id: 'dsh-supervisor.strategy', namespace: 'dsh-supervisor', kind: 'domain', ... }],
})
// 卸载
dispose()

// 取用
const role = registry.resolve({ id: 'dsh-supervisor.strategy', version: '1' })
const all = registry.snapshot()
```

## 服务 key

- `'roleRegistry'` —— 标准中立 key。
- `'groupxRoleRegistry'` —— GroupX 兼容别名，指向**同一实例**（`index.apply` 同时 provide 二者）。

## 模块

- `src/types.ts` —— 角色契约（`RoleKind='cognitive'|'domain'`、`CouncilRoleDefinition`、`RoleContribution`、`RoleRef`、`PublicRoleDescriptor`、`RoleRegistry` 接口）。纯，0 依赖。
- `src/normalize.ts` —— 归一化/校验纯函数（`normalizeRoleContribution`、`normalizeRoleRef`、`roleRefKey`、`containsSensitiveRoleText`）。
- `src/registry.ts` —— `createRoleRegistry()`（`register`/`resolve`/`snapshot`，无预置角色）。
- `src/index.ts` —— re-export + `apply` 提供 `'roleRegistry'`/`'groupxRoleRegistry'`。
- `src/picker.ts` —— **共享选角组件**（`@harzva/dsh-role-registry/picker`，未来插件接入契约）。

## 共享选角组件（`@harzva/dsh-role-registry/picker`）

提供给多个消费者（GroupX、Supervisor、未来插件）**同一份**选角实现，按专业/能力/贡献来源筛选并与展示（`/dsh-roles/api/roles`）同源。框架无关 ESM：纯筛选/选择逻辑可在 Node 导入；`mountRolePicker` 仅在浏览器挂载 DOM。

导出（标准接入契约）：

- `roleRefOf(descriptor) → { id, version }`：派生固定引用，不能只保存名称或自动升级版本。
- `filterRoleDescriptors(roles, { kind?, specialty?, capabilityTags?, contributorId?, query? })`：类别、专业、能力、来源和文本为独立维度。
- `distinctContributorIds` / `distinctCapabilityTags` / `distinctSpecialties`：生成筛选选项。
- `fetchRoles(baseUrl = '', { signal?, timeoutMs? } = {})`：读取中立 API；默认同源、8 秒超时，区分空列表与读取失败。
- `mountRolePicker(root, options)`：默认读取中立 API，也可传入 `roles`；仅浏览器调用。
- `options.onSelect(ref, descriptor?)`：选中时给出精确引用和实际点击的公共描述符；清除时 ref 为 null。消费者只持久化引用。
- `options.roleKind`：可约束认知或领域类型，用户改筛选或刷新也不会扩大范围；普通 `filters.kind` 则允许用户调整。
- controller：`destroy`、`getSelection`、`setSelection`、`setFilters`、`setEnabled`、`setRoles`、`refresh`。销毁会取消请求；保存失败用 `setSelection` 恢复先前引用，保存/执行期间用 `setEnabled(false)` 锁定。

专业使用开放的 ASCII capability tag 协议，例如 `specialty.engineering`、`specialty.research`、`specialty.strategy`。专业标签从能力按钮中分离出来，不把 cognitive/domain 当专业；贡献方声明自己的标签，中立包不内置专业角色内容。

### 浏览器接入方式

- **有 bundler 的插件**：从 `@harzva/dsh-role-registry/picker` 导入并打进自己的浏览器 bundle（GroupX 使用此方式）。
- **DSH ModuleLoader 插件**：中立包必须作为 bundle 装载，宿主会发现其 `dsh.client` 和 `./client` 并注册浏览器模块；在 factory 内使用 `require('@harzva/dsh-role-registry')`，客户端元数据 `dsh.client.external` 声明该包的装载顺序（Supervisor 使用此方式）。ModuleLoader 不解析 `/picker` 子路径，Node exports 不能代替客户端模块注册。

两条方式复用相同 `src/picker.ts` 实现，不复制源码。显示面板和所有选择器都读 `GET /dsh-roles/api/roles`。公共描述符不含 prompt；执行时在服务端解析准确引用，冻结定义、绑定调用方的模型/权限/预算，再记录实际使用的引用与定义。

### 新增一个角色贡献插件

```ts
export const inject = ['roleRegistry']
export function apply(ctx) {
  const registry = ctx.get('roleRegistry')
  const dispose = registry.register({
    contributorId: 'examples.experts',
    version: '1',
    roles: [{
      id: 'examples.quality', version: '1', namespace: 'examples', kind: 'domain',
      label: '质量专家', shortDescription: '核对交付证据与验收条件。',
      capabilityTags: ['specialty.engineering', 'testing', 'verification'],
      phases: ['proposal', 'challenge', 'evaluation'],
      prompt: {
        identity: '你是负责交付验收的质量专家。',
        objectives: ['指出可复现的问题与验收结果。'],
        mustCheck: ['核对证据是否直接支持完成声明。'],
        mustNot: ['不要把计划或未运行的测试当作完成证据。'],
        outputContract: ['输出结论、证据、待修项。'],
      },
    }],
  })
  ctx.effect(() => dispose, 'examples: shared expert contribution')
}
```

只注册一次，所有消费者即可查询；卸载该贡献插件会移除它自己的角色。已保存引用保持原值并显示不可用，新执行必须拒绝该引用；已开始运行和历史记录使用已冻结定义。默认/旧会话第一次迁移同样应固定并保存引用，不可在来源变化时静默重新选角。

## 构建 / 测试

```sh
node scripts/build.mjs   # esbuild src/*.ts -> lib/*.js
node --test              # 单测
```

## Install in DSH

Install this registry before its consumer in the same web profile:

```sh
dsh plugin --profile web add https://github.com/Harzva/dsh-role-registry/archive/refs/tags/v0.1.0-alpha.1.tar.gz
```

This GitHub source archive contains the built client and Host modules; no npm
publication is required. `private: true` prevents accidental npm publication.

## Build, test, and install

Requires Node.js 22.19 or later in the 22.x series, or Node.js 24 or later. From a source checkout, install the pinned
build tools and produce an installable tarball:

```sh
npm ci
npm run build
npm run check
npm pack
# Replace the path below with the tarball produced by npm pack.
dsh plugin --profile web add ./harzva-dsh-role-registry-0.1.0-alpha.1.tgz
```

Load this bundle before consumers such as Supervisor or GroupX. The registry
is initially empty; a consumer must contribute roles before they can be
selected. Reinstalling an updated bundle requires restarting the DSH profile.

## License

Apache License 2.0. See [LICENSE](LICENSE).
