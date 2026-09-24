import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, Tab, Tabs, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { UserCostCardDrawer } from "./_components/UserCostCardDrawer"
import { adminApi } from "@/api/admin"
import { budgetingApi, type CostCardRow } from "@/api/budgeting"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams, PageResponse } from "@/types/common.types"

/** LMS `/budgeting/cost-cards` — cost/hour by user with history + add/edit. */
export default function CostCardsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add")
  const [editInitial, setEditInitial] = useState<{
    id?: string
    userId: string
    costPerHour: string
    effectiveDate: string
    note: string
  } | undefined>()

  const { data: usersMin = [] } = useQuery({
    queryKey: ["users", "min", "cost-card-status"],
    queryFn: () => adminApi.getUsersMin(),
  })

  const userStatus = useMemo(() => {
    const map = new Map<string, { active?: boolean; loginDisabled?: boolean }>()
    for (const u of (Array.isArray(usersMin) ? usersMin : []) as Record<string, unknown>[]) {
      map.set(String(u.id), {
        active: u.isActive !== false && u.active !== false,
        loginDisabled: Boolean(u.loginDisabled),
      })
    }
    return map
  }, [usersMin])

  async function queryFn(_p: GridParams): Promise<PageResponse<CostCardRow>> {
    const rows = await budgetingApi.getAllCostCards()
    const withStatus = rows.map(r => {
      const st = userStatus.get(r.id)
      return {
        ...r,
        active: st?.active ?? r.active ?? true,
        loginDisabled: st?.loginDisabled ?? r.loginDisabled ?? false,
      }
    })
    const filtered = tab === 0
      ? withStatus.filter(r => r.active && !r.loginDisabled)
      : withStatus.filter(r => !r.active || r.loginDisabled)
    return {
      content: filtered,
      totalElements: filtered.length,
      totalPages: 1,
      number: 0,
      size: filtered.length || 25,
      first: true,
      last: true,
      empty: filtered.length === 0,
    }
  }

  function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["budgeting", "cost-cards"] })
  }

  return (
    <PageShell
      title="Cost Cards"
      description="Attorney cost rates by effective date"
      action={(
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setDrawerMode("add")
            setEditInitial(undefined)
            setDrawerOpen(true)
          }}
        >
          Add Cost Card
        </Button>
      )}
    >
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setGridKey(k => k + 1) }} sx={{ mb: 2 }}>
        <Tab label="Active Users" />
        <Tab label="Inactive Users" />
      </Tabs>

      <DataGrid
        key={`${tab}-${gridKey}`}
        columns={[
          { field: "name", header: "Fee Earner", renderCell: v => String(v ?? "—") },
          { field: "designation", header: "Designation", renderCell: v => String(v || "—") },
          {
            field: "rate",
            header: "Cost / Hour",
            align: "right",
            renderCell: v => formatCurrency(Number(v ?? 0)),
          },
          {
            field: "effectiveDate",
            header: "Effective",
            renderCell: v => (v ? formatDate(String(v)) : "—"),
          },
          {
            field: "note",
            header: "Note",
            renderCell: v => String(v || "—"),
          },
        ]}
        queryKey={["budgeting", "cost-cards", tab, gridKey]}
        queryFn={queryFn}
        isPaginated={false}
        zebraStriping
        emptyState={tab === 0 ? "No active user cost cards." : "No inactive user cost cards."}
        rowMenuItems={row => {
          const r = row as CostCardRow
          return [
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => {
                setDrawerMode("edit")
                setEditInitial({
                  id: r.recordId,
                  userId: r.id,
                  costPerHour: String(r.rate),
                  effectiveDate: r.effectiveDate,
                  note: r.note,
                })
                setDrawerOpen(true)
              },
            },
          ]
        }}
        rowExpansion={{
          render: (row) => {
            const r = row as CostCardRow
            if (!r.history?.length) {
              return <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>No prior costs</Typography>
            }
            return (
              <Box sx={{ px: 3, py: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  History
                </Typography>
                {r.history.map((h, i) => (
                  <Box key={h.id ?? i} sx={{ display: "flex", gap: 2, py: 0.5, fontSize: 13 }}>
                    <span>{h.designation || "—"}</span>
                    <span>{formatCurrency(h.rate)}</span>
                    <span>{h.effectiveDate ? formatDate(h.effectiveDate) : "—"}</span>
                    {h.note ? <span>{h.note}</span> : null}
                  </Box>
                ))}
              </Box>
            )
          },
        }}
      />

      <UserCostCardDrawer
        open={drawerOpen}
        mode={drawerMode}
        inactiveTab={tab === 1}
        initial={editInitial}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success(drawerMode === "edit" ? "Cost card updated" : "Cost card added")
          refresh()
        }}
      />
    </PageShell>
  )
}
