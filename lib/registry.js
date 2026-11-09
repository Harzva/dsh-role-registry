import {
  ROLE_PROTOCOL_LIMITS
} from "./types.js";
import { normalizeRoleContribution, normalizeRoleRef } from "./normalize.js";
function frozenStrings(values) {
  return Object.freeze([...values]);
}
function frozenRequirements(value) {
  if (value === void 0) return void 0;
  return Object.freeze({
    ...value.roleRefs === void 0 ? {} : { roleRefs: Object.freeze(value.roleRefs.map((ref) => Object.freeze({ id: ref.id, version: ref.version }))) },
    ...value.artifactTypes === void 0 ? {} : { artifactTypes: frozenStrings(value.artifactTypes) }
  });
}
function frozenMetadata(value) {
  if (value === void 0) return void 0;
  return Object.freeze({
    ...value.alpha24Role === void 0 ? {} : {
      alpha24Role: Object.freeze({
        label: value.alpha24Role.label,
        order: value.alpha24Role.order
      })
    }
  });
}
function publicDescriptor(contribution, role) {
  return Object.freeze({
    contributorId: contribution.contributorId,
    contributionVersion: contribution.version,
    id: role.id,
    version: role.version,
    namespace: role.namespace,
    kind: role.kind,
    label: role.label,
    shortDescription: role.shortDescription,
    capabilityTags: frozenStrings(role.capabilityTags),
    ...role.requiresHarnessCapabilities === void 0 ? {} : { requiresHarnessCapabilities: frozenStrings(role.requiresHarnessCapabilities) },
    ...role.prefersModelCapabilities === void 0 ? {} : { prefersModelCapabilities: frozenStrings(role.prefersModelCapabilities) },
    ...role.requires === void 0 ? {} : { requires: frozenRequirements(role.requires) },
    ...role.suggestedCognitiveRoles === void 0 ? {} : { suggestedCognitiveRoles: frozenStrings(role.suggestedCognitiveRoles) },
    phases: frozenStrings(role.phases),
    ...role.metadata === void 0 ? {} : { metadata: frozenMetadata(role.metadata) }
  });
}
function isReservedCoreIdentifier(value) {
  return value === "core" || value.startsWith("core.");
}
function namespaceOwner(value) {
  const separator = value.indexOf(".");
  return separator === -1 ? value : value.slice(0, separator);
}
class RoleRegistry {
  #contributors = /* @__PURE__ */ new Map();
  #roles = /* @__PURE__ */ new Map();
  register(value) {
    const contribution = normalizeRoleContribution(value);
    const owner = namespaceOwner(contribution.contributorId);
    const usesReservedCore = contribution.roles.some((role) => isReservedCoreIdentifier(role.id) || isReservedCoreIdentifier(role.namespace) || role.metadata?.alpha24Role !== void 0);
    if (contribution.contributorId === "core") {
      throw new Error("reserved-core-role-namespace");
    }
    if (owner !== "core" && usesReservedCore) {
      throw new Error("reserved-core-role-namespace");
    }
    if (contribution.roles.some((role) => namespaceOwner(role.namespace) !== owner)) {
      throw new Error("role-namespace-owner-mismatch");
    }
    return this.#commit(contribution);
  }
  resolve(value) {
    let ref;
    try {
      ref = normalizeRoleRef(value);
    } catch {
      return void 0;
    }
    const role = this.#roles.get(ref.id);
    return role?.version === ref.version ? role : void 0;
  }
  snapshot() {
    const roles = [];
    for (const registered of this.#contributors.values()) roles.push(...registered.publicRoles);
    return Object.freeze(roles);
  }
  #commit(contribution) {
    if (this.#contributors.has(contribution.contributorId)) {
      throw new Error(`duplicate-role-contributor:${contribution.contributorId}`);
    }
    if (this.#contributors.size >= ROLE_PROTOCOL_LIMITS.contributorsPerRegistry) {
      throw new Error("role-registry-contributor-limit");
    }
    if (this.#roles.size + contribution.roles.length > ROLE_PROTOCOL_LIMITS.rolesPerRegistry) {
      throw new Error("role-registry-role-limit");
    }
    for (const role of contribution.roles) {
      if (this.#roles.has(role.id)) throw new Error(`duplicate-role-id:${role.id}`);
    }
    const registered = Object.freeze({
      token: Symbol(contribution.contributorId),
      contribution,
      publicRoles: Object.freeze(contribution.roles.map((role) => publicDescriptor(contribution, role)))
    });
    this.#contributors.set(contribution.contributorId, registered);
    for (const role of contribution.roles) this.#roles.set(role.id, role);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      if (this.#contributors.get(contribution.contributorId)?.token !== registered.token) return;
      this.#contributors.delete(contribution.contributorId);
      for (const role of contribution.roles) {
        if (this.#roles.get(role.id) === role) this.#roles.delete(role.id);
      }
    };
  }
}
function createRoleRegistry() {
  return new RoleRegistry();
}
export {
  RoleRegistry,
  createRoleRegistry
};
