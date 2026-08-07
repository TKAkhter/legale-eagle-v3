/**
 * lib/logger.ts — structured logging for the app.
 *
 * Logs are gated by VITE_ENABLE_LOGS=true in .env.
 * Set to false in production to keep the console clean.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *
 *   logger.info("LeadsPage", "Fetching leads", { page: 1 })
 *   logger.error("authApi", "Sign in failed", error)
 *   logger.debug("DataGrid", "Sort changed", { field: "createdAt", dir: "desc" })
 *   logger.warn("authStore", "Token missing — redirecting to login")
 *
 * In production (VITE_ENABLE_LOGS=false): no output at all.
 * In development (VITE_ENABLE_LOGS=true): colour-coded console output.
 */

const ENABLED = import.meta.env["VITE_ENABLE_LOGS"] === "true"

/** Log levels — mirrors pino/standard logging conventions */
type Level = "debug" | "info" | "warn" | "error"

/** Colour map for dev console */
const COLOURS: Record<Level, string> = {
  debug: "#6B7280",   // gray
  info:  "#3B82F6",   // blue
  warn:  "#F59E0B",   // amber
  error: "#EF4444",   // red
}

/** Emoji prefix for quick visual scanning */
const EMOJI: Record<Level, string> = {
  debug: "🔍",
  info:  "ℹ️",
  warn:  "⚠️",
  error: "❌",
}

function log(level: Level, source: string, message: string, data?: unknown) {
  if (!ENABLED) return

  const colour = COLOURS[level]
  const emoji  = EMOJI[level]
  const time   = new Date().toTimeString().slice(0, 8)

  // Group format: [HH:MM:SS] EMOJI [SOURCE] message
  const prefix = `%c${emoji} [${source}]%c ${message}`
  const styles = [`color: ${colour}; font-weight: bold`, "color: inherit"]

  if (data !== undefined) {
    console.groupCollapsed(prefix, ...styles, `  @${time}`)
    console.log(data)
    console.groupEnd()
  } else {
    console.log(prefix, ...styles, `  @${time}`)
  }
}

export const logger = {
  /**
   * Debug — verbose details for development.
   * e.g. component renders, state changes, cache hits
   */
  debug: (source: string, message: string, data?: unknown) =>
    log("debug", source, message, data),

  /**
   * Info — normal app events worth knowing about.
   * e.g. user signed in, page loaded, API call succeeded
   */
  info: (source: string, message: string, data?: unknown) =>
    log("info", source, message, data),

  /**
   * Warn — something unexpected but recoverable.
   * e.g. missing optional config, falling back to default
   */
  warn: (source: string, message: string, data?: unknown) =>
    log("warn", source, message, data),

  /**
   * Error — something failed. Always log data so we can debug.
   * e.g. API error, validation failure, missing required field
   */
  error: (source: string, message: string, data?: unknown) =>
    log("error", source, message, data),
}
