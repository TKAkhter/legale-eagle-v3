import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, Tab, Tabs, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { UserRateCardDrawer } from "./_components/UserRateCardDrawer"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { adminApi } from "@/api/admin"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { formatDate } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams, PageResponse } from "@/types/common.types"

type HistoryEntry = { designation?: string; rate: number; effectiveDate: string; note?: string; id?: string }

type RateRow = {
  id: string
  name: string
  designation: string
  rate: number
  effectiveDate: string
  recordId: string
  note: string
  history: HistoryEntry[]
  active?: boolean
  loginDisabled?: boolean
}

function parseDisplayDate(dateStr: string): string {
  if (!dateStr) return ""
  return String(dateStr).slice(0, 10)
}

async function fetchGroupedRateCards(): Promise<RateRow[]> {
  if (env.USE_STATIC_DATA) {
    return [
      {
        id: "u1",
        name: "Sarah Johnson",
        designation: "Partner",
        rate: 800,
        effectiveDate: "2026-01-01",
        recordId: "rc1",
        note: "",
        history: [{ designation: "Partner", rate: 750, effectiveDate: "2025-01-01" }],
        active: true,
        loginDisabled: false,
      },
      {
        id: "u2",
        name: "Former Associate",
        designation: "Associate",
        rate: 400,
        effectiveDate: "2025-06-01",
        recordId: "rc2",
        note: "",
        history: [],
        active: false,
        loginDisabled: true,
      },
    ]
  }
  const res = await axiosClient.get("/api/user/rate-cards/all")
  const payload = res.data?.data ?? res.data ?? {}
  const all = (payload.allUserRateCards ?? payload.content ?? (Array.isArray(payload) ? payload : [])) as Record<string, unknown>[]
  const grouped = all.reduce<Record<string, Record<string, unknown>[]>>((acc, item) => {
    const uid = String(item.userId ?? "")
    if (!uid) return acc
    if (!acc[uid]) acc[uid] = []
    acc[uid].push(item)
    return acc
  }, {})

  return Object.entries(grouped).map(([userId, entries]) => {
    const sorted = [...entries].sort(
      (a, b) => new Date(String(b.effectiveDate)).getTime() - new Date(String(a.effectiveDate)).getTime(),
    )
    const latest = sorted[0] ?? {}
    return {
      id: userId,
      name: String(latest.userName ?? latest.name ?? "—"),
      designation: String(latest.designationName ?? latest.designation ?? "—"),
      rate: Number(latest.ratePerHour ?? latest.rate ?? 0),
      effectiveDate: parseDisplayDate(String(latest.effectiveDate ?? "")),
      recordId: String(latest.id ?? ""),
      note: String(latest.note ?? ""),
      history: sorted.slice(1).map(h => ({
        id: String(h.id ?? ""),
        designation: String(h.designationName ?? h.designation ?? "—"),
        rate: Number(h.ratePerHour ?? h.rate ?? 0),
        effectiveDate: parseDisplayDate(String(h.effectiveDate ?? "")),
        note: String(h.note ?? ""),
      })),
      active: latest.active as boolean | undefined,
      loginDisabled: latest.loginDisabled as boolean | undefined,
    }
  })
}

/** LMS `/budgeting/rate-cards` — attorney hourly rates with history + add/edit. */
export default function RateCardsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add")
  const [editInitial, setEditInitial] = useState<{
    id?: string
    userId: string
    ratePerHour: string
    effectiveDate: string
    note: string
  } | undefined>()

  const { data: usersMin = [] } = useQuery({
    queryKey: ["users", "min", "rate-card-status"],
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

  async function queryFn(_p: GridParams): Promise<PageResponse<RateRow>> {
    const rows = await fetchGroupedRateCards()
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
    qc.invalidateQueries({ queryKey: ["budgeting", "rate-cards"] })
  }

  return (
    <PageShell
      title="Rate Cards"
      description="Attorney hourly rates by effective date"
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
          Add Rate Card
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
          {
            field: "name",
            header: "Attorney",
            renderCell: v => String(v ?? "—"),
          },
          { field: "designation", header: "Designation", renderCell: v => String(v || "—") },
          {
            field: "rate",
            header: "Rate / Hour",
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
        queryKey={["budgeting", "rate-cards", tab, gridKey]}
        queryFn={queryFn}
        isPaginated={false}
        zebraStriping
        emptyState={tab === 0 ? "No active user rate cards." : "No inactive user rate cards."}
        rowMenuItems={row => {
          const r = row as RateRow
          return [
            {
              label: "Edit",
              icon: <EditIcon fontSize="small" />,
              onClick: () => {
                setDrawerMode("edit")
                setEditInitial({
                  id: r.recordId,
                  userId: r.id,
                  ratePerHour: String(r.rate),
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
            const r = row as RateRow
            if (!r.history?.length) {
              return <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>No prior rates</Typography>
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

      <UserRateCardDrawer
        open={drawerOpen}
        mode={drawerMode}
        initial={editInitial}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success(drawerMode === "edit" ? "Rate card updated" : "Rate card added")
          refresh()
        }}
      />
    </PageShell>
  )
}
