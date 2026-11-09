window.__ModuleLoader__.load({ id: "@harzva/dsh-role-registry", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  DEFAULT_PICKER_QUERY: () => DEFAULT_PICKER_QUERY,
  ROLES_API_PATH: () => ROLES_API_PATH,
  ROLES_API_ROLES_PATH: () => ROLES_API_ROLES_PATH,
  SPECIALTY_TAG_PREFIX: () => SPECIALTY_TAG_PREFIX,
  apply: () => apply,
  distinctCapabilityTags: () => distinctCapabilityTags,
  distinctContributorIds: () => distinctContributorIds,
  distinctSpecialties: () => distinctSpecialties,
  fetchRoles: () => fetchRoles,
  filterRoleDescriptors: () => filterRoleDescriptors,
  inject: () => inject,
  isRoleContribution: () => isRoleContribution,
  isRoleRef: () => isRoleRef,
  mountRolePicker: () => mountRolePicker,
  name: () => name,
  normalizeRoleContribution: () => normalizeRoleContribution,
  normalizeRoleRef: () => normalizeRoleRef,
  roleRefKey: () => roleRefKey,
  roleRefOf: () => roleRefOf
});
module.exports = __toCommonJS(client_exports);

// src/types.ts
var ROLES_API_PATH = "/dsh-roles/api";
var ROLES_API_ROLES_PATH = `${ROLES_API_PATH}/roles`;
var ROLE_PROTOCOL_LIMITS = Object.freeze({
  identifier: 128,
  version: 64,
  label: 128,
  shortDescription: 512,
  promptFragment: 2048,
  promptTotal: 32768,
  contributionPromptTotal: 262144,
  rolesPerContribution: 64,
  contributorsPerRegistry: 64,
  rolesPerRegistry: 256,
  valuesPerArray: 32,
  compatibilityOrder: 31
});

// src/normalize.ts
var IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
var VERSION_PATTERN = /^[0-9A-Za-z](?:[0-9A-Za-z._+-]*[0-9A-Za-z])?$/;
var DISALLOWED_TEXT_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
var SENSITIVE_TEXT_PATTERNS = Object.freeze([
  /(?:^|[\s"'`([{=,:])\/(?!\/)[^/\s"'`<>]+(?:\/[^/\s"'`<>]+)*/u,
  /(?:^|[\s"'`([{=,:])~\/[^/\s"'`<>]+(?:\/[^/\s"'`<>]+)*/u,
  /\b[A-Za-z]:[\\/][^\s"'`<>]+/,
  /(?:^|[\s"'`([{=,:])\\\\[^\\\s"'`<>]+\\[^\\\s"'`<>]+/,
  /\bfile:\/{2,3}[^\s"'`<>]+/i,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bbearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}\b/i,
  /\b(?:[A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|REFRESH_TOKEN|PASSWORD|SECRET|COOKIE)|apiKey|accessToken|refreshToken)\b\s*[:=]\s*["']?[A-Za-z0-9+/_=-]{8,}/i
]);
var CONTRIBUTION_KEYS = /* @__PURE__ */ new Set(["contributorId", "version", "roles"]);
var ROLE_DEFINITION_KEYS = /* @__PURE__ */ new Set([
  "id",
  "version",
  "namespace",
  "kind",
  "label",
  "shortDescription",
  "capabilityTags",
  "requiresHarnessCapabilities",
  "prefersModelCapabilities",
  "requires",
  "suggestedCognitiveRoles",
  "phases",
  "metadata",
  "prompt"
]);
var ROLE_REF_KEYS = /* @__PURE__ */ new Set(["id", "version"]);
var REQUIREMENT_KEYS = /* @__PURE__ */ new Set(["roleRefs", "artifactTypes"]);
var METADATA_KEYS = /* @__PURE__ */ new Set(["alpha24Role"]);
var ALPHA24_METADATA_KEYS = /* @__PURE__ */ new Set(["label", "order"]);
var PROMPT_KEYS = /* @__PURE__ */ new Set(["identity", "objectives", "mustCheck", "mustNot", "outputContract"]);
var ROLE_PHASES = /* @__PURE__ */ new Set([
  "proposal",
  "challenge",
  "response",
  "revision",
  "evaluation",
  "synthesis"
]);
function invalid(path) {
  throw new Error(`invalid-role-protocol:${path}`);
}
function record(value, path, allowedKeys) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(path);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path);
  const normalized = /* @__PURE__ */ Object.create(null);
  const keys = Reflect.ownKeys(value);
  if (keys.length > allowedKeys.size) invalid(path);
  for (const key of keys) {
    if (typeof key !== "string" || !allowedKeys.has(key)) invalid(path);
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (property === void 0 || !("value" in property)) invalid(path);
    normalized[key] = property.value;
  }
  return normalized;
}
function array(value, path, maximum = ROLE_PROTOCOL_LIMITS.valuesPerArray) {
  if (!Array.isArray(value) || value.length > maximum) invalid(path);
  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (property === void 0 || !("value" in property)) invalid(`${path}[${String(index)}]`);
    normalized.push(property.value);
  }
  return normalized;
}
function containsSensitiveRoleText(value) {
  return SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}
function text(value, path, maximum, multiline = false) {
  if (typeof value !== "string" || value.length > maximum || DISALLOWED_TEXT_CONTROL.test(value)) invalid(path);
  if (!multiline && /[\r\n\t]/.test(value)) invalid(path);
  const normalized = value.trim();
  if (normalized === "" || containsSensitiveRoleText(normalized)) invalid(path);
  return normalized;
}
function identifier(value, path) {
  const normalized = text(value, path, ROLE_PROTOCOL_LIMITS.identifier);
  if (!IDENTIFIER_PATTERN.test(normalized)) invalid(path);
  return normalized;
}
function version(value, path) {
  const normalized = text(value, path, ROLE_PROTOCOL_LIMITS.version);
  if (!VERSION_PATTERN.test(normalized)) invalid(path);
  return normalized;
}
function uniqueStrings(value, path, normalize, options = {}) {
  const values = array(value, path);
  if (options.required === true && values.length === 0) invalid(path);
  const seen = /* @__PURE__ */ new Set();
  const result = values.map((entry, index) => {
    const normalized = normalize(entry, `${path}[${String(index)}]`);
    if (seen.has(normalized)) invalid(`${path}[${String(index)}]`);
    seen.add(normalized);
    return normalized;
  });
  return Object.freeze(result);
}
function promptFragments(value, path, required = false) {
  return uniqueStrings(
    value,
    path,
    (entry, entryPath) => text(entry, entryPath, ROLE_PROTOCOL_LIMITS.promptFragment, true),
    { required }
  );
}
function normalizeRoleRef(value, path = "roleRef") {
  const input = record(value, path, ROLE_REF_KEYS);
  return Object.freeze({
    id: identifier(input.id, `${path}.id`),
    version: version(input.version, `${path}.version`)
  });
}
function isRoleRef(value) {
  try {
    normalizeRoleRef(value);
    return true;
  } catch {
    return false;
  }
}
function roleRefKey(value) {
  const normalized = normalizeRoleRef(value);
  return `${normalized.id}@${normalized.version}`;
}
function roleRefs(value, path) {
  const values = array(value, path);
  const seen = /* @__PURE__ */ new Set();
  const result = values.map((entry, index) => {
    const ref = normalizeRoleRef(entry, `${path}[${String(index)}]`);
    const key = `${ref.id}@${ref.version}`;
    if (seen.has(key)) invalid(`${path}[${String(index)}]`);
    seen.add(key);
    return ref;
  });
  return Object.freeze(result);
}
function requirements(value, path) {
  const input = record(value, path, REQUIREMENT_KEYS);
  return Object.freeze({
    ...input.roleRefs === void 0 ? {} : { roleRefs: roleRefs(input.roleRefs, `${path}.roleRefs`) },
    ...input.artifactTypes === void 0 ? {} : {
      artifactTypes: uniqueStrings(
        input.artifactTypes,
        `${path}.artifactTypes`,
        (entry, entryPath) => identifier(entry, entryPath)
      )
    }
  });
}
function metadata(value, path) {
  const input = record(value, path, METADATA_KEYS);
  if (input.alpha24Role === void 0) return Object.freeze({});
  const alpha24 = record(input.alpha24Role, `${path}.alpha24Role`, ALPHA24_METADATA_KEYS);
  const order = alpha24.order;
  if (typeof order !== "number" || !Number.isSafeInteger(order) || order < 0 || order > ROLE_PROTOCOL_LIMITS.compatibilityOrder) invalid(`${path}.alpha24Role.order`);
  return Object.freeze({
    alpha24Role: Object.freeze({
      label: text(alpha24.label, `${path}.alpha24Role.label`, ROLE_PROTOCOL_LIMITS.label),
      order
    })
  });
}
function prompt(value, path) {
  const input = record(value, path, PROMPT_KEYS);
  const normalized = Object.freeze({
    identity: text(input.identity, `${path}.identity`, ROLE_PROTOCOL_LIMITS.promptFragment, true),
    objectives: promptFragments(input.objectives, `${path}.objectives`, true),
    mustCheck: promptFragments(input.mustCheck, `${path}.mustCheck`, true),
    mustNot: promptFragments(input.mustNot, `${path}.mustNot`, true),
    outputContract: promptFragments(input.outputContract, `${path}.outputContract`, true)
  });
  const total = normalized.identity.length + normalized.objectives.reduce((sum, entry) => sum + entry.length, 0) + normalized.mustCheck.reduce((sum, entry) => sum + entry.length, 0) + normalized.mustNot.reduce((sum, entry) => sum + entry.length, 0) + normalized.outputContract.reduce((sum, entry) => sum + entry.length, 0);
  if (total > ROLE_PROTOCOL_LIMITS.promptTotal) invalid(path);
  return normalized;
}
function roleDefinition(value, path) {
  const input = record(value, path, ROLE_DEFINITION_KEYS);
  const id = identifier(input.id, `${path}.id`);
  const namespace = identifier(input.namespace, `${path}.namespace`);
  const separator = id.lastIndexOf(".");
  if (separator <= 0 || id.slice(0, separator) !== namespace) invalid(`${path}.namespace`);
  if (input.kind !== "cognitive" && input.kind !== "domain") invalid(`${path}.kind`);
  const phasesInput = array(input.phases, `${path}.phases`);
  if (phasesInput.length === 0) invalid(`${path}.phases`);
  const phaseSet = /* @__PURE__ */ new Set();
  const phases = Object.freeze(phasesInput.map((entry, index) => {
    if (typeof entry !== "string" || !ROLE_PHASES.has(entry)) {
      invalid(`${path}.phases[${String(index)}]`);
    }
    const phase = entry;
    if (phaseSet.has(phase)) invalid(`${path}.phases[${String(index)}]`);
    phaseSet.add(phase);
    return phase;
  }));
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
      true
    ),
    capabilityTags: uniqueStrings(
      input.capabilityTags,
      `${path}.capabilityTags`,
      (entry, entryPath) => identifier(entry, entryPath),
      { required: true }
    ),
    ...input.requiresHarnessCapabilities === void 0 ? {} : {
      requiresHarnessCapabilities: uniqueStrings(
        input.requiresHarnessCapabilities,
        `${path}.requiresHarnessCapabilities`,
        (entry, entryPath) => identifier(entry, entryPath)
      )
    },
    ...input.prefersModelCapabilities === void 0 ? {} : {
      prefersModelCapabilities: uniqueStrings(
        input.prefersModelCapabilities,
        `${path}.prefersModelCapabilities`,
        (entry, entryPath) => identifier(entry, entryPath)
      )
    },
    ...input.requires === void 0 ? {} : { requires: requirements(input.requires, `${path}.requires`) },
    ...input.suggestedCognitiveRoles === void 0 ? {} : {
      suggestedCognitiveRoles: uniqueStrings(
        input.suggestedCognitiveRoles,
        `${path}.suggestedCognitiveRoles`,
        (entry, entryPath) => identifier(entry, entryPath)
      )
    },
    phases,
    ...input.metadata === void 0 ? {} : { metadata: metadata(input.metadata, `${path}.metadata`) },
    prompt: prompt(input.prompt, `${path}.prompt`)
  });
}
function normalizeRoleContribution(value) {
  const input = record(value, "contribution", CONTRIBUTION_KEYS);
  const rawRoles = array(input.roles, "contribution.roles", ROLE_PROTOCOL_LIMITS.rolesPerContribution);
  if (rawRoles.length === 0) invalid("contribution.roles");
  const ids = /* @__PURE__ */ new Set();
  let promptTotal = 0;
  const roles = Object.freeze(rawRoles.map((entry, index) => {
    const role = roleDefinition(entry, `contribution.roles[${String(index)}]`);
    if (ids.has(role.id)) invalid(`contribution.roles[${String(index)}].id`);
    ids.add(role.id);
    promptTotal += role.prompt.identity.length + role.prompt.objectives.reduce((sum, fragment) => sum + fragment.length, 0) + role.prompt.mustCheck.reduce((sum, fragment) => sum + fragment.length, 0) + role.prompt.mustNot.reduce((sum, fragment) => sum + fragment.length, 0) + role.prompt.outputContract.reduce((sum, fragment) => sum + fragment.length, 0);
    return role;
  }));
  if (promptTotal > ROLE_PROTOCOL_LIMITS.contributionPromptTotal) invalid("contribution.roles");
  return Object.freeze({
    contributorId: identifier(input.contributorId, "contribution.contributorId"),
    version: version(input.version, "contribution.version"),
    roles
  });
}
function isRoleContribution(value) {
  try {
    normalizeRoleContribution(value);
    return true;
  } catch {
    return false;
  }
}

// src/picker.ts
var DEFAULT_PICKER_QUERY = "";
var SPECIALTY_TAG_PREFIX = "specialty.";
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
function node(tag, className, text2) {
  const result = document.createElement(tag);
  result.className = className;
  if (text2 !== void 0) result.textContent = text2;
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

// src/client.ts
var name = "harzva-dsh-role-registry";
var inject = [];
function apply() {
}
return module.exports; } });
