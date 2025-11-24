import { type ConsolaInstance, createConsola } from 'consola'

export type LogLevelString = 'debug' | 'log' | 'warn' | 'error'

// Map log level strings to consola levels
// Consola levels: 0=fatal/error, 1=warn, 2=log, 3=info, 4=debug, 5=trace
const logLevelMap = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 4,
} as const satisfies Record<LogLevelString, number>

/**
 * Create a consola instance with the specified log level
 */
export const createLogger = (level: LogLevelString = 'log'): ConsolaInstance =>
  createConsola({
    level: logLevelMap[level],
  })
