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
  "/expense-billing": "/billings/expense",
  "/contingent-billing": "/billings/contingent",
  "/non-contingent-billing": "/billings/non-contingent",
  "/success-rate": "/billings/success-rate",
  "/enforcement": "/billings/enforcement",
  "/receipts": "/billings/receipts",
  "/credit-notes": "/billings/credit-notes",
  "/creditNotes": "/billings/credit-notes",
  "/retainer-billing": "/billings/retainer",
  "/retainerBilling": "/billings/retainer",
  "/retainer-history": "/billings/retainer-history",
  "/retainer-statements": "/billings/retainer-statements",
  "/write-off": "/billings/write-off",
  "/writeOff": "/billings/write-off",
  "/task-templates": "/tasks/templates",
  "/task-template": "/tasks/templates",
  "/invoice-approval": "/approvals/invoice",
  "/LFAs-approval": "/approvals/lfa",
  "/lfa-approval": "/approvals/lfa",
  "/task-approval": "/approvals/task",
  "/lfa": "/lfa",
  "/LFAs": "/lfa",
  "/amendLFA": "/lfa",
  "/partial-amendLFA": "/lfa",
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
  "/aging": "/reports/aging",
  "/billing-aging": "/reports/aging",
  "/myTeams": "/team",
  "/myTeam": "/team",
  "/teams": "/team",
  "/team": "/team",
  "/audit-log": "/admin/audit-log",
  "/audit/log": "/admin/audit-log",
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
  "/accounts": "/admin/bank-accounts",
  "/bank-accounts": "/admin/bank-accounts",
  "/vendors": "/vendors",
  "/my-leaves": "/leaves",
  "/leaves": "/leaves",
  "/leave-applications": "/leave-applications",
  "/payrolls": "/payrolls",
  "/payrolls/add": "/payrolls",
  "/team-templates": "/team/templates",
  "/team-template": "/team/templates",
  "/requestMatters": "/matters/requests",
  "/requestMatter": "/matters/requests",
  "/my-requestedMatters": "/matters/requests",
  "/internal-leads": "/internal-leads",
  "/internalLeads": "/internal-leads",
  "/hr/income": "/admin/settings/masters/hr-income",
  "/hr/deduction": "/admin/settings/masters/hr-deduction",
  "/hr/grade": "/admin/settings/masters/hr-grade",
  "/hr/leaves": "/admin/settings/masters/hr-leaves",
  "/groups": "/admin/groups",
  "/locations": "/admin/locations",
  "/settings": "/admin/settings",
  "/company-info": "/admin/settings/company",
  "/practice-area": "/admin/settings/masters/practice-area",
  "/lead/status": "/admin/settings/masters/lead-status",
  "/lead/source": "/admin/settings/masters/lead-source",
  "/working-days": "/admin/settings/working-days",
  "/docs-type": "/admin/settings/masters/docs-type",
  "/rates": "/admin/settings/masters/rates",
  "/session": "/admin/settings/masters/session",
  "/hearing/types": "/admin/settings/masters/hearing-types",
  "/case/types": "/admin/settings/masters/case-types",
  "/designations": "/admin/settings/masters/designations",
  "/departments": "/admin/settings/masters/departments",
  "/breakdowns": "/admin/settings/masters/breakdowns",
  "/set/my/dashboard": "/admin/settings/my-dashboard",
  "/group/config": "/admin/groups",
  "/invoice-sequence-configuration": "/admin/settings/invoice-sequence",
  "/add/customfields": "/admin/settings/custom-fields",
  "/user-notifications": "/admin/settings/user-notifications",
  "/credit-categories": "/admin/settings/masters/credit-categories",
  "/matter-stop-working-reasons": "/admin/settings/masters/matter-stop-working-reasons",
  "/estimated-hours-by-designation": "/admin/settings/estimated-hours",
  "/team-roles-management": "/admin/settings/team-roles",
  "/settings/conflict-check-settings": "/admin/settings/conflict-check",
  "/zoho/id-configuration": "/admin/settings/zoho/id",
  "/zoho/integration-options": "/admin/settings/zoho/integration",
  "/zoho/ledgers": "/admin/settings/zoho/ledgers",
  "/analytics/permissions": "/admin/settings/analytics-permissions",
  "/tickets": "/tickets",
  "/raise/tickets": "/tickets",
  "/apps/mailbox": "/email",
  "/mails": "/email",
  "/email": "/email",
  "/integrations/onedrive": "/integrations/onedrive",
  "/onedrive": "/integrations/onedrive",
  "/profile": "/profile",
  "/department/analytics": "/department/analytics",
  "/apps/dashboards/analytics": "/department/analytics",
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
