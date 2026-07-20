/**
 * Canonical platform event catalog.
 *
 * Events are the platform's nervous system: engines publish them on state
 * change; Timeline, Feed, Automation, Notifications, Analytics, Audit, and
 * Integrations subscribe. The type list grows as engines/modules land — add
 * new members here so subscribers can switch exhaustively.
 */
export type EventType =
  // identity / tenancy
  | "user.registered"
  | "user.login"
  | "user.logout"
  | "tenant.created"
  | "member.invited"
  | "member.joined"
  // crm
  | "contact.created"
  | "contact.updated"
  | "company.created"
  | "lead.created"
  | "lead.converted"
  | "deal.created"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  // ops
  | "task.created"
  | "task.completed"
  | "file.uploaded"
  | "appointment.booked"
  | "appointment.cancelled"
  // admin / platform
  | "module.activated"
  | "module.deactivated"
  // workflow / automation
  | "workflow.transitioned"
  | "automation.executed"
  // modules
  | "policy.created"
  | "policy.approved"
  | "policy.renewed"
  | "loan.submitted"
  | "loan.decided"
  // contracts
  | "contract.created"
  | "contract.sent"
  | "contract.viewed"
  | "contract.accepted"
  // campaigns
  | "campaign.email_sent"
  // ai
  | "ai.action_proposed"
  | "ai.action_approved";

export interface PlatformEvent<P = Record<string, unknown>> {
  id: string;
  type: EventType;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  payload: P;
  occurredAt: Date;
}

export type EventHandler = (event: PlatformEvent) => void | Promise<void>;
