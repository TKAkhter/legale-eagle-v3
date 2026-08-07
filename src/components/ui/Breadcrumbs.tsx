/**
 * Breadcrumbs — auto-generated from the current route path.
 *
 * Usage:
 *   <Breadcrumbs />                    — auto from URL
 *   <Breadcrumbs items={[...]}  />     — manual override
 */
import { Link, useLocation } from "react-router-dom"
import {
  Breadcrumbs as MuiBreadcrumbs,
  Typography, Box,
} from "@mui/material"
import NavigateNextIcon from "@mui/icons-material/NavigateNext"

interface BreadcrumbItem { label: string; path?: string }
interface Props { items?: BreadcrumbItem[] }

// Human-readable labels for URL segments
const LABELS: Record<string, string> = {
  dashboard: "Dashboard", leads: "Leads", clients: "Clients",
  matters: "Matters", billing: "Billing", billings: "Billing",
  tasks: "Tasks", timelogs: "Time Logs", lfa: "LFA", reports: "Reports",
  admin: "Admin", users: "Users", groups: "Groups", settings: "Settings",
  locations: "Locations", team: "Team", calendar: "Calendar",
  approvals: "Approvals", budgeting: "Budgeting", integrations: "Integrations",
  onedrive: "OneDrive", wip: "WIP Reports", "matter-billing": "Matter Billing",
  "cost-cards": "Cost Cards", "rate-cards": "Rate Cards", "budget-cards": "Budget Cards",
  new: "New", edit: "Edit", detail: "Detail",
}

function labelFor(seg: string): string {
  return LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\w/g, c => c.toUpperCase())
}

export function Breadcrumbs({ items }: Props) {
  const location = useLocation()

  const crumbs: BreadcrumbItem[] = items ?? (() => {
    const segs = location.pathname.split("/").filter(Boolean)
    return segs.map((seg, i) => ({
      label: labelFor(seg),
      path: i < segs.length - 1 ? "/" + segs.slice(0, i + 1).join("/") : undefined,
    }))
  })()

  if (crumbs.length <= 1) return null

  return (
    <Box sx={{ mb: 1.5 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
        sx={{ "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" } }}
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return isLast || !c.path
            ? <Typography key={i} variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>{c.label}</Typography>
            : (
              <Link key={i} to={c.path} style={{ textDecoration: "none" }}>
                <Typography variant="caption" sx={{ color: "text.disabled", "&:hover": { color: "primary.main" }, transition: "color 150ms" }}>
                  {c.label}
                </Typography>
              </Link>
            )
        })}
      </MuiBreadcrumbs>
    </Box>
  )
}
