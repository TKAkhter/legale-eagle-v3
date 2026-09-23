import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { SummaryCard, StatsGrid } from "./SummaryCard"

interface RoleRow {
  roleId?: string | null
  roleName?: string
  count?: number
  roles?: RoleRow[] | null
}

const COLORS = ["#0F3C6E", "#00B4A6", "#365E92", "#B45309", "#7C3AED", "#DC2626"]

export function MatterRolesPanel({ onCount }: { onCount?: (n: number | null) => void }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)

  const summary = useQuery({
    queryKey: ["dashboard", "role-summary"],
    queryFn: async () => {
      const roles = await dashboardApi.myRoleSummary() as RoleRow[]
      const total = roles.find(r => r.roleName === "Total")?.count
        ?? roles.reduce((s, r) => s + (r.roleName === "Total" ? 0 : Number(r.count ?? 0)), 0)
      onCount?.(total ?? null)
      return roles
    },
    staleTime: 60_000,
  })

  const matters = useQuery({
    queryKey: ["dashboard", "role-matters", selected?.id, selected?.name],
    queryFn: () => dashboardApi.mattersPerRole(selected?.id ?? "", selected?.name ?? ""),
    enabled: !!selected,
  })

  const topRoles = useMemo(() => {
    const roles = (summary.data ?? []).filter(r => r.roleName && r.roleName !== "Total")
    return roles
  }, [summary.data])

  if (summary.isLoading) return <PanelLoader label="Loading matter roles…" />

  return (
    <Box>
      <StatsGrid>
        {topRoles.map((role, i) => (
          <Box
            key={String(role.roleId ?? role.roleName)}
            onClick={() => setSelected({ id: String(role.roleId ?? ""), name: String(role.roleName ?? "") })}
            sx={{ cursor: "pointer", outline: selected?.name === role.roleName ? "2px solid" : "none", outlineColor: "primary.main", borderRadius: 2 }}
          >
            <SummaryCard
              count={role.count}
              label={String(role.roleName)}
              color={COLORS[i % COLORS.length]}
            />
          </Box>
        ))}
      </StatsGrid>

      {selected && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Matters — {selected.name}
            </Typography>
            <Chip size="small" label="Selected" color="primary" />
          </Box>
          {matters.isLoading ? (
            <PanelLoader label="Loading role matters…" />
          ) : !(matters.data as unknown[])?.length ? (
            <Typography color="text.secondary">No matters for this role</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(matters.data as Record<string, unknown>[]).map((m, i) => {
                  const id = String(m.matterId ?? m.id ?? i)
                  return (
                    <TableRow
                      key={id}
                      hover
                      sx={{ cursor: "pointer", textDecoration: "none", "& td": { color: "inherit" } }}
                      onClick={() => navigate(`/matters/${id}`)}
                    >
                      <TableCell>{String(m.title ?? "—")}</TableCell>
                      <TableCell>{String((m.clientMini as { firstName?: string; companyName?: string })?.companyName
                        ?? (m.clientMini as { firstName?: string })?.firstName
                        ?? m.clientName
                        ?? "—")}</TableCell>
                      <TableCell>{String(m.status ?? "—")}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </Box>
  )
}
