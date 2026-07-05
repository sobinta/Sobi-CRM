import { NextResponse } from "next/server";
import { runDueJobs } from "@/core/jobs/runner";
import "@/engines/jobs-bootstrap";

/**
 * Job runner tick. Called on an interval (dev: a client heartbeat or external
 * cron; prod: platform scheduler). Protected by a shared secret so it can't be
 * triggered by arbitrary clients.
 */
export async function POST(req: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const provided = req.headers.get("x-internal-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDueJobs();
  return NextResponse.json(result);
}
