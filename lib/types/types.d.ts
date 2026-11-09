export declare const ROLE_REGISTRY_SERVICE: "roleRegistry";
/** GroupX 兼容别名：与 roleRegistry 指向同一实例。 */
export declare const GROUPX_ROLE_REGISTRY_SERVICE: "groupxRoleRegistry";
/** 中立读取通道路径前缀（与 GroupX / supervisor 的路径前缀风格一致）。 */
export declare const ROLES_API_PATH: "/dsh-roles/api";
/** 读取通道全集：GET 返回 { ok, roles }（PublicRoleDescriptor[]，不含 prompt 正文）。 */
export declare const ROLES_API_ROLES_PATH: "/dsh-roles/api/roles";
export declare const ROLE_PROTOCOL_LIMITS: Readonly<{
    identifier: 128;
    version: 64;
    label: 128;
    shortDescription: 512;
    promptFragment: 2048;
    promptTotal: 32768;
    contributionPromptTotal: 262144;
    rolesPerContribution: 64;
    contributorsPerRegistry: 64;
    rolesPerRegistry: 256;
    valuesPerArray: 32;
    compatibilityOrder: 31;
}>;
export type CouncilRoleKind = 'cognitive' | 'domain';
export type CouncilRolePhase = 'proposal' | 'challenge' | 'response' | 'revision' | 'evaluation' | 'synthesis';
export interface RoleRef {
    readonly id: string;
    readonly version: string;
}
export interface Alpha24RoleMetadata {
    readonly label: string;
    readonly order: number;
}
export interface CouncilRoleMetadata {
    readonly alpha24Role?: Alpha24RoleMetadata;
}
export interface CouncilRoleRequirements {
    readonly roleRefs?: readonly RoleRef[];
    readonly artifactTypes?: readonly string[];
}
export interface CouncilRolePrompt {
    readonly identity: string;
    readonly objectives: readonly string[];
    readonly mustCheck: readonly string[];
    readonly mustNot: readonly string[];
    readonly outputContract: readonly string[];
}
export interface CouncilRoleDefinition {
    readonly id: string;
    readonly version: string;
    readonly namespace: string;
    readonly kind: CouncilRoleKind;
    readonly label: string;
    readonly shortDescription: string;
    readonly capabilityTags: readonly string[];
    readonly requiresHarnessCapabilities?: readonly string[];
    readonly prefersModelCapabilities?: readonly string[];
    readonly requires?: CouncilRoleRequirements;
    readonly suggestedCognitiveRoles?: readonly string[];
    readonly phases: readonly CouncilRolePhase[];
    readonly metadata?: CouncilRoleMetadata;
    readonly prompt: CouncilRolePrompt;
}
export interface RoleContribution {
    readonly contributorId: string;
    readonly version: string;
    readonly roles: readonly CouncilRoleDefinition[];
}
/** Safe to expose to clients. Prompt bodies are deliberately absent. */
export interface PublicRoleDescriptor {
    readonly contributorId: string;
    readonly contributionVersion: string;
    readonly id: string;
    readonly version: string;
    readonly namespace: string;
    readonly kind: CouncilRoleKind;
    readonly label: string;
    readonly shortDescription: string;
    readonly capabilityTags: readonly string[];
    readonly requiresHarnessCapabilities?: readonly string[];
    readonly prefersModelCapabilities?: readonly string[];
    readonly requires?: CouncilRoleRequirements;
    readonly suggestedCognitiveRoles?: readonly string[];
    readonly phases: readonly CouncilRolePhase[];
    readonly metadata?: CouncilRoleMetadata;
}
export interface RoleRegistry {
    register(contribution: RoleContribution): () => void;
    resolve(ref: RoleRef): CouncilRoleDefinition | undefined;
    snapshot(): readonly PublicRoleDescriptor[];
}
/** @deprecated 用 RoleRegistry。保留以兼容既有消费方。 */
export type GroupXRoleRegistry = RoleRegistry;
