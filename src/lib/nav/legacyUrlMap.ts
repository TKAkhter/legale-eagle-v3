/**
 * Maps legacy LMS-Web menu/route URLs to legal-eagle-web-v3 paths.
 * Backend /menu APIs still return old Fuse routes.
 */
const LEGACY_TO_V3: Record<string, string> = {
  "/dashboard": "/dashboard",
  "/leads": "/leads",
  "/myLeads": "/my-leads",
  "/my-leads": "/my-leads",
  "/clients": "/clients",
  "/matters": "/matters",
  "/check-conflict": "/matters/check-conflict",
  "/tasks": "/tasks",
  "/calendar": "/calendar",
  "/activity/calendar": "/calendar",
  "/time-log-entries": "/time-log-entries",
  "/activities": "/activities",
  "/billings": "/billings",
  "/billings/invoices": "/billings",
  "/invoice": "/billings",
  "/invoices": "/billings",
  "/invoice-approval": "/approvals/invoice",
  "/LFAs-approval": "/approvals/lfa",
  "/lfa-approval": "/approvals/lfa",
  "/task-approval": "/approvals/task",
  "/lfa": "/lfa",
  "/LFAs": "/lfa",
  "/defaultLFAs": "/lfa/default",
  "/default-lfas": "/lfa/default",
  "/clientLFAs": "/lfa/client",
  "/client-lfas": "/lfa/client",
  "/LFA-reports": "/lfa/reports",
  "/lfa/reports": "/lfa/reports",
  "/reports": "/reports/wip",
  "/reports/wip": "/reports/wip",
  "/wip-reports": "/reports/wip",
  "/billed-amount": "/reports/billed-amount",
  "/matter-billing": "/reports/matter-billing",
  "/utilization": "/reports/utilization",
  "/activity-history": "/reports/activity-history",
  "/collections": "/reports/collections",
  "/margin-erosion": "/reports/margin-erosion",
  "/myTeams": "/team",
  "/teams": "/team",
  "/team": "/team",
  "/calender/hearing": "/team/hearing-calendar",
  "/all/upcoming/hearings": "/team/upcoming-hearings",
  "/non-hourly-time-logs": "/timelogs/review",
  "/non-hourly-time-logs/review": "/timelogs/review",
  "/non-hourly-time-logs/pre-approval": "/timelogs/pre-approval",
  "/non-hourly-time-logs/approval": "/timelogs/approval",
  "/timelogs/review": "/timelogs/review",
  "/timelogs/pre-approval": "/timelogs/pre-approval",
  "/timelogs/approval": "/timelogs/approval",
  "/budgeting/cost-cards": "/budgeting/cost-cards",
  "/budgeting/budget-cards": "/budgeting/budget-cards",
  "/budgeting/rate-cards": "/budgeting/rate-cards",
  "/users": "/admin/users",
  "/accounts": "/admin/users",
  "/groups": "/admin/groups",
  "/locations": "/admin/locations",
  "/settings": "/admin/settings",
  "/tickets": "/tickets",
  "/raise/tickets": "/tickets",
  "/apps/mailbox": "/email",
  "/mails": "/email",
  "/email": "/email",
  "/integrations/onedrive": "/integrations/onedrive",
  "/onedrive": "/integrations/onedrive",
  "/profile": "/profile",
  "/department/analytics": "/dashboard",
}

/** Normalize path: trim, ensure leading slash, drop query/hash. */
export function normalizeMenuUrl(url?: string | null): string {
  if (!url) return ""
  const bare = String(url).split("?")[0].split("#")[0].trim()
  if (!bare) return ""
  return bare.startsWith("/") ? bare : `/${bare}`
}

/** Resolve a backend/menu URL to the v3 route path. */
export function resolveNavPath(url?: string | null): string {
  const normalized = normalizeMenuUrl(url)
  if (!normalized) return ""
  if (LEGACY_TO_V3[normalized]) return LEGACY_TO_V3[normalized]
  // Prefix matches for nested legacy settings etc.
  if (normalized.startsWith("/settings")) return "/admin/settings"
  if (normalized.startsWith("/lead/status") || normalized.startsWith("/lead/source")) return "/admin/settings"
  if (normalized.startsWith("/users")) return "/admin/users"
  if (normalized.startsWith("/groups")) return "/admin/groups"
  if (normalized.startsWith("/locations")) return "/admin/locations"
  if (normalized.startsWith("/billings")) return "/billings"
  if (normalized.startsWith("/reports")) return normalized
  return normalized
}

/**
 * Collect every URL variant that should unlock a v3 nav path:
 * the raw API url, normalized form, and remapped v3 path.
 */
export function collectAllowedPaths(rawUrls: string[]): Set<string> {
  const allowed = new Set<string>()
  for (const raw of rawUrls) {
    const normalized = normalizeMenuUrl(raw)
    if (!normalized) continue
    allowed.add(normalized)
    const resolved = resolveNavPath(normalized)
    if (resolved) {
      allowed.add(resolved)
      allowed.add(normalizeMenuUrl(resolved))
    }
  }
  return allowed
}

/** True if itemPath is allowed given the set of API (possibly legacy) URLs. */
export function isPathAllowed(itemPath: string | undefined, allowed: Set<string> | null): boolean {
  if (!allowed) return true
  if (!itemPath) return true
  const normalized = normalizeMenuUrl(itemPath)
  if (allowed.has(normalized)) return true
  const resolved = resolveNavPath(normalized)
  return allowed.has(resolved)
}
