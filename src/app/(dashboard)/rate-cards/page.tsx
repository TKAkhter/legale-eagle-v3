import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { Can } from "@components/ui/Can"
import { ActivityRateCardDrawer } from "./_components/ActivityRateCardDrawer"
import { activityRateCardsApi, type ActivityRateCard } from "@/api/activityRateCards"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { PERMISSIONS } from "@config/permissions"
import type { GridParams, PageResponse } from "@/types/common.types"

/** LMS `/rate-cards` — activity rate templates (Time/Expense), not user budgeting rates. */
export default function ActivityRateCardsPage() {
  const qc = useQueryClient()
  const [activityType, setActivityType] = useState<"" | "Time" | "Expense">("")
  const [search, setSearch] = useState("")
  const [gridKey, setGridKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["activity-rate-cards", activityType, gridKey],
    queryFn: () => activityRateCardsApi.getByType(activityType as "Time" | "Expense"),
    enabled: activityType === "Time" || activityType === "Expense",
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.title.toLowerCase().includes(q))
  }, [rows, search])

  async function queryFn(_p: GridParams): Promise<PageResponse<ActivityRateCard>> {
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

  return (
    <PageShell
      title="Rate Cards"
      description="Activity rate templates for time and expense entries"
      action={(
        <Can do={PERMISSIONS.BUDGETING_MANAGE}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDrawerOpen(true)}
          >
            Add Rate Card
          </Button>
        </Can>
      )}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={activityType}
            onChange={e => {
              setActivityType(e.target.value as "" | "Time" | "Expense")
              setGridKey(k => k + 1)
            }}
          >
            <MenuItem value=""><em>Select type</em></MenuItem>
            <MenuItem value="Time">Time</MenuItem>
            <MenuItem value="Expense">Expense</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          disabled={!activityType}
        />
      </Box>

      {!activityType ? (
        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
          Select Time or Expense to load rate card templates.
        </Box>
      ) : (
        <DataGrid
          key={`${activityType}-${gridKey}-${search}`}
          columns={[
            { field: "title", header: "Title", renderCell: v => String(v ?? "—") },
            { field: "activityType", header: "Time Log Entry Type" },
            {
              field: "billingType",
              header: "Billing Type",
              renderCell: v => String(v || "NA"),
            },
            {
              field: "rate",
              header: "Rate",
              align: "right",
              renderCell: v => formatCurrency(Number(v ?? 0)),
            },
          ]}
          queryKey={["activity-rate-cards", "grid", activityType, gridKey, search, filtered.length, isFetching]}
          queryFn={queryFn}
          isPaginated={false}
          zebraStriping
          emptyState={isFetching ? "Loading…" : "No rate cards for this type."}
        />
      )}

      <ActivityRateCardDrawer
        open={drawerOpen}
        defaultActivityType={activityType === "Expense" ? "Expense" : "Time"}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          toast.success("Rate card added")
          if (activityType) setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ["activity-rate-cards"] })
        }}
      />
    </PageShell>
  )
}
