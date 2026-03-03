const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info(message: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn(message: string, ...args: unknown[]) {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
