import { logger } from "@/lib/logger";

type TimingLogOptions = {
  infoAtMs?: number;
  warnAtMs?: number;
  context?: Record<string, unknown>;
};

export type ServerTimingMetric = {
  name: string;
  durationMs: number;
};

const DEFAULT_INFO_THRESHOLD_MS = 150;
const DEFAULT_WARN_THRESHOLD_MS = 600;

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function roundDuration(durationMs: number) {
  return Number(durationMs.toFixed(1));
}

export function startTimer() {
  const startedAt = nowMs();

  return {
    elapsedMs() {
      return roundDuration(nowMs() - startedAt);
    },
  };
}

export async function measureAsync<T>(work: () => Promise<T>) {
  const timer = startTimer();
  const result = await work();

  return {
    result,
    durationMs: timer.elapsedMs(),
  };
}

export function logTimedOperation(
  name: string,
  durationMs: number,
  options: TimingLogOptions = {}
) {
  const roundedDuration = roundDuration(durationMs);
  const payload = {
    durationMs: roundedDuration,
    ...(options.context ?? {}),
  };

  if (roundedDuration >= (options.warnAtMs ?? DEFAULT_WARN_THRESHOLD_MS)) {
    logger.warn(`${name} was slow.`, payload);
    return;
  }

  if (roundedDuration >= (options.infoAtMs ?? DEFAULT_INFO_THRESHOLD_MS)) {
    logger.info(`${name} completed.`, payload);
    return;
  }

  logger.debug(`${name} completed.`, payload);
}

export function applyServerTiming(
  headers: Headers,
  metrics: ServerTimingMetric[]
) {
  const headerValue = metrics
    .filter((metric) => Number.isFinite(metric.durationMs) && metric.durationMs >= 0)
    .map((metric) => `${metric.name};dur=${roundDuration(metric.durationMs)}`)
    .join(", ");

  if (headerValue) {
    headers.set("Server-Timing", headerValue);
  }
}
