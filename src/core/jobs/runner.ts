import { Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import {
  runWithContext,
  systemTenantContext,
} from "@/core/tenancy/context";

/**
 * DB-backed job runner.
 *
 * Handlers register by kind. enqueue() writes a Job row; runDueJobs() claims
 * due PENDING jobs (with a lock so overlapping ticks don't double-run),
 * executes them, and records success/failure with bounded retries.
 *
 * Invoked from an internal API route on an interval / cron in dev, and
 * swappable for a hosted queue in production. The interface is intentionally
 * queue-agnostic.
 */

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
  } catch (err) {
    // Unique dedupeKey collision → job already queued; that's fine.
    if ((err as { code?: string }).code === "P2002") return null;
    throw err;
  }
}

const LOCK_ID = `runner-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

/** Run all due jobs. Returns a summary. Safe to call concurrently. */
export async function runDueJobs(limit = 25): Promise<{
  claimed: number;
  succeeded: number;
  failed: number;
}> {
  const now = new Date();

  // Claim a batch atomically via a locking update.
  const due = await systemDb.job.findMany({
    where: { status: "PENDING", runAt: { lte: now }, lockedAt: null },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;

  for (const job of due) {
    // Optimistic lock: only proceed if still unlocked.
    const claim = await systemDb.job.updateMany({
      where: { id: job.id, lockedAt: null, status: "PENDING" },
      data: { status: "RUNNING", lockedAt: now, lockedBy: LOCK_ID },
    });
    if (claim.count === 0) continue;

    const handler = registry.get(job.kind);
    if (!handler) {
      await systemDb.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: `No handler registered for kind "${job.kind}".`,
          lockedAt: null,
          lockedBy: null,
        },
      });
      failed++;
      continue;
    }

    try {
      const handlerContext = {
        jobId: job.id,
        tenantId: job.tenantId,
        payload: job.payload as Record<string, unknown>,
      };
      if (job.tenantId) {
        const actor = await systemDb.membership.findFirst({
          where: {
            tenantId: job.tenantId,
            status: "ACTIVE",
            deletedAt: null,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, userId: true },
        });
        if (!actor) {
          throw new Error("Tenant job has no active system actor.");
        }
        await runWithContext(
          systemTenantContext(job.tenantId, actor.id, actor.userId),
          () => handler(handlerContext),
        );
      } else {
        await handler(handlerContext);
      }
      await systemDb.job.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null },
      });
      succeeded++;
    } catch (err) {
      const attempts = job.attempts + 1;
      const exhausted = attempts >= job.maxAttempts;
      await systemDb.job.update({
        where: { id: job.id },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          attempts,
          lastError: (err as Error).message,
          // simple backoff: retry in attempts minutes
          runAt: exhausted
            ? job.runAt
            : new Date(Date.now() + attempts * 60_000),
          lockedAt: null,
          lockedBy: null,
        },
      });
      failed++;
    }
  }

  return { claimed: due.length, succeeded, failed };
}
