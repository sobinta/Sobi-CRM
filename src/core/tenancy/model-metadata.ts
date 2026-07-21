/**
 * Model isolation metadata driving the Prisma tenant extension.
 *
 * - TENANT_SCOPED: models with a `tenantId` column. Reads are filtered and
 *   creates are stamped with the current context tenant automatically.
 * - SOFT_DELETE: models with a `deletedAt` column. Reads exclude soft-deleted
 *   rows; deletes become updates that set `deletedAt`.
 *
 * Keep these in sync with the Prisma schema. A missing entry means the model
 * is treated as global/hard-delete — deliberate for auth/global tables.
 */

export const TENANT_SCOPED = new Set<string>([
  "Membership",
  "Team",
  "Role",
  "Event",
  "Job",
  "AuditLog",
  "FeatureGrant",
  "ModuleState",
  // Phase 4 kernels
  "ViewDefinition",
  "CustomRecord",
  "RuleDefinition",
  "Template",
  "ConfigVersion",
  // Phase 5 CRM
  "Company",
  "Contact",
  "Lead",
  "Pipeline",
  "Stage",
  "Deal",
  "Tag",
  "EntityTag",
  "Note",
  "Activity",
  "Relationship",
  "Conversation",
  "Contract",
  "Campaign",
  "CampaignEmail",
  // Phase 7 operations
  "FileObject",
  "FileVersion",
  "DocumentChecklistItem",
  "Task",
  "TaskComment",
  "CalendarEvent",
  "CalendarReminder",
  "EventAttendee",
  "Notification",
  "NotificationPreference",
  "Communication",
  // Phase 8
  "Dashboard",
  "ReportDefinition",
  // Phase 9
  "Automation",
  "AutomationRun",
  "Webhook",
  "WebhookDelivery",
  "ApiKey",
  "WorkflowDefinition",
  "ApprovalRequest",
  // Phase 10 modules
  "InsuranceCarrier",
  "Policy",
  "Claim",
  "Service",
  "StaffMember",
  "Appointment",
  // Phase 11 AI
  "AiSetting",
  "Prompt",
  "AiAction",
  "AiLog",
  "AiEmployee",
  // Phase 12 GDPR
  "ConsentRecord",
  "DataRequest",
  "RetentionPolicy",
  // Phase F
  "KnowledgeArticle",
  // SaaS commercial/import
  "TenantSubscription",
  "UsageCounter",
  "ImportRun",
  "OnboardingProgress",
  // NB: EntityDefinition is intentionally NOT here — built-ins have a null
  // tenantId and are shared across tenants; its queries filter explicitly.
]);

export const SOFT_DELETE = new Set<string>([
  "Tenant",
  "User",
  "Membership",
  "Team",
  "Role",
  // Phase 4 kernels
  "EntityDefinition",
  "CustomRecord",
  "RuleDefinition",
  "Template",
  // Phase 5 CRM
  "Company",
  "Contact",
  "Lead",
  "Deal",
  "Note",
  "Contract",
  // Phase 7 operations
  "FileObject",
  "Task",
  // Phase 8
  "Dashboard",
  // Phase 9
  "Automation",
  "WorkflowDefinition",
  // Phase 10 modules
  "InsuranceCarrier",
  "Policy",
  "Claim",
  "Service",
  "StaffMember",
  "Appointment",
  // Phase F
  "KnowledgeArticle",
]);

/**
 * Models that are tenant-scoped but where the tenant filter is applied via a
 * relation rather than a direct column (so the extension must NOT inject a
 * top-level tenantId). Left explicit for clarity; these are scoped through
 * their parent (e.g. TeamMember via Team, RolePermission via Role).
 */
export const TENANT_SCOPED_VIA_RELATION = new Set<string>([
  "User",
  "TeamMember",
  "RolePermission",
  "MembershipRole",
  "FieldRule",
]);

/**
 * Global models are deliberately unavailable through tenant filtering. They
 * are accessed through the identity or system database capabilities instead.
 */
export const GLOBAL_MODELS = new Set<string>([
  "Session",
  "Account",
  "Verification",
  "Feature",
  "PricingPlan",
  "LandingContentOverride",
  "SiteAsset",
  "AnnouncementBar",
]);

/**
 * EntityDefinition contains shared built-ins (`tenantId = null`) and custom
 * tenant definitions. Its access rules are explicit and tested separately.
 */
export const TENANT_OR_GLOBAL = new Set<string>(["EntityDefinition"]);

/** The tenant row is scoped by its primary key rather than a tenantId field. */
export const TENANT_ROOT_MODELS = new Set<string>(["Tenant"]);

export type ModelScope =
  | "tenant"
  | "relation"
  | "global"
  | "tenant-root"
  | "tenant-or-global";

export function getModelScope(model: string): ModelScope | null {
  if (TENANT_SCOPED.has(model)) return "tenant";
  if (TENANT_SCOPED_VIA_RELATION.has(model)) return "relation";
  if (GLOBAL_MODELS.has(model)) return "global";
  if (TENANT_ROOT_MODELS.has(model)) return "tenant-root";
  if (TENANT_OR_GLOBAL.has(model)) return "tenant-or-global";
  return null;
}
