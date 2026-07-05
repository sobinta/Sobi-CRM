import { workspaces, type WorkspaceDef } from "./workspaces";
import { getModuleManifest, manifestToWorkspace } from "./manifest";
import "./module-manifests"; // register all module manifests (client-safe)

/**
 * Compose the visible workspace rail from core workspaces + the workspaces of
 * activated modules. Module workspaces slot in after the CRM/Sales core and
 * before Operations. Given only the enabled module keys (serializable), so the
 * server can drive this without shipping icon components across the boundary.
 */
export function composeWorkspaces(
  enabledModuleKeys: string[],
): WorkspaceDef[] {
  const moduleWorkspaces: WorkspaceDef[] = enabledModuleKeys
    .map((key) => getModuleManifest(key))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map(manifestToWorkspace);

  // Core order: CRM, then modules, then the rest.
  const [crm, ...rest] = workspaces;
  return [crm, ...moduleWorkspaces, ...rest];
}
