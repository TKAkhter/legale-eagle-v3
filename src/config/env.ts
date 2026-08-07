/**
 * config/env.ts — ALL environment variables in one place.
 *
 * Copy .env.example to .env.local and set values for your environment.
 *
 * Key flags:
 *   VITE_USE_STATIC_DATA=true   → no backend needed, uses src/data/static.ts
 *   VITE_USE_STATIC_DATA=false  → calls real backend APIs
 *
 *   VITE_ENABLE_LOGS=true       → show debug logs in console (dev only)
 *   VITE_ENABLE_LOGS=false      → silent (production)
 *
 *   VITE_DYNAMIC_NAV=true       → sidebar nav comes from /api/user/get/access/menu
 *   VITE_DYNAMIC_NAV=false      → sidebar nav uses static config/navigation.ts
 */
export const env = {
  // ── Backend ────────────────────────────────────────────────────────────────
  API_BASE_URL:       (import.meta.env["VITE_API_BASE_URL"]        as string) ?? "",

  // ── Data mode ─────────────────────────────────────────────────────────────
  /** true = use static fixtures, no network calls to backend */
  USE_STATIC_DATA:    import.meta.env["VITE_USE_STATIC_DATA"]      === "true",

  // ── Navigation ────────────────────────────────────────────────────────────
  /**
   * true  = sidebar nav driven by /api/user/get/access/menu response
   * false = sidebar nav uses static navigationConfig in config/navigation.ts
   *         (useful when building UI without a backend)
   */
  DYNAMIC_NAV:        import.meta.env["VITE_DYNAMIC_NAV"]          !== "false",

  // ── Logging ───────────────────────────────────────────────────────────────
  /** true = show debug/info/warn/error logs in browser console */
  ENABLE_LOGS:        import.meta.env["VITE_ENABLE_LOGS"]          === "true",

  // ── Auth ──────────────────────────────────────────────────────────────────
  FORCE_MS_SSO:       import.meta.env["VITE_FORCE_MICROSOFT_SSO"]  === "true",
  ENABLE_REGISTER:    import.meta.env["VITE_ENABLE_USER_REGISTRATION"] === "true",

  // ── Microsoft / Azure ─────────────────────────────────────────────────────
  AZURE_CLIENT_ID:    (import.meta.env["VITE_AZURE_CLIENT_ID"]     as string) ?? "",
  AZURE_TENANT_ID:    (import.meta.env["VITE_AZURE_TENANT_ID"]     as string) ?? "",
  AZURE_REDIRECT_URI: (import.meta.env["VITE_AZURE_REDIRECT_URI"]  as string) ?? "http://localhost:3000",
  ONEDRIVE_CLIENT_ID: (import.meta.env["VITE_ONEDRIVE_CLIENT_ID"]  as string) ?? "",

  // ── App ───────────────────────────────────────────────────────────────────
  APP_ENV: (import.meta.env["VITE_APP_ENV"] as string) ?? "development",
} as const

/** Convenience flags — avoids repeating env.APP_ENV checks */
export const isDev  = env.APP_ENV === "development"
export const isProd = env.APP_ENV === "production"
