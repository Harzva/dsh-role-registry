import { type PublicRoleDescriptor, type RoleRef } from './types.js';
export type RolePickerKind = PublicRoleDescriptor['kind'];
export interface RolePickerFilters {
    readonly kind?: RolePickerKind;
    readonly specialty?: string;
    readonly capabilityTags?: readonly string[];
    readonly contributorId?: string;
    readonly query?: string;
}
export declare const DEFAULT_PICKER_QUERY = "";
export declare const SPECIALTY_TAG_PREFIX = "specialty.";
export interface PickerFetchResult {
    readonly ok: boolean;
    readonly roles: readonly PublicRoleDescriptor[];
    readonly error?: string;
}
export interface RolePickerController {
    destroy(): void;
    getSelection(): RoleRef | null;
    setSelection(ref: RoleRef | null): void;
    setFilters(filters: RolePickerFilters): void;
    setEnabled(enabled: boolean): void;
    setRoles(roles: readonly PublicRoleDescriptor[]): void;
    refresh(): Promise<void>;
}
export interface MountRolePickerOptions {
    readonly roles?: readonly PublicRoleDescriptor[];
    readonly baseUrl?: string;
    readonly filters?: RolePickerFilters;
    /** Consumer constraint; unlike a user filter it cannot be widened by the UI. */
    readonly roleKind?: RolePickerKind;
    readonly initialRef?: RoleRef | null;
    readonly title?: string;
    readonly emptyText?: string;
    readonly onSelect: (ref: RoleRef | null, role?: PublicRoleDescriptor) => void;
}
export declare function roleRefOf(role: PublicRoleDescriptor): RoleRef;
export declare function filterRoleDescriptors(roles: readonly PublicRoleDescriptor[], filters?: RolePickerFilters): readonly PublicRoleDescriptor[];
export declare function distinctContributorIds(roles: readonly PublicRoleDescriptor[]): readonly string[];
export declare function distinctSpecialties(roles: readonly PublicRoleDescriptor[]): readonly string[];
export declare function distinctCapabilityTags(roles: readonly PublicRoleDescriptor[]): readonly string[];
export declare function fetchRoles(baseUrl?: string, options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
}): Promise<PickerFetchResult>;
export declare function mountRolePicker(root: HTMLElement, options: MountRolePickerOptions): RolePickerController;
