/**
 * config/env.ts — single source of truth for ALL environment variables and feature flags.
 *
 * Usage:
 *   import { env } from "@/config/env"
 *   if (env.USE_STATIC_DATA) { ... }
 *
 * VITE_USE_STATIC_DATA=true  → use src/data/static.ts (no backend, no network calls)
 * VITE_USE_STATIC_DATA=false → call real API at VITE_API_BASE_URL
 */
export const env = {
  // API
  API_BASE_URL:       import.meta.env["VITE_API_BASE_URL"]              as string ?? "",

  // Data mode — THE most important flag
  USE_STATIC_DATA:    import.meta.env["VITE_USE_STATIC_DATA"]           === "true",

  // Auth
  FORCE_MS_SSO:       import.meta.env["VITE_FORCE_MICROSOFT_SSO"]       === "true",
  ENABLE_REGISTER:    import.meta.env["VITE_ENABLE_USER_REGISTRATION"]   === "true",

  // Microsoft / OneDrive
  AZURE_CLIENT_ID:    import.meta.env["AZURE_CLIENT_ID"]           as string ?? "",
  AZURE_TENANT_ID:    import.meta.env["VITE_AZURE_TENANT_ID"]           as string ?? "",
  AZURE_REDIRECT_URI: import.meta.env["VITE_AZURE_REDIRECT_URI"]        as string ?? "http://localhost:3000",
  ONEDRIVE_CLIENT_ID: import.meta.env["ONEDRIVE_CLIENT_ID"]        as string ?? "",

  // App
  APP_ENV:            (import.meta.env["VITE_APP_ENV"] as string)        ?? "development",
} as const

// Derived flags — computed once from env
export const isDev        = env.APP_ENV === "development"
export const isProd       = env.APP_ENV === "production"
export const useStaticData = env.USE_STATIC_DATA
