// @harzva/dsh-role-registry —— 浏览器客户端模块（共享选角组件接入契约）。
//
// 这是 DSH `dsh.client` 模块：经 window.__ModuleLoader__ 以 id '@harzva/dsh-role-registry'
// 注册，使 GroupX / Supervisor 等浏览器客户端能 require('@harzva/dsh-role-registry') 解析到
// **同一份** picker 实现（不复制源码、不用子路径——ModuleLoader 只解析裸包名）。
//
// 注意：ModuleLoader 只解析「尾部 /client」后缀，`@harzva/dsh-role-registry/picker` 这类子路径
// 无法解析；因此消费方必须 require 裸包名 '@harzva/dsh-role-registry' 并从导出里取 picker API。
//
// 必须导出 apply + inject（可为空）以满足 Cordis 插件校验（registry.plugin 要求插件有 apply）。

export {
  roleRefOf,
  filterRoleDescriptors,
  distinctContributorIds,
  distinctCapabilityTags,
  distinctSpecialties,
  fetchRoles,
  mountRolePicker,
  DEFAULT_PICKER_QUERY,
  SPECIALTY_TAG_PREFIX,
} from './picker.js'

export {
  normalizeRoleRef,
  roleRefKey,
  isRoleRef,
  isRoleContribution,
  normalizeRoleContribution,
} from './normalize.js'

export { ROLES_API_PATH, ROLES_API_ROLES_PATH } from './types.js'

export const name = 'harzva-dsh-role-registry'

export const inject: readonly string[] = []

// 客户端插件 apply：仅作为浏览器 ModuleLoader 可解析的共享模块暴露 picker API，
// 不注册任何浏览器服务（roleRegistry 等由 Host bundle 的 apply 提供）。
// 保持 apply 存在以满足 Cordis 插件校验；什么都不做即可。
export function apply(): void {
  // no-op
}
