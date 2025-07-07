/**
 * Logger utility for server-side code
 * Logs can be disabled by setting the environment variable LOG_LEVEL=none
 */

// Log levels
const LOG_LEVELS = {
  NONE: 'none',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Current log level (defaults to 'info' if not set)
const currentLogLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

// Log level hierarchy
const logLevelHierarchy = {
  [LOG_LEVELS.NONE]: 0,
  [LOG_LEVELS.ERROR]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.INFO]: 3,
  [LOG_LEVELS.DEBUG]: 4,
};

/**
 * Check if a given log level should be displayed
 */
function shouldLog(level: string): boolean {
  const requestedLevel = logLevelHierarchy[level] || 3; // Default to INFO
  const configuredLevel = logLevelHierarchy[currentLogLevel] || 3;
  return requestedLevel <= configuredLevel;
}

/**
 * Logger functions
 */
export default {
  error: (context: string, ...args: any[]): void => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(`[ERROR][${context}]`, ...args);
    }
  },
  warn: (context: string, ...args: any[]): void => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(`[WARN][${context}]`, ...args);
    }
  },
  info: (context: string, ...args: any[]): void => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(`[INFO][${context}]`, ...args);
    }
  },
  debug: (context: string, ...args: any[]): void => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`[DEBUG][${context}]`, ...args);
    }
  },
  // Legacy method to match console.log signature
  log: (context: string, ...args: any[]): void => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(`[${context}]`, ...args);
    }
  },
};
