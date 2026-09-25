/**
 * Lead Meetings tab — LMS Meetings.js
 * Change status, Upload MOM, View/Download MOM for each meeting.
 */
import { useEffect, useState } from "react"
import {
  Box, Button, FormControl, MenuItem, Paper, Select, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { leadsApi } from "@/api/leads"
import { formatDateTime } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import { UploadMomDialog } from "./UploadMomDialog"
import { ViewMomDialog } from "./ViewMomDialog"

const MEETING_STATUSES = ["SCHEDULE", "COMPLETED", "CANCEL"] as const

interface Props {
  leadId: string
  meetings: Record<string, unknown>[]
  converted: boolean
  writtenOff: boolean
  onSchedule: () => void
  onMeetingsChanged: () => void
}

function meetingStatusOf(m: Record<string, unknown>): string {
  return String(m.meetingStatus ?? m.status ?? "").toUpperCase()
}

export function LeadMeetingsTab({
  leadId: _leadId,
  meetings,
  converted,
  writtenOff,
  onSchedule,
  onMeetingsChanged,
}: Props) {
  const [localMeetings, setLocalMeetings] = useState(meetings)
  const [momMeetingId, setMomMeetingId] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)

  useEffect(() => {
    setLocalMeetings(meetings)
  }, [meetings])

  const rows = localMeetings

  async function handleStatusChange(meetingId: string, meetingStatus: string) {
    if (!meetingStatus) return
    setStatusBusy(meetingId)
    try {
      toast.success(await leadsApi.changeMeetingStatus(meetingId, meetingStatus))
      setLocalMeetings(prev =>
        prev.map(m =>
          String(m.id) === meetingId ? { ...m, meetingStatus, status: meetingStatus } : m,
        ),
      )
      onMeetingsChanged()
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to change meeting status",
      )
    } finally {
      setStatusBusy(null)
    }
  }

  return (
    <Box sx={{ pt: 1 }}>
      <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onSchedule}
          disabled={converted || writtenOff}
        >
          Schedule Meeting
        </Button>
      </Box>

      {!rows.length && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No meetings yet
        </Typography>
      )}

      {rows.map((m, i) => {
        const id = String(m.id ?? i)
        const status = meetingStatusOf(m)
        const canChangeStatus = status !== "COMPLETED" && status !== "CANCEL" && status !== "CANCELED"
        const showMom = status === "COMPLETED"
        const start = String(m.meetingStartTime ?? m.meetingDate ?? m.date ?? m.startTime ?? "")
        const end = String(m.meetingEndTime ?? "")
        const withWhom = String(m.meetingWith ?? m.location ?? "")
        const note = String(m.note ?? m.notes ?? "")

        return (
          <Paper key={id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {String(m.title ?? m.meetingTitle ?? m.subject ?? "Meeting")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                {canChangeStatus && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      displayEmpty
                      value=""
                      disabled={statusBusy === id || converted || writtenOff}
                      onChange={e => { void handleStatusChange(id, String(e.target.value)) }}
                      renderValue={() => "Change status"}
                    >
                      <MenuItem value="" disabled>- select -</MenuItem>
                      {MEETING_STATUSES.map(s => (
                        <MenuItem key={s} value={s}>{s === "CANCEL" ? "CANCEL" : s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <StatusBadge status={status === "CANCEL" ? "CANCELED" : status} />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1, mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                With: <strong>{withWhom || "—"}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start: <strong>{start ? formatDateTime(start) : "—"}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                End: <strong>{end ? formatDateTime(end) : "—"}</strong>
              </Typography>
            </Box>

            {showMom && (
              <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={converted}
                  onClick={() => { setMomMeetingId(id); setUploadOpen(true) }}
                >
                  Upload MOM
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => { setMomMeetingId(id); setViewOpen(true) }}
                >
                  View MOM
                </Button>
              </Box>
            )}

            {!!note && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}>
                {note}
              </Typography>
            )}
          </Paper>
        )
      })}

      <UploadMomDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        meetingId={momMeetingId}
        onSuccess={onMeetingsChanged}
      />
      <ViewMomDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        meetingId={momMeetingId}
      />
    </Box>
  )
}
