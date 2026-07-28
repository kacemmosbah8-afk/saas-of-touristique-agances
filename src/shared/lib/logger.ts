import "server-only";

/**
 * Structured JSON logger for server-side code.
 *
 * Outputs one JSON object per line — compatible with Vercel log drains,
 * Datadog, Axiom, and any log aggregator that expects NDJSON.
 *
 * Log level is controlled by the LOG_LEVEL environment variable.
 * Defaults to "debug" in development and "info" in production.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (() => {
  const env = process.env.LOG_LEVEL;
  if (env && env in LEVEL_ORDER) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
})();

function emit(level: LogLevel, msg: string, context?: LogContext): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return;

  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...context,
  });

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

type BoundLogger = {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
};

function makeLogger(base?: LogContext): BoundLogger {
  return {
    debug: (msg, ctx) => emit("debug", msg, { ...base, ...ctx }),
    info: (msg, ctx) => emit("info", msg, { ...base, ...ctx }),
    warn: (msg, ctx) => emit("warn", msg, { ...base, ...ctx }),
    error: (msg, ctx) => emit("error", msg, { ...base, ...ctx }),
  };
}

export const logger = {
  ...makeLogger(),
  /** Create a child logger that merges `context` into every log line. */
  child: (context: LogContext): BoundLogger => makeLogger(context),
};
