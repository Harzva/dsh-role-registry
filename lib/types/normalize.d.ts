import { type RoleContribution, type RoleRef } from './types.js';
export declare function containsSensitiveRoleText(value: string): boolean;
export declare function normalizeRoleRef(value: unknown, path?: string): RoleRef;
export declare function isRoleRef(value: unknown): value is RoleRef;
export declare function roleRefKey(value: RoleRef): string;
export declare function normalizeRoleContribution(value: unknown): RoleContribution;
export declare function isRoleContribution(value: unknown): value is RoleContribution;
