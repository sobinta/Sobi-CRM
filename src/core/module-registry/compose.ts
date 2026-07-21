import { workspaces, platformAdminWorkspace, type WorkspaceDef } from "./workspaces";
import { getModuleManifest, manifestToWorkspace } from "./manifest";
import "./module-manifests"; // register all module manifests (client-safe)

/**
 * Compose the visible workspace rail from core workspaces + the workspaces of
 * activated modules. Module workspaces slot in after the CRM/Sales core and
 * before Operations. Given only the enabled module keys (serializable), so the
 * server can drive this without shipping icon components across the boundary.
 * Platform Admin is appended last, only for the platform's super admin.
 */
export function composeWorkspaces(
  enabledModuleKeys: string[],
  isSuperAdmin = false,
  readOnly = false,
): WorkspaceDef[] {
  const moduleWorkspaces: WorkspaceDef[] = enabledModuleKeys
    .map((key) => getModuleManifest(key))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map(manifestToWorkspace);

  // Core order: CRM, then modules, then the rest.
  const [crm, ...rest] = workspaces;
  const visibleCore = readOnly
    ? rest.filter((workspace) => workspace.key !== "admin")
    : rest;
  return [
    crm,
    ...moduleWorkspaces,
    ...visibleCore,
    ...(isSuperAdmin && !readOnly ? [platformAdminWorkspace] : []),
  ];
}
