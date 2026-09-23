import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Pagination,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { SummaryCard, StatsGrid } from "./SummaryCard"
import { ApexChart } from "@components/charts/ApexChart"
import { CellEllipsis } from "@/components/data-grid/CellEllipsis"
import { formatDate } from "@lib/utils/formatDate"

interface RoleRow {
  roleId?: string | null
  roleName?: string
  count?: number
  roles?: RoleRow[] | null
}

const COLORS = ["#0F3C6E", "#00B4A6", "#365E92", "#B45309", "#7C3AED", "#DC2626"]
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"]
const ROLE_SERIES = ["Handling Work", "Supervisor", "Assisting", "Solo"]
const ROLE_SERIES_COLORS = ["#0F3C6E", "#00B4A6", "#B45309", "#7C3AED", "#a8324e"]

function clientLabel(m: Record<string, unknown>) {
  const mini = m.clientMini as { companyName?: string; firstName?: string; clientType?: string } | undefined
  if (mini?.clientType === "PERSON" || mini?.firstName) {
    return String(mini.companyName || mini.firstName || m.clientName || "—")
  }
  return String(mini?.companyName ?? m.clientName ?? "—")
}

function teamLabel(m: Record<string, unknown>) {
  const team = m.teamMembers ?? m.matterTeam ?? m.members
  if (!Array.isArray(team) || !team.length) return "—"
  return team.map((t) => {
    const row = t as Record<string, unknown>
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ")
      || String(row.name ?? row.userName ?? "")
    const role = String(row.role ?? row.position ?? "")
    return role ? `${name} (${role})` : name
  }).filter(Boolean).join(", ") || "—"
}

function MatterRolesGraph() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "monthly-matters-per-role"],
    queryFn: () => dashboardApi.monthlyMattersPerRole(),
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <PanelLoader label="Loading role analysis…" />

  const stats = (data ?? {}) as Record<string, number[]>
  const columnSeries = ROLE_SERIES.map((name, i) => ({
    name,
    type: "column" as const,
    data: stats[name] ?? [],
    color: ROLE_SERIES_COLORS[i],
  }))
  const totals = MONTHS.map((_, i) =>
    ROLE_SERIES.reduce((sum, name) => sum + Number((stats[name] ?? [])[i] ?? 0), 0),
  )
  const series = [
    ...columnSeries,
    { name: "Total", type: "line" as const, data: totals, color: ROLE_SERIES_COLORS[4] },
  ]

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        MATTER ROLES — Analysis
      </Typography>
      <Box sx={{ minHeight: 280 }}>
        <ApexChart
          type="line"
          height={280}
          series={series}
          options={{
            chart: { toolbar: { show: false }, stacked: false, zoom: { enabled: false } },
            stroke: { width: [0, 0, 0, 0, 3] },
            colors: ROLE_SERIES_COLORS,
            xaxis: { categories: MONTHS },
            legend: { position: "top" },
            dataLabels: { enabled: false },
          }}
        />
      </Box>
    </Paper>
  )
}

export function MatterRolesPanel({ onCount }: { onCount?: (n: number | null) => void }) {
  const navigate = useNavigate()
  const [activeTop, setActiveTop] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [page, setPage] = useState(0)

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
    queryKey: ["dashboard", "role-matters", selected?.id, selected?.name, page],
    queryFn: () => dashboardApi.mattersPerRole(selected?.id ?? "", selected?.name ?? "", page, 10),
    enabled: !!selected,
  })

  const topRoles = useMemo(() => {
    // Include Total card (LMS MatterRolesTab parity)
    return (summary.data ?? []).filter(r => r.roleName)
  }, [summary.data])

  const assistingChildren = useMemo(() => {
    const assisting = topRoles.find(r => r.roleName === "Assisting")
    return Array.isArray(assisting?.roles) ? assisting!.roles! : []
  }, [topRoles])

  function selectTop(role: RoleRow) {
    const name = String(role.roleName ?? "")
    setActiveTop(name)
    setSelectedChildId(null)
    setPage(0)
    if (name === "Assisting" && assistingChildren.length) {
      setSelected(null)
      return
    }
    // Total uses ALL for the per-role table (LMS resolvePerRoleTableRoleId)
    if (name === "Total") {
      setSelected({ id: "ALL", name: "Total" })
      return
    }
    setSelected({ id: String(role.roleId ?? ""), name })
  }

  function selectChild(child: RoleRow) {
    setSelectedChildId(String(child.roleId ?? child.roleName ?? ""))
    setSelected({ id: String(child.roleId ?? ""), name: String(child.roleName ?? "") })
    setPage(0)
  }

  if (summary.isLoading) return <PanelLoader label="Loading matter roles…" />

  const content = (matters.data as { content?: Record<string, unknown>[]; totalElements?: number } | undefined)
  const rows = content?.content ?? (Array.isArray(matters.data) ? matters.data as Record<string, unknown>[] : [])
  const totalElements = Number(content?.totalElements ?? rows.length)

  return (
    <Box>
      <StatsGrid>
        {topRoles.map((role, i) => (
          <Box
            key={String(role.roleId ?? role.roleName)}
            onClick={() => selectTop(role)}
            sx={{
              cursor: "pointer",
              outline: activeTop === role.roleName ? "2px solid" : "none",
              outlineColor: "primary.main",
              borderRadius: 2,
            }}
          >
            <SummaryCard
              count={role.count}
              label={String(role.roleName)}
              color={role.roleName === "Total" ? "#a8324e" : COLORS[i % COLORS.length]}
            />
          </Box>
        ))}
      </StatsGrid>

      {activeTop === "Assisting" && assistingChildren.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2, maxHeight: 280, overflow: "auto" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Assisting Roles</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" }, gap: 1.5 }}>
            {assistingChildren.map((child, i) => (
              <Box
                key={String(child.roleId ?? child.roleName)}
                onClick={() => selectChild(child)}
                sx={{
                  cursor: "pointer",
                  outline: selectedChildId === String(child.roleId ?? child.roleName) ? "2px solid" : "none",
                  outlineColor: "secondary.main",
                  borderRadius: 2,
                }}
              >
                <SummaryCard
                  count={child.count}
                  label={String(child.roleName)}
                  color={COLORS[(i + 2) % COLORS.length]}
                />
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <MatterRolesGraph />

      {selected && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Matters — {selected.name}
            </Typography>
            <Chip size="small" label="Selected" color="primary" />
          </Box>
          {matters.isLoading ? (
            <PanelLoader label="Loading role matters…" />
          ) : !rows.length ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>No matters for this role</Typography>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 48 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Practice Area</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Team Members / Position</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Matter Subject / Scope</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Created Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((m, i) => {
                      const id = String(m.matterId ?? m.id ?? i)
                      const pa = typeof m.practiceArea === "object" && m.practiceArea
                        ? String((m.practiceArea as { name?: string }).name ?? "—")
                        : String(m.practiceArea ?? "—")
                      const subject = [m.matterSubject, m.description].filter(Boolean).map(String).join(" / ") || "—"
                      const created = m.createdAt ?? m.createdDate
                      return (
                        <TableRow
                          key={id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => navigate(`/matters/${id}`)}
                        >
                          <TableCell>{page * 10 + i + 1}</TableCell>
                          <TableCell sx={{ maxWidth: 200 }}><CellEllipsis title={String(m.title ?? "—")}>{String(m.title ?? "—")}</CellEllipsis></TableCell>
                          <TableCell sx={{ maxWidth: 160 }}><CellEllipsis title={pa}>{pa}</CellEllipsis></TableCell>
                          <TableCell sx={{ maxWidth: 160 }}><CellEllipsis title={clientLabel(m)}>{clientLabel(m)}</CellEllipsis></TableCell>
                          <TableCell sx={{ maxWidth: 240 }}><CellEllipsis title={teamLabel(m)}>{teamLabel(m)}</CellEllipsis></TableCell>
                          <TableCell>{String(m.status ?? "—")}</TableCell>
                          <TableCell sx={{ maxWidth: 240 }}><CellEllipsis title={subject}>{subject}</CellEllipsis></TableCell>
                          <TableCell>{created ? formatDate(String(created)) : "—"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {totalElements > 10 && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1.5 }}>
                  <Pagination
                    count={Math.ceil(totalElements / 10)}
                    page={page + 1}
                    onChange={(_, p) => setPage(p - 1)}
                    size="small"
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}
