/**
 * Audit Log — who changed what and when.
 *
 * Required for compliance in legal software.
 * Shows actor, action type, module, record, before/after changes, IP, timestamp.
 *
 * Colour-coded action badges:
 *   CREATE  → green    UPDATE  → blue
 *   DELETE  → red      APPROVE → purple
 *   CONVERT → teal     LOGIN   → gray
 *
 * Static mode: uses auditLog from src/data/static.ts
 * Live mode:   calls /api/audit/log
 */
import { useState } from "react"
import { Box, Button, Chip, Typography } from "@mui/material"
import { PageShell }   from "@/components/ui/PageShell"
import { DataGrid }    from "@components/data-grid/DataGrid"
import { SearchInput } from "@components/filters/SearchInput"
import { activityApi } from "@/api/activity"
import { formatDateTime } from "@lib/utils/formatDate"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"

const ACTION_COLOURS: Record<string, "success"|"primary"|"error"|"secondary"|"info"|"default"|"warning"> = {
  CREATE:  "success",
  UPDATE:  "primary",
  DELETE:  "error",
  APPROVE: "secondary",
  CONVERT: "info",
  LOGIN:   "default",
  LOGOUT:  "default",
}

function AuditFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [q, setQ] = useState(String(filters.searchText ?? ""))
  return (
    <Box sx={{ display:"flex", gap:1.5, alignItems:"flex-end", flexWrap:"wrap" }}>
      <SearchInput value={q} onChange={setQ} placeholder="Search actor, module, record…" />
      <Button variant="contained" size="small" onClick={() => onSearch({ searchText: q })}>Search</Button>
      <Button size="small" onClick={() => { setQ(""); onReset() }}>Reset</Button>
    </Box>
  )
}

export default function AuditLogPage() {
  return (
    <PageShell
      title="Audit Log"
      description="Complete history of all data changes — who changed what and when"
    >
      <DataGrid
        columns={[
          {
            field: "createdAt",
            header: "Timestamp",
            sortKey: "createdAt",
            renderCell: (v) => (
              <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: 11 }}>
                {formatDateTime(String(v ?? ""))}
              </Typography>
            ),
          },
          { field: "actor",  header: "User",   sortKey: "actor" },
          {
            field: "action",
            header: "Action",
            renderCell: (v) => (
              <Chip
                size="small"
                label={String(v ?? "")}
                color={ACTION_COLOURS[String(v ?? "")] ?? "default"}
                variant="outlined"
                sx={{ fontSize: 11, fontWeight: 600 }}
              />
            ),
          },
          { field: "module", header: "Module", sortKey: "module" },
          { field: "record", header: "Record", sortKey: "record" },
          {
            field: "changes",
            header: "Changes",
            renderCell: (v) => {
              const changes = v as Record<string, { from: string; to: string }>
              const entries = Object.entries(changes ?? {})
              if (!entries.length) return <Typography variant="caption" color="text.disabled">—</Typography>
              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                  {entries.slice(0, 2).map(([field, change]) => (
                    <Typography key={field} variant="caption" sx={{ fontSize: 11 }}>
                      <strong>{field}:</strong>{" "}
                      <Box component="span" sx={{ color: "error.main", textDecoration: "line-through" }}>{change.from}</Box>
                      {" → "}
                      <Box component="span" sx={{ color: "success.main" }}>{change.to}</Box>
                    </Typography>
                  ))}
                  {entries.length > 2 && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                      +{entries.length - 2} more
                    </Typography>
                  )}
                </Box>
              )
            },
          },
          { field: "ip", header: "IP Address", renderCell: (v) => (
            <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: 11, color: "text.secondary" }}>
              {String(v ?? "—")}
            </Typography>
          )},
        ]}
        queryKey={["audit", "log"]}
        queryFn={(p: GridParams) =>
          activityApi.getAuditLog(p) as unknown as Promise<import("@/types/common.types").PageResponse<Record<string, unknown>>>
        }
        FilterPanel={AuditFilters}
        hasFilters
        syncWithUrl
        defaultSortBy="createdAt"
        defaultSortDir="desc"
        zebraStriping
      />
    </PageShell>
  )
}
