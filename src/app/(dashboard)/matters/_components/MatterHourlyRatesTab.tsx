/**
 * Per-matter individual hourly rates — LMS HourlyRates (bulk update).
 */
import { useEffect, useState } from "react"
import {
  Box, Button, CircularProgress, Paper, TextField, Typography,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { mattersApi } from "@/api/matters"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

interface RateRow {
  userId: string
  userName: string
  rate: number
  hourlyRateMatterId: string
}

interface Props {
  matterId: string
  canEdit?: boolean
}

export function MatterHourlyRatesTab({ matterId, canEdit = true }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<RateRow[]>([])
  const [saving, setSaving] = useState(false)

  const ratesQ = useQuery({
    queryKey: ["matters", "hourly-rates", matterId],
    queryFn: () => mattersApi.getHourlyRates(matterId),
    enabled: !!matterId,
  })

  const displayRows: RateRow[] = (ratesQ.data ?? []).map((r, i) => {
    const user = (r.userId ?? r.user ?? {}) as Record<string, unknown>
    const userId = typeof r.userId === "string"
      ? r.userId
      : String(user.id ?? "")
    const userName = typeof r.userId === "object" && r.userId
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || String(user.id ?? "—")
      : String(r.userName ?? "—")
    return {
      userId,
      userName,
      rate: Number(r.rate ?? 0),
      hourlyRateMatterId: String(r.id ?? r.hourlyRateMatterId ?? i),
    }
  })

  useEffect(() => {
    if (!open) return
    setRows(displayRows.map(r => ({ ...r })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ratesQ.dataUpdatedAt])

  async function submit() {
    if (!rows.length) {
      toast.error("No rates to save")
      return
    }
    setSaving(true)
    try {
      await mattersApi.updateHourlyRatesBulk(
        matterId,
        rows.map(r => ({
          userId: r.userId,
          rate: Number(r.rate) || 0,
          hourlyRateMatterId: r.hourlyRateMatterId || undefined,
        })),
      )
      toast.success("Hourly rates updated")
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["matters", "hourly-rates", matterId] })
    } catch (e) {
      logger.error("MatterHourlyRates", "Save failed", e)
      toast.error((e as Error)?.message ?? "Failed to update rates")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Individual attorney rates for this matter
        </Typography>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditIcon />}
            disabled={!displayRows.length || ratesQ.isLoading}
            onClick={() => setOpen(true)}
          >
            Edit Rates
          </Button>
        )}
      </Box>

      {ratesQ.isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Attorney", "Rate"].map(h => (
                  <Box
                    component="th"
                    key={h}
                    sx={{ px: 2, py: 1, textAlign: h === "Rate" ? "right" : "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {displayRows.map(r => (
                <Box component="tr" key={r.hourlyRateMatterId || r.userId} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13 }}>{r.userName}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.25, fontSize: 13, textAlign: "right" }}>{formatCurrency(r.rate)}</Box>
                </Box>
              ))}
              {!displayRows.length && (
                <Box component="tr">
                  <Box component="td" colSpan={2} sx={{ p: 3 }}>
                    <Typography color="text.secondary">No individual rates set for this matter.</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      <FormDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Individual Rates"
        onSubmit={() => { void submit() }}
        isSubmitting={saving}
        submitLabel="Save"
        width={480}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((row, idx) => (
            <Box key={row.hourlyRateMatterId || row.userId} sx={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 1.5, alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.userName}</Typography>
              <TextField
                size="small"
                type="number"
                label="Rate"
                value={row.rate}
                onChange={e => {
                  const rate = Number(e.target.value)
                  setRows(prev => prev.map((r, i) => i === idx ? { ...r, rate } : r))
                }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>
          ))}
        </Box>
      </FormDrawer>
    </Box>
  )
}
