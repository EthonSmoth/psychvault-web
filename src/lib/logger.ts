const isProduction = process.env.NODE_ENV === "production";

function formatMessage(message: unknown, ...args: unknown[]) {
  const formatted = [message, ...args].map((item) => {
    if (item instanceof Error) {
      return item.stack || item.message;
    }
    if (typeof item === "object" && item !== null) {
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    }
    return String(item);
  });
  return formatted.join(" ");
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
