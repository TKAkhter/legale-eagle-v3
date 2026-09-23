/**
 * Time Entry Detail — /time-log-entries/:entryId
 * Shows full details of a single time log entry with edit capability.
 */
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  Box, Paper, Typography, Button, Chip, Divider,
  CircularProgress, Alert,
} from "@mui/material"
import Grid from "@mui/material/Grid"
import ArrowBackIcon   from "@mui/icons-material/ArrowBack"
import EditIcon        from "@mui/icons-material/Edit"
import GavelIcon       from "@mui/icons-material/Gavel"
import TimerIcon       from "@mui/icons-material/Timer"
import PersonIcon      from "@mui/icons-material/Person"
import CalendarIcon    from "@mui/icons-material/CalendarToday"
import { PageShell }   from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { env }              from "@/config/env"
import { axiosClient }      from "@lib/api/axios"
import { formatDate }       from "@lib/utils/formatDate"
import { formatCurrency }   from "@lib/utils/formatCurrency"
import { timelogs as staticTimelogs } from "@/data/static"

interface TimeEntry {
  id:               string
  activity:         string
  description?:     string
  billingType?:     string
  totalHours?:      number
  billing?:         number
  revenueStatus?:   string
  entryDate?:       string
  matter?:          { id?: string; title?: string; matterId?: string }
  responsiblePerson?: { id?: string; firstName?: string; lastName?: string }
  client?:          { companyName?: string; firstName?: string; lastName?: string }
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.25 }}>
      <Box sx={{ color: "text.disabled", mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{typeof value === "string"
          ? <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
          : value}
        </Box>
      </Box>
    </Box>
  )
}

export default function TimeEntryDetailPage() {
  const { entryId }  = useParams<{ entryId: string }>()
  const navigate     = useNavigate()
  const { t }        = useTranslation()

  const { data: entry, isLoading, isError } = useQuery<TimeEntry>({
    queryKey: ["timelog", "detail", entryId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        const all = staticTimelogs as TimeEntry[]
        return all.find(tl => tl.id === entryId) ?? all[0]
      }
      const r = await axiosClient.get("/api/activity/get/by/id", { params: { id: entryId } })
      return r.data?.data ?? r.data
    },
    enabled: !!entryId,
  })

  if (isLoading) return (
    <PageShell title="Time Entry">
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    </PageShell>
  )

  if (isError || !entry) return (
    <PageShell title="Time Entry">
      <Alert severity="error">{t("errors.notFound", "Time entry not found.")}</Alert>
    </PageShell>
  )

  const person = entry.responsiblePerson
  const personName = person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "—"
  const matterTitle = entry.matter?.title ?? "—"
  const matterId = entry.matter?.matterId ?? entry.matter?.id
  const clientName = entry.client
    ? entry.client.companyName || `${entry.client.firstName ?? ""} ${entry.client.lastName ?? ""}`.trim()
    : "—"

  return (
    <PageShell
      title={entry.activity || "Time Entry"}
      description={`Entry for ${formatDate(entry.entryDate ?? "")}`}
      action={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}>
            {t("actions.back", "Back")}
          </Button>
          <Button size="small" variant="contained" startIcon={<EditIcon />}
            onClick={() => navigate(`/time-log-entries?edit=${entryId}`)}>
            {t("actions.edit", "Edit")}
          </Button>
        </Box>
      }
    >
      <Grid container spacing={3} sx={{ maxWidth: 900 }}>
        {/* Main details */}
        <Grid size={{ xs:12, md:8 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Entry Details</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1 }}>
              <InfoRow icon={<TimerIcon sx={{ fontSize: 18 }} />}
                label="Activity"
                value={entry.activity} />
              <Divider />
              {entry.description && <>
                <InfoRow icon={<Box sx={{ width: 18 }} />}
                  label="Description"
                  value={entry.description} />
                <Divider />
              </>}
              <InfoRow icon={<CalendarIcon sx={{ fontSize: 18 }} />}
                label="Entry Date"
                value={formatDate(entry.entryDate ?? "")} />
              <Divider />
              <InfoRow icon={<PersonIcon sx={{ fontSize: 18 }} />}
                label="Fee Earner"
                value={personName} />
              <Divider />
              <InfoRow icon={<GavelIcon sx={{ fontSize: 18 }} />}
                label="Matter"
                value={
                  <Button variant="text" size="small" sx={{ p: 0, fontWeight: 600 }}
                    onClick={() => matterId && navigate(`/matters/${matterId}`)}>
                    {matterTitle}
                  </Button>
                } />
              {clientName !== "—" && <>
                <Divider />
                <InfoRow icon={<Box sx={{ width: 18 }} />}
                  label="Client"
                  value={clientName} />
              </>}
            </Box>
          </Paper>
        </Grid>

        {/* Billing KPIs */}
        <Grid size={{ xs:12, md:4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>
                Hours
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "primary.main", my: 0.5 }}>
                {Number(entry.totalHours ?? 0).toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.disabled">billable hours</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>
                Amount
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "success.main", my: 0.5 }}>
                {formatCurrency(Number(entry.billing ?? 0))}
              </Typography>
              <Chip size="small" label={entry.billingType ?? "Hourly"} variant="outlined" />
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", display: "block", mb: 1 }}>
                Status
              </Typography>
              <StatusBadge status={String(entry.revenueStatus ?? "DRAFT")} />
            </Paper>
          </Box>
        </Grid>
      </Grid>

    
    </PageShell>
  )
}
