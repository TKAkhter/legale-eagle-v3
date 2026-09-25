/**
 * Matter Print — printable brief for a matter (`?matterId=`).
 * Loads live matter + billable timelogs + hearings (static fixtures in demo mode).
 */
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Box, Typography, Button, Divider, CircularProgress, Alert } from "@mui/material"
import { mattersApi } from "@/api/matters"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"

type Person = { firstName?: string; lastName?: string } | null

function personName(p: Person): string {
  if (!p) return "—"
  return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—"
}

function clientName(cl: Record<string, unknown> | null | undefined): string {
  if (!cl) return "—"
  return String(cl.companyName || cl.firstName || "—")
}

export default function MatterPrintPage() {
  const [params] = useSearchParams()
  const matterId = params.get("matterId") ?? ""

  const matterQ = useQuery({
    queryKey: ["matters", "print", matterId],
    queryFn: () => mattersApi.getById(matterId),
    enabled: Boolean(matterId),
  })

  const timelogsQ = useQuery({
    queryKey: ["matters", "print", matterId, "timelogs"],
    queryFn: () => mattersApi.getTimelogs(matterId, {
      page: 0,
      pageSize: 200,
      sortBy: "entryDate",
      sortDir: "desc",
      filters: {},
    }),
    enabled: Boolean(matterId) && Boolean(matterQ.data),
  })

  const hearingsQ = useQuery({
    queryKey: ["matters", "print", matterId, "hearings"],
    queryFn: () => mattersApi.getHearings(matterId, {
      page: 0,
      pageSize: 100,
      sortBy: "hearingDate",
      sortDir: "asc",
      filters: {},
    }),
    enabled: Boolean(matterId) && Boolean(matterQ.data),
  })

  const matter = matterQ.data as Record<string, unknown> | undefined
  const timelogs = (timelogsQ.data?.content ?? []) as Record<string, unknown>[]
  const hearings = (hearingsQ.data?.content ?? []) as Record<string, unknown>[]
  const ready = Boolean(matter) && !timelogsQ.isLoading && !hearingsQ.isLoading

  useEffect(() => {
    if (ready) {
      const t = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(t)
    }
  }, [ready])

  if (!matterId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Missing matterId query parameter.</Alert>
      </Box>
    )
  }

  if (matterQ.isLoading || !matter) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        {matterQ.isError
          ? <Alert severity="error">Failed to load matter.</Alert>
          : <CircularProgress />}
      </Box>
    )
  }

  const atty = matter.responsibleAttorney as Person
  const cl = matter.client as Record<string, unknown> | null
  const pa = (matter.practiceArea as { name?: string } | string | null)
  const paName = typeof pa === "object" && pa ? pa.name : String(pa ?? matter.practiceAreaName ?? "")

  const totalHours = timelogs.reduce((s, t) => s + Number(t.totalHours ?? t.hours ?? 0), 0)
  const totalBilling = timelogs.reduce((s, t) => s + Number(t.billing ?? t.amount ?? t.totalAmount ?? 0), 0)

  return (
    <>
      <Box sx={{
        position: "fixed", top: 16, right: 16, display: "flex", gap: 1, zIndex: 999,
        "@media print": { display: "none" },
      }}>
        <Button size="small" variant="outlined" onClick={() => window.history.back()}>
          ← Back
        </Button>
        <Button size="small" variant="contained" onClick={() => window.print()}>
          Print again
        </Button>
      </Box>

      <Box sx={{
        maxWidth: 800, mx: "auto", p: 6,
        fontFamily: "'IBM Plex Sans',sans-serif",
        "@media print": { p: 4 },
      }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#0F2744" }}>LegalEagle LMS</Typography>
            <Typography variant="body2" color="text.secondary">Confidential — Matter Summary</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#0F2744" }}>MATTER BRIEF</Typography>
            <Typography variant="body2">Matter: {String(matter.title ?? matter.matterSeq ?? "")}</Typography>
            <Typography variant="body2" color="text.secondary">
              Generated: {formatDate(new Date().toISOString())}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3, borderColor: "#0F2744", borderWidth: 2 }} />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, mb: 4 }}>
          {([
            ["Matter Number", String(matter.title ?? matter.matterSeq ?? "—")],
            ["Status", String(matter.status ?? "—")],
            ["Client", clientName(cl)],
            ["Attorney", personName(atty)],
            ["Practice Area", paName || "—"],
            ["Billing Type", String(matter.billingType ?? "—")],
            ["Open Date", formatDate(String(matter.openDate ?? matter.createdAt ?? ""))],
            ["Due Date", matter.dueDate ? formatDate(String(matter.dueDate)) : "—"],
          ] as [string, string][]).map(([label, value]) => (
            <Box key={label}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700, color: "text.secondary",
                  textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10,
                }}
              >
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
            </Box>
          ))}
        </Box>

        {!!matter.matterSubject && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Subject</Typography>
            <Typography variant="body2">{String(matter.matterSubject)}</Typography>
          </Box>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Time Log Summary</Typography>
          {timelogs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No time logs</Typography>
          ) : (
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: "#0F2744" }}>
                  {["Attorney", "Activity", "Date", "Hours", "Amount"].map(h => (
                    <Box component="th" key={h} sx={{ color: "white", p: 1, textAlign: "left", fontSize: 12 }}>
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {timelogs.map((t, i) => {
                  const rp = (t.responsiblePerson ?? t.user ?? t.attorney) as Person
                  const activity = String(t.activity ?? t.activityName ?? t.description ?? "—")
                  const entryDate = String(t.entryDate ?? t.activityDate ?? t.createdAt ?? "")
                  const hours = Number(t.totalHours ?? t.hours ?? 0)
                  const amount = Number(t.billing ?? t.amount ?? t.totalAmount ?? 0)
                  return (
                    <Box component="tr" key={String(t.id ?? i)} sx={{ bgcolor: i % 2 ? "#F8FAFC" : "white" }}>
                      <Box component="td" sx={{ p: 1, fontSize: 12 }}>{personName(rp)}</Box>
                      <Box component="td" sx={{ p: 1, fontSize: 12 }}>{activity}</Box>
                      <Box component="td" sx={{ p: 1, fontSize: 12 }}>{formatDate(entryDate)}</Box>
                      <Box component="td" sx={{ p: 1, fontSize: 12 }}>{hours.toFixed(1)} hrs</Box>
                      <Box component="td" sx={{ p: 1, fontSize: 12 }}>{formatCurrency(amount)}</Box>
                    </Box>
                  )
                })}
                <Box component="tr" sx={{ borderTop: "2px solid #0F2744" }}>
                  <Box component="td" colSpan={3} sx={{ p: 1, fontWeight: 700, fontSize: 12 }}>Total</Box>
                  <Box component="td" sx={{ p: 1, fontWeight: 700, fontSize: 12 }}>{totalHours.toFixed(1)} hrs</Box>
                  <Box component="td" sx={{ p: 1, fontWeight: 700, fontSize: 12 }}>{formatCurrency(totalBilling)}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Hearings</Typography>
          {hearings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hearings</Typography>
          ) : hearings.map(h => (
            <Box
              key={String(h.id)}
              sx={{ display: "flex", gap: 3, py: 1, borderBottom: "1px solid #E2E8F0", flexWrap: "wrap" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 120 }}>
                {formatDate(String(h.hearingDate ?? ""))}
              </Typography>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                {String(h.hearingTime ?? "—")}
              </Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {String(h.hearingTitle ?? h.title ?? "—")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[h.court, h.room, h.location].filter(Boolean).map(String).join(", ") || "—"}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ textAlign: "center", display: "block", fontSize: 10 }}
        >
          Confidential — LegalEagle LMS — Printed {new Date().toLocaleString()}
        </Typography>
      </Box>
    </>
  )
}
