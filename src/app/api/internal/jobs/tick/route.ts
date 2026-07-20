import { NextResponse } from "next/server";
import { runDueJobs } from "@/core/jobs/runner";
import "@/engines/jobs-bootstrap";
import crypto from "node:crypto";

/**
 * Job runner tick. Called on an interval (dev: a client heartbeat or external
 * cron; prod: platform scheduler). Protected by a shared secret so it can't be
 * triggered by arbitrary clients.
 */
export async function POST(req: Request) {
  const secret = process.env.JOB_RUNNER_SECRET;
  const provided = req.headers.get("x-internal-secret");
  const expected = Buffer.from(secret ?? "");
  const actual = Buffer.from(provided ?? "");
  if (
    !secret ||
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDueJobs();
  return NextResponse.json(result);
}
