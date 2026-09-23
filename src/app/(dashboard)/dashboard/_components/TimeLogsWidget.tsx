import { useState } from "react"
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi } from "@/api/dashboard"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { useAuthStore } from "@lib/store/authStore"
import { FilterActions } from "@components/filters"

function monthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}
function today() {
  return new Date().toISOString().slice(0, 10)
}

export function TimeLogsWidget() {
  const userId = useAuthStore(s => s.user?.id)
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate] = useState(today())
  const [applied, setApplied] = useState({ fromDate: monthStart(), toDate: today() })

  const { data = [], isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", "timelog-stats", applied],
    queryFn: () => dashboardApi.timeLogStats(applied.fromDate, applied.toDate, userId ?? undefined),
    staleTime: 60_000,
  })

  const rows = data as Record<string, unknown>[]

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, position: "relative" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Time Logs by Person</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end", mb: 2 }}>
        <TextField
          size="small" type="date" label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fromDate} onChange={e => setFromDate(e.target.value)}
        />
        <TextField
          size="small" type="date" label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={toDate} onChange={e => setToDate(e.target.value)}
        />
        <FilterActions
          onSearch={() => setApplied({ fromDate, toDate })}
          onClear={() => {
            setFromDate(monthStart())
            setToDate(today())
            setApplied({ fromDate: monthStart(), toDate: today() })
          }}
          searching={isFetching}
        />
      </Box>
      {isLoading ? (
        <PanelLoader label="Loading time log stats…" />
      ) : !rows.length ? (
        <Typography color="text.secondary">No statistics for this range</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Billable</TableCell>
              <TableCell align="right">Non-billable</TableCell>
              <TableCell align="right">Revenue hrs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={String(r.responsiblePersonId ?? i)}>
                <TableCell>{String(r.responsiblePerson ?? "—")}</TableCell>
                <TableCell align="right">{Number(r.totalHours ?? 0).toFixed(2)}</TableCell>
                <TableCell align="right">{Number(r.totalBillableHours ?? 0).toFixed(2)}</TableCell>
                <TableCell align="right">{Number(r.totalNonBillableHours ?? 0).toFixed(2)}</TableCell>
                <TableCell align="right">{Number(r.totalRevenueAllocatedHours ?? 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Box sx={{ mt: 1.5 }}>
        <Button size="small" href="/time-log-entries">View all time logs →</Button>
      </Box>
    </Paper>
  )
}
