export type LogLevel = "debug" | "info" | "warn" | "error";

type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export const logger: Logger = {
  debug: (...args: unknown[]) => {
    // Using console.debug under the hood to keep Edge compatibility
    console.debug(...args);
  },
  info: (...args: unknown[]) => {
    console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

export default logger;
