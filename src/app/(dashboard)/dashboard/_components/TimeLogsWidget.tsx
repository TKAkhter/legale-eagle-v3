import { useMemo, useState } from "react"
import {
  Box, Button, Paper, TextField, Typography, LinearProgress, Alert,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { useAuthStore } from "@lib/store/authStore"

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthsApart(from: string, to: string) {
  const a = new Date(from)
  const b = new Date(to)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() - a.getDate()) / 31
}

const BAR_CONFIG: { key: string; label: string; color: "primary" | "success" | "info" | "warning" | "secondary" | "error" }[] = [
  { key: "totalHours", label: "Total Hours", color: "primary" },
  { key: "totalBillableHours", label: "Billable Hours", color: "success" },
  { key: "totalRevenueAllocatedHours", label: "Revenue Allocated Hours", color: "info" },
  { key: "totalNonBillableHours", label: "Non Billable Hours", color: "warning" },
  { key: "nonBillableNonMatterHours", label: "Non Matter Non Billable", color: "warning" },
  { key: "totalDiscountedHours", label: "Discounted Hours", color: "error" },
  { key: "totalPurgedHours", label: "Purged Hours", color: "error" },
]

export function TimeLogsWidget() {
  const userId = useAuthStore(s => s.user?.id)
  const displayName = useAuthStore(s => {
    const u = s.user
    return u ? `${u.firstName} ${u.lastName}`.trim() : "You"
  })
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate] = useState(today())
  const [applied, setApplied] = useState({ fromDate: monthStart(), toDate: today() })
  const [rangeError, setRangeError] = useState("")

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", "timelog-stats", applied],
    queryFn: () => dashboardApi.timeLogStats(applied.fromDate, applied.toDate, userId ?? undefined),
    staleTime: 60_000,
  })

  const row = useMemo(() => {
    const rows = data as Record<string, unknown>[]
    return rows[0] ?? {
      responsiblePerson: displayName,
      totalHours: 0,
      totalBillableHours: 0,
      totalNonBillableHours: 0,
      totalRevenueAllocatedHours: 0,
      totalPurgedHours: 0,
      totalDiscountedHours: 0,
      nonBillableNonMatterHours: 0,
    }
  }, [data, displayName])

  function search() {
    if (new Date(toDate) < new Date(fromDate)) {
      setRangeError("To date must be after from date")
      return
    }
    if (monthsApart(fromDate, toDate) > 3) {
      setRangeError("Max range is 3 months")
      return
    }
    setRangeError("")
    setApplied({ fromDate, toDate })
  }

  function clear() {
    setFromDate(monthStart())
    setToDate(today())
    setRangeError("")
    setApplied({ fromDate: monthStart(), toDate: today() })
  }

  const total = Number(row.totalHours ?? 0) || 0
  const pct = (v: number) => (total ? Math.min(100, (v / total) * 100) : 0)

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end", mb: 2 }}>
        <TextField
          size="small" type="date" label="From Date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fromDate} onChange={e => setFromDate(e.target.value)}
        />
        <TextField
          size="small" type="date" label="To Date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={toDate} onChange={e => setToDate(e.target.value)}
        />
        <Button variant="contained" color="primary" onClick={search} disabled={isFetching}>Search</Button>
        <Button variant="outlined" color="primary" onClick={clear}>Clear</Button>
      </Box>
      {rangeError && <Alert severity="warning" sx={{ mb: 2 }}>{rangeError}</Alert>}
      {isLoading ? (
        <PanelLoader label="Loading time log stats…" />
      ) : (
        <Box sx={{ width: "100%", py: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, textAlign: "center", fontWeight: 600 }}>
            {String(row.responsiblePerson ?? displayName)}
          </Typography>
          {BAR_CONFIG.map(item => {
            const value = Number(row[item.key] ?? 0) || 0
            return (
              <Box key={item.key} sx={{ mb: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{value.toFixed(2)}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct(value)}
                  color={item.color}
                  sx={{ height: 10, borderRadius: 4 }}
                />
              </Box>
            )
          })}
        </Box>
      )}
      <Box sx={{ mt: 1.5 }}>
        <Button size="small" href="/time-log-entries">View all time logs →</Button>
      </Box>
    </Paper>
  )
}
