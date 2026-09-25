/**
 * Shared lead list columns — `/leads` and `/my-leads` Assigned tab.
 */
import { Chip } from "@mui/material"
import type { ColumnDef } from "@components/data-grid/types"
import { StatusBadge } from "@components/ui/StatusBadge"
import { formatDate } from "@lib/utils/formatDate"

export function getLeadListColumns(): ColumnDef<Record<string, unknown>>[] {
  return [
    { field: "name", header: "Name", minWidth: 200, width: 220 },
    {
      field: "email",
      header: "Contact",
      minWidth: 200,
      width: 220,
      renderCell: (_, row) => {
        const r = row as { email?: string; phone?: string }
        return [r.email, r.phone].filter(Boolean).join(" · ") || "—"
      },
    },
    { field: "status", header: "Lead Status", minWidth: 140, width: 150, renderCell: v => <StatusBadge status={String(v ?? "")} /> },
    { field: "lastStatusUpdatedDate", header: "Last Status Update", minWidth: 160, width: 170, renderCell: v => v ? formatDate(String(v)) : "—" },
    { field: "leadSource", header: "Lead Source", minWidth: 140, width: 160 },
    { field: "practiceArea", header: "Department/ Practice Area", minWidth: 180, width: 200 },
    { field: "dispute", header: "Dispute", minWidth: 200, width: 240 },
    { field: "followUp", header: "Follow Up", minWidth: 160, width: 180 },
    { field: "conflictCheckStatus", header: "Conflict", minWidth: 120, width: 130, renderCell: v => <Chip size="small" label={String(v || "—")} variant="outlined" /> },
    { field: "attorneyName", header: "Allotted Lawyer", minWidth: 160, width: 180 },
    { field: "createdBy", header: "Created By", minWidth: 140, width: 160 },
    { field: "partyOpposing", header: "Party Opposing", minWidth: 160, width: 180 },
    { field: "createdAt", header: "Created Date", minWidth: 140, width: 150, renderCell: v => v ? formatDate(String(v)) : "—" },
  ]
}
