/**
 * Permission catalog + system role definitions.
 *
 * Permission keys are "<module>.<entity>.<action>". Wildcards are allowed in
 * grants (e.g. "crm.*.read", "*"). The catalog here is the seed set for core;
 * modules contribute their own keys via manifests in later phases.
 *
 * System roles are seeded per tenant at provisioning and cannot be deleted.
 */

export const ACTIONS = ["read", "create", "update", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];

/** Core entities that exist from Phase 2/3 onward. */
export const CORE_ENTITIES = [
  "contact",
  "company",
  "lead",
  "deal",
  "task",
  "file",
  "note",
] as const;

export interface SystemRoleDef {
  key: string;
  name: string;
  description: string;
  isAdmin: boolean;
  /** Permission grants; "*" means full access. */
  permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    key: "owner",
    name: "Owner",
    description: "Full control of the workspace, including billing and deletion.",
    isAdmin: true,
    permissions: ["*"],
  },
  {
    key: "admin",
    name: "Administrator",
    description: "Manages users, roles, modules, and settings.",
    isAdmin: true,
    permissions: ["*"],
  },
  {
    key: "manager",
    name: "Manager",
    description: "Manages team records and pipelines; limited settings.",
    isAdmin: false,
    permissions: [
      "crm.*.read",
      "crm.*.create",
      "crm.*.update",
      "crm.*.export",
      "ops.*.read",
      "ops.*.create",
      "ops.*.update",
      "mgmt.*.read",
    ],
  },
  {
    key: "employee",
    name: "Employee",
    description: "Works assigned records and tasks.",
    isAdmin: false,
    permissions: [
      "crm.*.read",
      "crm.*.create",
      "crm.*.update",
      "ops.*.read",
      "ops.*.create",
      "ops.*.update",
    ],
  },
  {
    key: "client",
    name: "Client",
    description: "External/portal user with access to their own records only.",
    isAdmin: false,
    permissions: ["portal.*.read"],
  },
];
