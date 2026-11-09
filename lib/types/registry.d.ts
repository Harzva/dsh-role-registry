import { type CouncilRoleDefinition, type PublicRoleDescriptor, type RoleContribution, type RoleRef, type GroupXRoleRegistry } from './types.js';
export declare class RoleRegistry implements GroupXRoleRegistry {
    #private;
    register(value: RoleContribution): () => void;
    resolve(value: RoleRef): CouncilRoleDefinition | undefined;
    snapshot(): readonly PublicRoleDescriptor[];
}
export declare function createRoleRegistry(): GroupXRoleRegistry;
