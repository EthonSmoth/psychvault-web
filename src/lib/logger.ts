const isProduction = process.env.NODE_ENV === "production";
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|email|password|secret|signature|token|payment|stripe/i;

function formatValue(value: unknown, depth = 0): string {
  if (value instanceof Error) {
    return isProduction ? `${value.name}: ${value.message}` : value.stack || value.message;
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (typeof value === "object" && value !== null) {
    if (depth > 1) {
      return "[object]";
    }

    if (Array.isArray(value)) {
      const preview = value.slice(0, 5).map((item) => formatValue(item, depth + 1));
      return `[${preview.join(", ")}${value.length > 5 ? ", ..." : ""}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).slice(0, 10);
    const preview = entries.map(([key, item]) => {
      const formattedValue = SENSITIVE_KEY_PATTERN.test(key)
        ? "[redacted]"
        : formatValue(item, depth + 1);
      return `${key}: ${formattedValue}`;
    });

    return `{ ${preview.join(", ")}${entries.length >= 10 ? ", ..." : ""} }`;
  }

  return String(value);
}

function formatMessage(message: unknown, ...args: unknown[]) {
  return [message, ...args].map((item) => formatValue(item)).join(" ");
}

export const logger = {
  info(message: unknown, ...args: unknown[]) {
    console.info("[PsychVault]", formatMessage(message, ...args));
  },
  warn(message: unknown, ...args: unknown[]) {
    console.warn("[PsychVault]", formatMessage(message, ...args));
  },
  error(message: unknown, ...args: unknown[]) {
    console.error("[PsychVault]", formatMessage(message, ...args));
  },
  debug(message: unknown, ...args: unknown[]) {
    if (!isProduction) {
      console.debug("[PsychVault]", formatMessage(message, ...args));
    }
  },
};
