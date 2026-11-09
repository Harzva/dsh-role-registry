const ROLE_REGISTRY_SERVICE = "roleRegistry";
const GROUPX_ROLE_REGISTRY_SERVICE = "groupxRoleRegistry";
const ROLES_API_PATH = "/dsh-roles/api";
const ROLES_API_ROLES_PATH = `${ROLES_API_PATH}/roles`;
const ROLE_PROTOCOL_LIMITS = Object.freeze({
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
export {
  GROUPX_ROLE_REGISTRY_SERVICE,
  ROLES_API_PATH,
  ROLES_API_ROLES_PATH,
  ROLE_PROTOCOL_LIMITS,
  ROLE_REGISTRY_SERVICE
};
