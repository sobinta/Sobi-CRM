import type { LucideIcon } from "lucide-react";
import type { WorkspaceDef, NavItemDef } from "./workspaces";

/**
 * Module manifest — what a business module contributes to the platform.
 *
 * A manifest is a plugin-shaped contract: it declares the module's workspace
 * (nav), permissions, dashboard widgets, and relationship kinds. The registry
 * composes manifests of *activated* modules into the workspace rail. Business
 * modules consume this same contract that the Plugin SDK will expose.
 */
export interface ModuleManifest {
  key: string;
  workspace: {
    labelKey: string;
    icon: LucideIcon;
    href: string;
    nav: NavItemDef[];
  };
  /** Permission keys this module introduces. */
  permissions?: string[];
  /** Relationship kinds the module registers with the graph. */
  relationshipKinds?: string[];
}

const manifests = new Map<string, ModuleManifest>();

export function registerModule(manifest: ModuleManifest): void {
  manifests.set(manifest.key, manifest);
}

export function getModuleManifest(key: string): ModuleManifest | undefined {
  return manifests.get(key);
}

export function allModuleManifests(): ModuleManifest[] {
  return [...manifests.values()];
}

/** Build a WorkspaceDef from a manifest (for the rail/sidebar). */
export function manifestToWorkspace(m: ModuleManifest): WorkspaceDef {
  return {
    key: m.key,
    labelKey: m.workspace.labelKey,
    icon: m.workspace.icon,
    href: m.workspace.href,
    nav: m.workspace.nav,
  };
}
