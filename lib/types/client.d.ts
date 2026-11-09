export { roleRefOf, filterRoleDescriptors, distinctContributorIds, distinctCapabilityTags, distinctSpecialties, fetchRoles, mountRolePicker, DEFAULT_PICKER_QUERY, SPECIALTY_TAG_PREFIX, } from './picker.js';
export { normalizeRoleRef, roleRefKey, isRoleRef, isRoleContribution, normalizeRoleContribution, } from './normalize.js';
export { ROLES_API_PATH, ROLES_API_ROLES_PATH } from './types.js';
export declare const name = "harzva-dsh-role-registry";
export declare const inject: readonly string[];
export declare function apply(): void;
