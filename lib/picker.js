import { normalizeRoleRef, roleRefKey, isRoleRef } from "./normalize.js";
import { ROLES_API_ROLES_PATH } from "./types.js";
const DEFAULT_PICKER_QUERY = "";
const SPECIALTY_TAG_PREFIX = "specialty.";
function roleRefOf(role) {
  return Object.freeze(normalizeRoleRef({ id: role.id, version: role.version }));
}
function normalizeTags(value) {
  return Object.freeze([...new Set((value ?? []).filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))]);
}
function filterRoleDescriptors(roles, filters = {}) {
  const tags = normalizeTags(filters.capabilityTags);
  const query = (filters.query ?? "").trim().toLocaleLowerCase();
  return Object.freeze(roles.filter((role) => {
    if (filters.kind && role.kind !== filters.kind) return false;
    if (filters.specialty && !role.capabilityTags.includes(SPECIALTY_TAG_PREFIX + filters.specialty)) return false;
    if (filters.contributorId && role.contributorId !== filters.contributorId.trim()) return false;
    if (!tags.every((tag) => role.capabilityTags.includes(tag))) return false;
    return !query || [role.id, role.label, role.shortDescription, role.namespace, role.contributorId, ...role.capabilityTags].join("\n").toLocaleLowerCase().includes(query);
  }));
}
function distinctContributorIds(roles) {
  return Object.freeze([...new Set(roles.map((role) => role.contributorId).filter(Boolean))]);
}
function distinctSpecialties(roles) {
  return Object.freeze([...new Set(roles.flatMap((role) => role.capabilityTags).filter((tag) => tag.startsWith(SPECIALTY_TAG_PREFIX) && tag.length > SPECIALTY_TAG_PREFIX.length).map((tag) => tag.slice(SPECIALTY_TAG_PREFIX.length)))].sort());
}
function distinctCapabilityTags(roles) {
  const counts = /* @__PURE__ */ new Map();
  for (const role of roles) for (const tag of role.capabilityTags) {
    if (!tag.startsWith(SPECIALTY_TAG_PREFIX)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Object.freeze([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag));
}
function validDescriptor(value) {
  if (!value || typeof value !== "object") return false;
  const role = value;
  return isRoleRef({ id: role.id, version: role.version }) && (role.kind === "domain" || role.kind === "cognitive") && ["label", "shortDescription", "namespace", "contributorId", "contributionVersion"].every((key) => typeof role[key] === "string") && Array.isArray(role.capabilityTags) && role.capabilityTags.every((tag) => typeof tag === "string");
}
async function fetchRoles(baseUrl = "", options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, options.timeoutMs ?? 8e3);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${ROLES_API_ROLES_PATH}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) return { ok: false, roles: [], error: `http-${response.status}` };
    const body = await response.json();
    if (body?.ok !== true || !Array.isArray(body.roles) || !body.roles.every(validDescriptor)) {
      return { ok: false, roles: [], error: "bad-response" };
    }
    return { ok: true, roles: Object.freeze(body.roles) };
  } catch (error) {
    return { ok: false, roles: [], error: controller.signal.aborted ? "request-aborted" : String(error?.message ?? error) };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
function node(tag, className, text) {
  const result = document.createElement(tag);
  result.className = className;
  if (text !== void 0) result.textContent = text;
  return result;
}
function option(value, label) {
  const result = node("option", "", label);
  result.value = value;
  return result;
}
function mountRolePicker(root, options) {
  const allowed = (items) => options.roleKind ? items.filter((role) => role.kind === options.roleKind) : items;
  let roles = allowed(options.roles ?? []);
  let filters = { ...options.filters, ...options.roleKind ? { kind: options.roleKind } : {} };
  let selection = options.initialRef && isRoleRef(options.initialRef) ? roleRefOf(options.initialRef) : null;
  let enabled = true, destroyed = false, loading = false, loaded = options.roles !== void 0;
  let error = "", requestToken = 0;
  let request;
  const container = node("div", "dshRolePicker");
  const style = node("style", "");
  style.textContent = ".dshRolePicker{font:inherit;min-width:0}.dshRolePickerControls,.dshRolePickerTags,.dshRolePickerFooter{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}.dshRolePickerControls select,.dshRolePickerControls input,.dshRolePicker button{font:inherit;padding:6px 8px;border:1px solid #94a3b866;border-radius:6px;background:transparent;color:inherit}.dshRolePickerQuery{min-width:100px;flex:1}.dshRolePickerList{display:grid;gap:6px;max-height:320px;overflow:auto}.dshRolePickerCard{display:flex;align-items:start;gap:8px;text-align:left;cursor:pointer}.dshRolePickerCardMain{display:flex;flex:1;min-width:0;flex-direction:column;overflow-wrap:anywhere}.dshRolePickerCardMain small{opacity:.75}.dshRolePicker [aria-pressed=true]{background:#3b82f622;border-color:#3b82f6}.dshRolePickerError,.dshRolePickerUnavailable{color:#b45309}.dshRolePicker button:disabled{opacity:.5;cursor:default}.dshRolePickerTagChip{font-size:12px!important}.dshRolePickerSummary{flex:1;overflow-wrap:anywhere}";
  container.append(style);
  if (options.title) container.append(node("strong", "dshRolePickerTitle", options.title));
  const controls = node("div", "dshRolePickerControls");
  function selectControl(className, label) {
    const select = node("select", className);
    select.setAttribute("aria-label", label);
    controls.append(select);
    return select;
  }
  const kind = selectControl("dshRolePickerKind", "\u6309\u89D2\u8272\u7C7B\u522B\u7B5B\u9009");
  kind.append(option("", "\u5168\u90E8\u7C7B\u522B"), option("cognitive", "\u8BA4\u77E5"), option("domain", "\u9886\u57DF"));
  const specialty = selectControl("dshRolePickerSpecialty", "\u6309\u4E13\u4E1A\u7B5B\u9009");
  const contributor = selectControl("dshRolePickerContributor", "\u6309\u8D21\u732E\u6765\u6E90\u7B5B\u9009");
  const query = node("input", "dshRolePickerQuery");
  query.type = "search";
  query.placeholder = "\u641C\u7D22\u89D2\u8272/\u80FD\u529B";
  query.setAttribute("aria-label", "\u641C\u7D22\u89D2\u8272/\u80FD\u529B");
  controls.append(query);
  container.append(controls);
  const tags = node("div", "dshRolePickerTags");
  container.append(tags);
  const status = node("p", "dshRolePickerStatus");
  status.setAttribute("role", "status");
  container.append(status);
  const list = node("div", "dshRolePickerList");
  container.append(list);
  const footer = node("div", "dshRolePickerFooter");
  const summary = node("span", "dshRolePickerSummary");
  footer.append(summary);
  const clear = node("button", "dshRolePickerClear", "\u6E05\u9664");
  clear.type = "button";
  footer.append(clear);
  const refresh = node("button", "dshRolePickerRefresh", "\u5237\u65B0\u89D2\u8272");
  refresh.type = "button";
  footer.append(refresh);
  container.append(footer);
  root.replaceChildren(container);
  function renderResults() {
    if (destroyed) return;
    const visible = filterRoleDescriptors(roles, filters);
    const cards = visible.map((role) => {
      const ref = roleRefOf(role);
      const selected = selection !== null && roleRefKey(selection) === roleRefKey(ref);
      const card = node("button", "dshRolePickerCard" + (selected ? " is-selected" : ""));
      card.type = "button";
      card.disabled = !enabled || loading || !!error;
      card.dataset.roleId = role.id;
      card.dataset.roleVersion = role.version;
      card.dataset.contributor = role.contributorId;
      card.setAttribute("aria-pressed", String(selected));
      card.append(node("span", "dshRolePickerCardKind", role.kind === "domain" ? "\u9886\u57DF" : "\u8BA4\u77E5"));
      const main = node("span", "dshRolePickerCardMain");
      main.append(node("b", "", role.label), node("small", "", `${role.id} \xB7 v${role.version} \xB7 ${role.contributorId}`), node("small", "", role.shortDescription));
      card.append(main);
      card.addEventListener("click", () => {
        selection = selection !== null && roleRefKey(selection) === roleRefKey(ref) ? null : ref;
        renderResults();
        options.onSelect(selection, selection === null ? void 0 : role);
      });
      return card;
    });
    list.replaceChildren(...cards);
    if (!cards.length && loaded && !loading && !error) list.append(node("p", "dshRolePickerEmpty", options.emptyText ?? "\u6CA1\u6709\u5339\u914D\u7684\u89D2\u8272\u3002"));
    status.textContent = loading ? "\u6B63\u5728\u8F7D\u5165\u89D2\u8272\u5E93\u2026" : error ? `\u89D2\u8272\u5E93\u8BFB\u53D6\u5931\u8D25\uFF1A${error}\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002` : "";
    status.className = error ? "dshRolePickerStatus dshRolePickerError" : "dshRolePickerStatus";
    const missing = loaded && !error && selection !== null && !roles.some((role) => roleRefKey(roleRefOf(role)) === roleRefKey(selection));
    summary.textContent = selection ? `${missing ? "\u4E0D\u53EF\u7528\uFF1A\u89D2\u8272\u6765\u6E90\u6216\u7248\u672C\u5DF2\u79FB\u9664\uFF1B\u4FDD\u7559\u539F\u9009\u62E9" : error ? "\u5F85\u786E\u8BA4\u53EF\u7528\u6027" : "\u5DF2\u9009"}\uFF1A${selection.id}@${selection.version}` : "\u672A\u9009\u62E9\u89D2\u8272";
    summary.className = "dshRolePickerSummary" + (missing ? " dshRolePickerUnavailable" : "");
    clear.disabled = !enabled || selection === null;
    refresh.disabled = !enabled || loading;
    for (const chip of Array.from(tags.querySelectorAll("button"))) {
      chip.setAttribute("aria-pressed", String((filters.capabilityTags ?? []).includes(chip.dataset.tag)));
      chip.disabled = !enabled;
    }
  }
  function syncControls() {
    kind.value = filters.kind ?? "";
    const specialties = distinctSpecialties(roles);
    specialty.replaceChildren(option("", "\u5168\u90E8\u4E13\u4E1A"), ...specialties.map((value) => option(value, value)));
    specialty.value = filters.specialty ?? "";
    contributor.replaceChildren(option("", "\u5168\u90E8\u6765\u6E90"), ...distinctContributorIds(roles).map((value) => option(value, value)));
    contributor.value = filters.contributorId ?? "";
    if (query.value !== (filters.query ?? "")) query.value = filters.query ?? "";
    for (const control of [kind, specialty, contributor, query]) control.disabled = !enabled;
    kind.disabled = !enabled || options.roleKind !== void 0;
    tags.replaceChildren(...distinctCapabilityTags(roles).map((tag) => {
      const chip = node("button", "dshRolePickerTagChip", tag);
      chip.type = "button";
      chip.dataset.tag = tag;
      chip.addEventListener("click", () => {
        const next = new Set(filters.capabilityTags ?? []);
        if (next.has(tag)) next.delete(tag);
        else next.add(tag);
        filters = { ...filters, capabilityTags: [...next] };
        renderResults();
      });
      return chip;
    }));
    renderResults();
  }
  kind.addEventListener("change", () => {
    filters = { ...filters, kind: kind.value || void 0 };
    renderResults();
  });
  specialty.addEventListener("change", () => {
    filters = { ...filters, specialty: specialty.value || void 0 };
    renderResults();
  });
  contributor.addEventListener("change", () => {
    filters = { ...filters, contributorId: contributor.value || void 0 };
    renderResults();
  });
  query.addEventListener("input", () => {
    filters = { ...filters, query: query.value };
    renderResults();
  });
  clear.addEventListener("click", () => {
    selection = null;
    renderResults();
    options.onSelect(null);
  });
  const controller = {
    destroy() {
      destroyed = true;
      requestToken++;
      request?.abort();
      container.remove();
    },
    getSelection() {
      return selection === null ? null : { ...selection };
    },
    setSelection(ref) {
      selection = ref === null ? null : Object.freeze(normalizeRoleRef(ref));
      renderResults();
    },
    setFilters(next) {
      filters = { ...next, ...options.roleKind ? { kind: options.roleKind } : {} };
      syncControls();
    },
    setEnabled(next) {
      enabled = next;
      syncControls();
    },
    setRoles(next) {
      requestToken++;
      request?.abort();
      roles = allowed(next);
      loaded = true;
      loading = false;
      error = "";
      syncControls();
    },
    async refresh() {
      if (destroyed) return;
      request?.abort();
      request = new AbortController();
      const token = ++requestToken;
      loading = true;
      error = "";
      renderResults();
      const fetched = await fetchRoles(options.baseUrl ?? "", { signal: request.signal });
      if (destroyed || token !== requestToken) return;
      loading = false;
      if (fetched.ok) {
        roles = allowed(fetched.roles);
        loaded = true;
        error = "";
      } else error = fetched.error ?? "unknown";
      syncControls();
    }
  };
  refresh.addEventListener("click", () => {
    void controller.refresh();
  });
  syncControls();
  if (options.roles === void 0) void controller.refresh();
  return controller;
}
export {
  DEFAULT_PICKER_QUERY,
  SPECIALTY_TAG_PREFIX,
  distinctCapabilityTags,
  distinctContributorIds,
  distinctSpecialties,
  fetchRoles,
  filterRoleDescriptors,
  mountRolePicker,
  roleRefOf
};
