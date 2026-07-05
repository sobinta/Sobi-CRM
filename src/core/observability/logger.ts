/**
 * Structured logger. Emits single-line JSON in production (log-shipper
 * friendly) and readable lines in dev. The first observability collector;
 * request metrics, error events, and job/AI/automation runs layer on top in
 * later phases via the same shape.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: Level =
  (process.env.LOG_LEVEL as Level) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
  } else {
    const tag = { debug: "·", info: "▸", warn: "!", error: "✕" }[level];
    console[level === "debug" ? "log" : level](
      `${tag} ${msg}`,
      meta && Object.keys(meta).length ? meta : "",
    );
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    log("error", msg, meta),
};
