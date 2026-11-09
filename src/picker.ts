// Shared, framework-independent role picker. Professional specialties use the
// existing public capability tag protocol: specialty.<name>. The neutral package
// supplies no role content and does not infer a profession from cognitive/domain.
import { normalizeRoleRef, roleRefKey, isRoleRef } from './normalize.js'
import { ROLES_API_ROLES_PATH, type PublicRoleDescriptor, type RoleRef } from './types.js'

export type RolePickerKind = PublicRoleDescriptor['kind']
export interface RolePickerFilters {
  readonly kind?: RolePickerKind
  readonly specialty?: string
  readonly capabilityTags?: readonly string[]
  readonly contributorId?: string
  readonly query?: string
}
export const DEFAULT_PICKER_QUERY = ''
export const SPECIALTY_TAG_PREFIX = 'specialty.'
export interface PickerFetchResult {
  readonly ok: boolean
  readonly roles: readonly PublicRoleDescriptor[]
  readonly error?: string
}
export interface RolePickerController {
  destroy(): void
  getSelection(): RoleRef | null
  setSelection(ref: RoleRef | null): void
  setFilters(filters: RolePickerFilters): void
  setEnabled(enabled: boolean): void
  setRoles(roles: readonly PublicRoleDescriptor[]): void
  refresh(): Promise<void>
}
export interface MountRolePickerOptions {
  readonly roles?: readonly PublicRoleDescriptor[]
  readonly baseUrl?: string
  readonly filters?: RolePickerFilters
  /** Consumer constraint; unlike a user filter it cannot be widened by the UI. */
  readonly roleKind?: RolePickerKind
  readonly initialRef?: RoleRef | null
  readonly title?: string
  readonly emptyText?: string
  readonly onSelect: (ref: RoleRef | null, role?: PublicRoleDescriptor) => void
}
export function roleRefOf(role: PublicRoleDescriptor): RoleRef {
  return Object.freeze(normalizeRoleRef({ id: role.id, version: role.version }))
}
function normalizeTags(value: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...new Set((value ?? []).filter(tag => typeof tag === 'string').map(tag => tag.trim()).filter(Boolean))])
}
export function filterRoleDescriptors(roles: readonly PublicRoleDescriptor[], filters: RolePickerFilters = {}): readonly PublicRoleDescriptor[] {
  const tags = normalizeTags(filters.capabilityTags)
  const query = (filters.query ?? '').trim().toLocaleLowerCase()
  return Object.freeze(roles.filter(role => {
    if (filters.kind && role.kind !== filters.kind) return false
    if (filters.specialty && !role.capabilityTags.includes(SPECIALTY_TAG_PREFIX + filters.specialty)) return false
    if (filters.contributorId && role.contributorId !== filters.contributorId.trim()) return false
    if (!tags.every(tag => role.capabilityTags.includes(tag))) return false
    return !query || [role.id, role.label, role.shortDescription, role.namespace, role.contributorId, ...role.capabilityTags]
      .join('\n').toLocaleLowerCase().includes(query)
  }))
}
export function distinctContributorIds(roles: readonly PublicRoleDescriptor[]): readonly string[] {
  return Object.freeze([...new Set(roles.map(role => role.contributorId).filter(Boolean))])
}
export function distinctSpecialties(roles: readonly PublicRoleDescriptor[]): readonly string[] {
  return Object.freeze([...new Set(roles.flatMap(role => role.capabilityTags)
    .filter(tag => tag.startsWith(SPECIALTY_TAG_PREFIX) && tag.length > SPECIALTY_TAG_PREFIX.length)
    .map(tag => tag.slice(SPECIALTY_TAG_PREFIX.length)))].sort())
}
export function distinctCapabilityTags(roles: readonly PublicRoleDescriptor[]): readonly string[] {
  const counts = new Map<string, number>()
  for (const role of roles) for (const tag of role.capabilityTags) {
    if (!tag.startsWith(SPECIALTY_TAG_PREFIX)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return Object.freeze([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag))
}
function validDescriptor(value: unknown): value is PublicRoleDescriptor {
  if (!value || typeof value !== 'object') return false
  const role = value as PublicRoleDescriptor
  return isRoleRef({ id: role.id, version: role.version })
    && (role.kind === 'domain' || role.kind === 'cognitive')
    && ['label', 'shortDescription', 'namespace', 'contributorId', 'contributionVersion'].every(key => typeof (role as unknown as Record<string, unknown>)[key] === 'string')
    && Array.isArray(role.capabilityTags) && role.capabilityTags.every(tag => typeof tag === 'string')
}
export async function fetchRoles(baseUrl = '', options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<PickerFetchResult> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) abort()
  else options.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, options.timeoutMs ?? 8000)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${ROLES_API_ROLES_PATH}`, {
      headers: { accept: 'application/json' }, cache: 'no-store', signal: controller.signal,
    })
    if (!response.ok) return { ok: false, roles: [], error: `http-${response.status}` }
    const body = await response.json() as { ok?: boolean; roles?: unknown[] }
    if (body?.ok !== true || !Array.isArray(body.roles) || !body.roles.every(validDescriptor)) {
      return { ok: false, roles: [], error: 'bad-response' }
    }
    return { ok: true, roles: Object.freeze(body.roles) }
  } catch (error) {
    return { ok: false, roles: [], error: controller.signal.aborted ? 'request-aborted' : String((error as Error)?.message ?? error) }
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}
function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag)
  result.className = className
  if (text !== undefined) result.textContent = text
  return result
}
function option(value: string, label: string): HTMLOptionElement {
  const result = node('option', '', label); result.value = value; return result
}
export function mountRolePicker(root: HTMLElement, options: MountRolePickerOptions): RolePickerController {
  const allowed = (items: readonly PublicRoleDescriptor[]) => options.roleKind
    ? items.filter(role => role.kind === options.roleKind) : items
  let roles = allowed(options.roles ?? [])
  let filters: RolePickerFilters = { ...options.filters, ...(options.roleKind ? { kind: options.roleKind } : {}) }
  let selection = options.initialRef && isRoleRef(options.initialRef) ? roleRefOf(options.initialRef as PublicRoleDescriptor) : null
  let enabled = true, destroyed = false, loading = false, loaded = options.roles !== undefined
  let error = '', requestToken = 0
  let request: AbortController | undefined
  const container = node('div', 'dshRolePicker')
  const style = node('style', '')
  style.textContent = '.dshRolePicker{font:inherit;min-width:0}.dshRolePickerControls,.dshRolePickerTags,.dshRolePickerFooter{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}.dshRolePickerControls select,.dshRolePickerControls input,.dshRolePicker button{font:inherit;padding:6px 8px;border:1px solid #94a3b866;border-radius:6px;background:transparent;color:inherit}.dshRolePickerQuery{min-width:100px;flex:1}.dshRolePickerList{display:grid;gap:6px;max-height:320px;overflow:auto}.dshRolePickerCard{display:flex;align-items:start;gap:8px;text-align:left;cursor:pointer}.dshRolePickerCardMain{display:flex;flex:1;min-width:0;flex-direction:column;overflow-wrap:anywhere}.dshRolePickerCardMain small{opacity:.75}.dshRolePicker [aria-pressed=true]{background:#3b82f622;border-color:#3b82f6}.dshRolePickerError,.dshRolePickerUnavailable{color:#b45309}.dshRolePicker button:disabled{opacity:.5;cursor:default}.dshRolePickerTagChip{font-size:12px!important}.dshRolePickerSummary{flex:1;overflow-wrap:anywhere}'
  container.append(style)
  if (options.title) container.append(node('strong', 'dshRolePickerTitle', options.title))
  const controls = node('div', 'dshRolePickerControls')
  function selectControl(className: string, label: string): HTMLSelectElement {
    const select = node('select', className); select.setAttribute('aria-label', label); controls.append(select); return select
  }
  const kind = selectControl('dshRolePickerKind', '按角色类别筛选')
  kind.append(option('', '全部类别'), option('cognitive', '认知'), option('domain', '领域'))
  const specialty = selectControl('dshRolePickerSpecialty', '按专业筛选')
  const contributor = selectControl('dshRolePickerContributor', '按贡献来源筛选')
  const query = node('input', 'dshRolePickerQuery')
  query.type = 'search'; query.placeholder = '搜索角色/能力'; query.setAttribute('aria-label', '搜索角色/能力'); controls.append(query)
  container.append(controls)
  const tags = node('div', 'dshRolePickerTags'); container.append(tags)
  const status = node('p', 'dshRolePickerStatus'); status.setAttribute('role', 'status'); container.append(status)
  const list = node('div', 'dshRolePickerList'); container.append(list)
  const footer = node('div', 'dshRolePickerFooter')
  const summary = node('span', 'dshRolePickerSummary'); footer.append(summary)
  const clear = node('button', 'dshRolePickerClear', '清除'); clear.type = 'button'; footer.append(clear)
  const refresh = node('button', 'dshRolePickerRefresh', '刷新角色'); refresh.type = 'button'; footer.append(refresh)
  container.append(footer)
  root.replaceChildren(container)

  function renderResults(): void {
    if (destroyed) return
    const visible = filterRoleDescriptors(roles, filters)
    const cards = visible.map(role => {
      const ref = roleRefOf(role)
      const selected = selection !== null && roleRefKey(selection) === roleRefKey(ref)
      const card = node('button', 'dshRolePickerCard' + (selected ? ' is-selected' : ''))
      card.type = 'button'; card.disabled = !enabled || loading || !!error
      card.dataset.roleId = role.id; card.dataset.roleVersion = role.version; card.dataset.contributor = role.contributorId
      card.setAttribute('aria-pressed', String(selected))
      card.append(node('span', 'dshRolePickerCardKind', role.kind === 'domain' ? '领域' : '认知'))
      const main = node('span', 'dshRolePickerCardMain'); main.append(node('b', '', role.label), node('small', '', `${role.id} · v${role.version} · ${role.contributorId}`), node('small', '', role.shortDescription)); card.append(main)
      card.addEventListener('click', () => {
        selection = selection !== null && roleRefKey(selection) === roleRefKey(ref) ? null : ref
        renderResults(); options.onSelect(selection, selection === null ? undefined : role)
      })
      return card
    })
    list.replaceChildren(...cards)
    if (!cards.length && loaded && !loading && !error) list.append(node('p', 'dshRolePickerEmpty', options.emptyText ?? '没有匹配的角色。'))
    status.textContent = loading ? '正在载入角色库…' : error ? `角色库读取失败：${error}，请刷新重试。` : ''
    status.className = error ? 'dshRolePickerStatus dshRolePickerError' : 'dshRolePickerStatus'
    const missing = loaded && !error && selection !== null && !roles.some(role => roleRefKey(roleRefOf(role)) === roleRefKey(selection!))
    summary.textContent = selection ? `${missing ? '不可用：角色来源或版本已移除；保留原选择' : error ? '待确认可用性' : '已选'}：${selection.id}@${selection.version}` : '未选择角色'
    summary.className = 'dshRolePickerSummary' + (missing ? ' dshRolePickerUnavailable' : '')
    clear.disabled = !enabled || selection === null
    refresh.disabled = !enabled || loading
    for (const chip of Array.from(tags.querySelectorAll<HTMLButtonElement>('button'))) {
      chip.setAttribute('aria-pressed', String((filters.capabilityTags ?? []).includes(chip.dataset.tag!)))
      chip.disabled = !enabled
    }
  }
  function syncControls(): void {
    // Keep the controls themselves mounted so typing/composition and focus survive.
    kind.value = filters.kind ?? ''
    const specialties = distinctSpecialties(roles)
    specialty.replaceChildren(option('', '全部专业'), ...specialties.map(value => option(value, value)))
    specialty.value = filters.specialty ?? ''
    contributor.replaceChildren(option('', '全部来源'), ...distinctContributorIds(roles).map(value => option(value, value)))
    contributor.value = filters.contributorId ?? ''
    if (query.value !== (filters.query ?? '')) query.value = filters.query ?? ''
    for (const control of [kind, specialty, contributor, query]) control.disabled = !enabled
    kind.disabled = !enabled || options.roleKind !== undefined
    tags.replaceChildren(...distinctCapabilityTags(roles).map(tag => {
      const chip = node('button', 'dshRolePickerTagChip', tag); chip.type = 'button'; chip.dataset.tag = tag
      chip.addEventListener('click', () => {
        const next = new Set(filters.capabilityTags ?? [])
        if (next.has(tag)) next.delete(tag); else next.add(tag)
        filters = { ...filters, capabilityTags: [...next] }; renderResults()
      })
      return chip
    }))
    renderResults()
  }
  kind.addEventListener('change', () => { filters = { ...filters, kind: (kind.value || undefined) as RolePickerKind | undefined }; renderResults() })
  specialty.addEventListener('change', () => { filters = { ...filters, specialty: specialty.value || undefined }; renderResults() })
  contributor.addEventListener('change', () => { filters = { ...filters, contributorId: contributor.value || undefined }; renderResults() })
  query.addEventListener('input', () => { filters = { ...filters, query: query.value }; renderResults() })
  clear.addEventListener('click', () => { selection = null; renderResults(); options.onSelect(null) })
  const controller: RolePickerController = {
    destroy() { destroyed = true; requestToken++; request?.abort(); container.remove() },
    getSelection() { return selection === null ? null : { ...selection } },
    setSelection(ref) { selection = ref === null ? null : Object.freeze(normalizeRoleRef(ref)); renderResults() },
    setFilters(next) { filters = { ...next, ...(options.roleKind ? { kind: options.roleKind } : {}) }; syncControls() },
    setEnabled(next) { enabled = next; syncControls() },
    setRoles(next) { requestToken++; request?.abort(); roles = allowed(next); loaded = true; loading = false; error = ''; syncControls() },
    async refresh() {
      if (destroyed) return
      request?.abort(); request = new AbortController(); const token = ++requestToken
      loading = true; error = ''; renderResults()
      const fetched = await fetchRoles(options.baseUrl ?? '', { signal: request.signal })
      if (destroyed || token !== requestToken) return
      loading = false
      if (fetched.ok) { roles = allowed(fetched.roles); loaded = true; error = '' } else error = fetched.error ?? 'unknown'
      syncControls()
    },
  }
  refresh.addEventListener('click', () => { void controller.refresh() })
  syncControls()
  if (options.roles === undefined) void controller.refresh()
  return controller
}
