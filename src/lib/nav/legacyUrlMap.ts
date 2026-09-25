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
  "/billing": "/billing",
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
  "/LFA-report": "/lfa/reports",
  "/lfa-report": "/lfa/reports",
  "/lfa/reports": "/lfa/reports",
  "/reports": "/reports",
  "/reports/hub": "/reports",
  "/reports/wip": "/reports/wip",
  "/wip-reports": "/reports/wip",
  "/wip-reports/": "/reports/wip",
  "/hearings": "/hearings",
  /** Bare `/hearing` menu → queue; detail (`?m_id=&id=`) via resolveLegacyHearingUrl / LegacyHearingRedirect. */
  "/hearing": "/hearings",
  "/hearing/selection": "/hearings",
  "/all-hearings": "/hearings",
  "/hearing-list": "/hearings",
  "/hearing/list": "/hearings",
  "/hearing-history": "/hearings/history",
  "/hearing/history": "/hearings/history",
  "/hearing/history/sidebar": "/hearings/history",
  "/payment": "/payment",
  "/make-payment": "/payment",
  "/invoice-payment": "/payment",
  "/billed-amount": "/reports/billed-amount",
  "/matter-billing": "/reports/matter-billing",
  "/matter-billing-report": "/reports/matter-billing",
  "/matter-wise-billing": "/reports/matter-billing",
  "/matter/wise/billing/reports": "/reports/matter-billing",
  "/utilization": "/reports/utilization",
  "/utilization-report": "/reports/utilization",
  "/activity-history": "/reports/activity-history",
  "/activity-history-report": "/reports/activity-history",
  "/collections": "/reports/collections",
  "/collections-report": "/reports/collections",
  "/margin-erosion": "/reports/margin-erosion",
  "/margin-erosion-report": "/reports/margin-erosion",
  "/aging": "/reports/aging",
  "/aging-report": "/reports/aging",
  "/billing-aging": "/reports/aging",
  "/dues-report": "/reports/dues",
  "/report-dues": "/reports/dues",
  "/report-collections": "/reports/collections",
  "/report-matters": "/reports/matters",
  "/matters-report": "/reports/matters",
  "/report-tasks": "/reports/tasks",
  "/tasks-report": "/reports/tasks",
  "/report-hearings": "/reports/hearings",
  "/hearings-report": "/reports/hearings",
  "/attorney-revenue": "/reports/attorney-revenue",
  "/attorney-revenue-report": "/reports/attorney-revenue",
  "/billed-amount-report": "/reports/billed-amount",
  "/util-report": "/reports/utilization",
  "/wip-report": "/reports/wip",
  "/profit-loss-report": "/reports/profit-loss",
  "/profit/loss/report": "/reports/profit-loss",
  "/referal-report": "/reports/referral",
  "/referral-report": "/reports/referral",
  "/cost-analysis": "/reports/cost-analysis",
  "/cost-analysis-report": "/reports/cost-analysis",
  "/zoho-outstanding": "/reports/zoho-outstanding",
  "/non-converted-leads": "/reports/non-converted-leads",
  "/non/converted/leads": "/reports/non-converted-leads",
  "/purged-discounted-report": "/reports/purged-discounted",
  "/purged/discounted/report": "/reports/purged-discounted",
  "/purged-discounted": "/reports/purged-discounted",
  "/report-invoices": "/reports/invoices",
  "/invoices-report": "/reports/invoices",
  "/report-leads": "/reports/leads",
  "/leads-report": "/reports/leads",
  "/report-activities": "/reports/activities",
  "/activities-report": "/reports/activities",
  "/deposit/balance/reports": "/reports/deposit-balance",
  "/deposit-balance-report": "/reports/deposit-balance",
  "/user-timelog-entries": "/reports/user-timelog-entries",
  "/rating-report": "/reports/rating",
  "/posts": "/reports/posts",
  "/wip-department-report": "/reports/wip?tab=department",
  "/wip-attorney-report": "/reports/wip?tab=attorney",
  "/wip-matter-report": "/reports/wip?tab=matter",
  "/reports/wip-department": "/reports/wip?tab=department",
  "/reports/wip-attorney": "/reports/wip?tab=attorney",
  "/reports/wip-matter": "/reports/wip?tab=matter",
  "/retainer-statement-report": "/reports/retainer-statement",
  "/matter/report/summary": "/reports/matter-summary",
  "/closed/matters/": "/reports/closed-matters",
  "/closed/matters": "/reports/closed-matters",
  "/fee/earner/billed/in/matter/report": "/reports/fee-earner-billed",
  "/task/average/reports": "/reports/task-average",
  "/fixed/balance/amount/reports": "/reports/fixed-balance",
  "/billing-report/based/on/lfa": "/reports/billing-by-lfa",
  "/billable/by/department": "/reports/billable-by-department",
  "/report/audit": "/reports/audit",
  "/report/onedrive": "/reports/onedrive",
  "/favourite-clients/reports": "/reports/favourite-clients",
  "/favourite-client/detail": "/reports/favourite-clients",
  "/pending-approval-timelogs": "/timelogs/pending",
  "/non-hourly-time-logs-pre-approval": "/timelogs/pre-approval",
  "/non-hourly-time-logs-approval": "/timelogs/approval",
  "/lead/upload": "/lead/upload",
  "/fixedfee-revenue-allocation": "/reports/fixedfee-revenue-allocation",
  "/procuredby-report": "/reports/procured-by",
  "/lead-value-report": "/reports/lead-value",
  "/leads-reduction-report": "/reports/leads-reduction",
  "/fixed-session-matter-summary-report": "/reports/matter-revenue-summary",
  "/estimate-hours-by-designation-report": "/reports/estimate-hours-by-designation",
  "/revenue-budget-report": "/reports/revenue-budget",
  "/billing-rate-analysis": "/reports/billing-rate-analysis",
  "/matter-billing-snapshot-report": "/reports/matter-billing-snapshot",
  "/margin-erosion-cache-report": "/reports/margin-erosion-cache",

  "/transfer/client/to/client": "/clients/transfer",
  "/multistepstasks": "/tasks/multi-step",
  "/multistepstasks/add": "/tasks/multi-step",
  "/document/remindar": "/document-reminders",
  "/document/reminder": "/document-reminders",
  "/editor": "/editor",
  "/documents/editor": "/editor",
  "/referral-partners": "/clients/referral-partners",
  "/short-matter/add": "/matters/short",
  "/short-matter/details": "/matters/short",
  "/short-matter/edit": "/matters/short",
  "/matters/move": "/matters/short",
  "/pending/matter": "/matters/pending",
  "/pending-matter": "/matters/pending",
  "/pending/matters": "/matters/pending",
  "/translation-courier": "/billings/translation-courier",
  "/invoices-snaps": "/billings/invoice-snaps",
  "/department-invoice-approval": "/approvals/department-invoice",
  "/department-activity-approval": "/approvals/department-activity",
  "/meeting-time": "/admin/settings/meeting-time",
  "/myTeams": "/team",
  "/myTeam": "/team",
  "/teams": "/admin/teams",
  "/team": "/team",
  "/audit-log": "/admin/audit-log",
  "/audit/log": "/admin/audit-log",
  "/individual/modification": "/admin/individual-permissions",
  "/individual-modification": "/admin/individual-permissions",
  "/activity/access/permission": "/admin/activity-access",
  "/activity/access": "/admin/activity-access",
  "/activity/extrapermission": "/admin/extra-permissions",
  "/activity/extra-permission": "/admin/extra-permissions",
  "/matter-mail": "/matter-mail",
  "/calender/hearing": "/team/hearing-calendar",
  "/all/upcoming/hearings": "/team/upcoming-hearings",
  "/non-hourly-time-logs": "/timelogs/review",
  "/non-hourly-time-logs/review": "/timelogs/review",
  "/non-hourly-time-logs/pre-approval": "/timelogs/pre-approval",
  "/non-hourly-time-logs/approval": "/timelogs/approval",
  "/timelogs/review": "/timelogs/review",
  "/timelogs/pre-approval": "/timelogs/pre-approval",
  "/timelogs/approval": "/timelogs/approval",
  "/timelogs/pending": "/timelogs/pending",
  "/timelogs/approved": "/timelogs/approved",
  "/pending-timelogs": "/timelogs/pending",
  "/pending/timelogs": "/timelogs/pending",
  "/approved-timelogs": "/timelogs/approved",
  "/approved/timelogs": "/timelogs/approved",
  "/write-off-history": "/billings/history",
  "/writeOffHistory": "/billings/history",
  "/credit-history": "/billings/history",
  "/billings/history": "/billings/history",
  "/matter-selection": "/matter-selection",
  "/matterSelection": "/matter-selection",
  "/select-matter": "/matter-selection",
  "/budgeting/cost-cards": "/budgeting/cost-cards",
  "/budgeting/budget-cards": "/budgeting/budget-cards",
  "/budgeting/rate-cards": "/budgeting/rate-cards",
  "/rate-cards": "/rate-cards",
  "/rateCards": "/rate-cards",
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
  "/requestMatter/add": "/matters/requests",
  "/requestMatter/edit": "/matters/requests",
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
  "/practice-area": "/admin/settings/practice-areas",
  "/refer/client": "/admin/settings/refer-client",
  "/lead/status": "/admin/settings/masters/lead-status",
  "/lead/source": "/admin/settings/lead-sources",
  "/working-days": "/admin/settings/working-days",
  "/docs-type": "/admin/settings/masters/docs-type",
  "/rates": "/admin/settings/masters/rates",
  "/session": "/admin/settings/masters/session",
  "/hearing/types": "/admin/settings/masters/hearing-types",
  "/case/types": "/admin/settings/masters/case-types",
  "/designations": "/admin/settings/designations",
  "/departments": "/admin/settings/departments",
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
  // Detail: `/edit/tickets/:id` handled in resolveNavPath prefix match
  "/apps/mailbox": "/email",
  "/mails": "/email",
  "/mail": "/email",
  "/email": "/email",
  "/pending/approval": "/approvals/lfa",
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

/**
 * Map LMS hearing detail deep-links to v3.
 * OLD: `/hearing?m_id={matterId}&id={hearingId}` → NEW: `/hearings/{hearingId}?matterId=`
 */
export function resolveLegacyHearingUrl(url?: string | null): string | null {
  if (!url) return null
  const raw = String(url).trim()
  if (!raw) return null
  try {
    const u = new URL(raw, "http://local")
    const path = normalizeMenuUrl(u.pathname)
    const hearingId = u.searchParams.get("id") || u.searchParams.get("hearingId")
    const matterId = u.searchParams.get("m_id") || u.searchParams.get("matterId")
    if (path === "/hearing" && hearingId) {
      const q = matterId ? `?matterId=${encodeURIComponent(matterId)}` : ""
      return `/hearings/${encodeURIComponent(hearingId)}${q}`
    }
    const m = path.match(/^\/hearing\/([^/]+)$/)
    if (m && !["selection", "history", "list", "types", "locations"].includes(m[1])) {
      const q = matterId ? `?matterId=${encodeURIComponent(matterId)}` : ""
      return `/hearings/${encodeURIComponent(m[1])}${q}`
    }
  } catch {
    return null
  }
  return null
}

/**
 * Map LMS invoice approve deep-links (email / in-app) to v3.
 * OLD:
 *   /:attorneyId/:invoiceId/approve-invoice
 *   /:attorneyId/:invoiceId/approve-invoice/:invoiceNumber/:invoicePrefix/:approveId/:matterId
 *   /:attorneyId/:invoiceId/approve-department-invoice/.../:approveId/:matterId/:isDepartment
 * NEW: /approvals/invoice?invoiceId=&approveId=  (or /approvals/department-invoice)
 */
export function resolveLegacyApproveInvoiceUrl(url?: string | null): string | null {
  if (!url) return null
  const raw = String(url).trim()
  if (!raw) return null
  try {
    const u = new URL(raw, "http://local")
    const path = normalizeMenuUrl(u.pathname)
    const dept = path.match(
      /^\/([^/]+)\/([^/]+)\/approve-department-invoice(?:\/([^/]*)\/([^/]*)\/([^/]+)\/([^/]+)\/([^/]+))?$/,
    )
    if (dept) {
      const invoiceId = dept[2]
      const approveId = dept[5]
      const qs = new URLSearchParams()
      if (invoiceId) qs.set("invoiceId", invoiceId)
      if (approveId) qs.set("approveId", approveId)
      const q = qs.toString()
      return q ? `/approvals/department-invoice?${q}` : "/approvals/department-invoice"
    }
    const m = path.match(
      /^\/([^/]+)\/([^/]+)\/approve-invoice(?:\/([^/]*)\/([^/]*)\/([^/]+)\/([^/]+))?$/,
    )
    if (m) {
      const invoiceId = m[2]
      const approveId = m[5]
      const qs = new URLSearchParams()
      if (invoiceId) qs.set("invoiceId", invoiceId)
      if (approveId) qs.set("approveId", approveId)
      const q = qs.toString()
      return q ? `/approvals/invoice?${q}` : "/approvals/invoice"
    }
  } catch {
    return null
  }
  return null
}

/**
 * Map LMS create-document deep-links to v3 query names.
 * OLD: `/editor?id={relatedToId}&type={MATTER|HEARING|…}`
 * NEW: `/editor?relatedTo=&relatedToId=` (also accepts legacy type/id on the page)
 */
export function resolveLegacyEditorUrl(url?: string | null): string | null {
  if (!url) return null
  const raw = String(url).trim()
  if (!raw) return null
  try {
    const u = new URL(raw, "http://local")
    const path = normalizeMenuUrl(u.pathname)
    if (path !== "/editor" && path !== "/documents/editor") return null
    const relatedTo =
      u.searchParams.get("relatedTo") || u.searchParams.get("type")
    const relatedToId =
      u.searchParams.get("relatedToId") || u.searchParams.get("id")
    const title = u.searchParams.get("title")
    const qs = new URLSearchParams()
    if (relatedTo) qs.set("relatedTo", relatedTo)
    if (relatedToId) qs.set("relatedToId", relatedToId)
    if (title) qs.set("title", title)
    const q = qs.toString()
    return q ? `/editor?${q}` : "/editor"
  } catch {
    return null
  }
}

/** Resolve a backend/menu URL to the v3 route path. */
export function resolveNavPath(url?: string | null): string {
  const hearingDetail = resolveLegacyHearingUrl(url)
  if (hearingDetail) return hearingDetail
  const approveInvoice = resolveLegacyApproveInvoiceUrl(url)
  if (approveInvoice) return approveInvoice
  const editor = resolveLegacyEditorUrl(url)
  if (editor) return editor
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
  if (normalized.startsWith("/hearings/")) return normalized
  const editTicket = normalized.match(/^\/edit\/tickets\/([^/]+)$/)
  if (editTicket) return `/tickets/${editTicket[1]}`
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
