import { Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { repairUndispatchedEvents } from "@/core/event-bus/outbox";
import {
  runWithContext,
  systemTenantContext,
} from "@/core/tenancy/context";
import type { Job } from "@/generated/prisma/client";
import { DEMO_TENANT_SLUG } from "@/core/demo/constants";

export interface JobContext {
  jobId: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;
const registry = new Map<string, JobHandler>();

export function registerJob(kind: string, handler: JobHandler): void {
  registry.set(kind, handler);
}

export interface EnqueueInput {
  kind: string;
  tenantId?: string | null;
  payload?: Record<string, unknown>;
  runAt?: Date;
  dedupeKey?: string;
  maxAttempts?: number;
}

export async function enqueue(input: EnqueueInput): Promise<string | null> {
  try {
    const job = await systemDb.job.create({
      data: {
        kind: input.kind,
        tenantId: input.tenantId ?? null,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        runAt: input.runAt ?? new Date(),
        dedupeKey: input.dedupeKey ?? null,
        maxAttempts: input.maxAttempts ?? 3,
      },
    });
    return job.id;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return null;
    throw error;
  }
}

const LOCK_ID = `runner-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;

export function jobRetryDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(15 * 60_000, 15_000 * 2 ** Math.max(0, attempt - 1));
  return Math.round(base * (0.8 + random() * 0.4));
}

function leaseMs(): number {
  const configured = Number(process.env.JOB_LEASE_MS ?? 5 * 60_000);
  return Number.isFinite(configured)
    ? Math.max(30_000, Math.min(configured, 60 * 60_000))
    : 5 * 60_000;
}

async function claimDueJobs(limit: number): Promise<Job[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - leaseMs());
  return systemDb.$queryRaw<Job[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id"
      FROM "Job"
      WHERE
        ("status" = 'PENDING'::"JobStatus" AND "runAt" <= ${now})
        OR
        ("status" = 'RUNNING'::"JobStatus" AND "lockedAt" <= ${staleBefore})
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "Job" AS job
    SET
      "status" = 'RUNNING'::"JobStatus",
      "lockedAt" = ${now},
      "lockedBy" = ${LOCK_ID},
      "updatedAt" = ${now}
    FROM candidates
    WHERE job."id" = candidates."id"
    RETURNING job.*
  `);
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 2_000);
}

async function withLeaseHeartbeat<T>(jobId: string, task: () => Promise<T>): Promise<T> {
  const interval = Math.max(10_000, Math.floor(leaseMs() / 3));
  const timer = setInterval(() => {
    void systemDb.job.updateMany({
      where: { id: jobId, status: "RUNNING", lockedBy: LOCK_ID },
      data: { lockedAt: new Date() },
    }).catch(() => undefined);
  }, interval);
  timer.unref?.();
  try {
    return await task();
  } finally {
    clearInterval(timer);
  }
}

export async function runDueJobs(limit = 25): Promise<{
  repairedEvents: number;
  claimed: number;
  succeeded: number;
  failed: number;
}> {
  const repairedEvents = await repairUndispatchedEvents();
  const jobs = await claimDueJobs(Math.max(1, Math.min(limit, 100)));
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const handler = registry.get(job.kind);
    if (!handler) {
      await systemDb.job.updateMany({
        where: { id: job.id, status: "RUNNING", lockedBy: LOCK_ID },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          lastError: `No handler registered for kind "${job.kind}".`.slice(0, 2_000),
          lockedAt: null,
          lockedBy: null,
        },
      });
      failed += 1;
      continue;
    }

    try {
      const handlerContext: JobContext = {
        jobId: job.id,
        tenantId: job.tenantId,
        payload: job.payload as Record<string, unknown>,
      };
      await withLeaseHeartbeat(job.id, async () => {
        if (!job.tenantId) return handler(handlerContext);
        const actor = await systemDb.membership.findFirst({
          where: { tenantId: job.tenantId, status: "ACTIVE", deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true,
            tenant: { select: { slug: true } },
          },
        });
        if (!actor) throw new Error("Tenant job has no active system actor.");
        if (actor.tenant.slug === DEMO_TENANT_SLUG) return;
        return runWithContext(
          systemTenantContext(job.tenantId, actor.id, actor.userId),
          () => handler(handlerContext),
        );
      });
      const update = await systemDb.job.updateMany({
        where: { id: job.id, status: "RUNNING", lockedBy: LOCK_ID },
        data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null },
      });
      if (update.count) succeeded += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const exhausted = attempts >= job.maxAttempts;
      await systemDb.job.updateMany({
        where: { id: job.id, status: "RUNNING", lockedBy: LOCK_ID },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          attempts,
          lastError: safeError(error),
          runAt: exhausted
            ? job.runAt
            : new Date(Date.now() + jobRetryDelayMs(attempts)),
          lockedAt: null,
          lockedBy: null,
        },
      });
      failed += 1;
    }
  }

  return { repairedEvents, claimed: jobs.length, succeeded, failed };
}
