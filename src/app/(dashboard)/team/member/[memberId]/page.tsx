import { useMemo, useState } from "react"
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Box, Button, Paper, Rating, Tab, Tabs, TextField } from "@mui/material"
import StarRateIcon from "@mui/icons-material/StarRate"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { Modal } from "@/components/ui/Modal"
import { teamsApi } from "@/api/teams"
import { formatDateTime } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

export default function TeamMemberPage() {
  const { memberId = "" } = useParams()
  const [params] = useSearchParams()
  const teamId = params.get("teamId") ?? ""
  const qc = useQueryClient()
  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("teamMember") ?? "{}") as { name?: string } }
    catch { return {} }
  }, [])
  const [tab, setTab] = useState(0)
  const [gridKey, setGridKey] = useState(0)
  const [rateTask, setRateTask] = useState<{ id: string; title: string } | null>(null)
  const [rating, setRating] = useState<number | null>(0)
  const [ratingNote, setRatingNote] = useState("")
  const [savingRating, setSavingRating] = useState(false)
  const taskStatus = tab === 1 ? "Pending" : tab === 2 ? "Completed" : tab === 3 ? "Re_Submit" : ""

  async function submitRating() {
    if (!rateTask || !teamId || !rating) {
      toast.error("Rating is required")
      return
    }
    setSavingRating(true)
    try {
      toast.success(await teamsApi.submitHodRating({
        activityId: rateTask.id,
        rating,
        teamId,
      }))
      setRateTask(null)
      setRating(0)
      setRatingNote("")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["teams", "member", memberId, "tasks"] })
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? "Failed to submit rating")
    } finally {
      setSavingRating(false)
    }
  }

  return (
    <PageShell
      title={stored.name ?? "Team Member"}
      description={`Member ${memberId}`}
      breadcrumbs={[
        { label: "My Teams", path: "/team" },
        ...(teamId ? [{ label: "Hierarchy", path: `/team/${teamId}` }] : []),
        { label: stored.name ?? memberId },
      ]}
    >
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1 }} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Matters" />
          <Tab label="Pending Tasks" />
          <Tab label="Completed Tasks" />
          <Tab label="Re-Submit Tasks" />
          <Tab label="Hearings" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <DataGrid
          columns={[
            { field: "title", header: "Matter", renderCell: (v, row) => (
              <Button component={RouterLink} to={`/matters/${String((row as { id: string }).id)}`} size="small" sx={{ textTransform: "none" }}>
                {String(v ?? "—")}
              </Button>
            )},
            {
              field: "client",
              header: "Client",
              renderCell: (v, row) => {
                const r = row as Record<string, unknown>
                const c = (v ?? r.client) as { companyName?: string } | string | null
                if (typeof c === "string") return c || "—"
                return c?.companyName ?? String(r.clientName ?? "—")
              },
            },
            { field: "practiceArea", header: "Practice Area", renderCell: (v, row) => {
              const pa = v ?? (row as Record<string, unknown>).practiceAreaName
              if (typeof pa === "object" && pa) return String((pa as { name?: string }).name ?? "—")
              return String(pa ?? "—")
            }},
            { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
            { field: "billingType", header: "Billing" },
          ]}
          queryKey={["teams", "member", memberId, "matters"]}
          queryFn={(p: GridParams) => teamsApi.getMemberMatters(memberId, p)}
        />
      )}

      {tab >= 1 && tab <= 3 && (
        <DataGrid
          key={`${taskStatus}-${gridKey}`}
          columns={[
            {
              field: "title",
              header: "Task",
              renderCell: (v, row) => (
                <Button
                  component={RouterLink}
                  to={`/tasks/${String((row as { id: string }).id)}`}
                  size="small"
                  sx={{ textTransform: "none" }}
                >
                  {String(v ?? "—")}
                </Button>
              ),
            },
            { field: "taskStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
            { field: "dueDate", header: "Due" },
            {
              field: "hodRating",
              header: "HOD Rating",
              renderCell: (v, row) => {
                const r = row as Record<string, unknown>
                const existing = v ?? r.rating ?? r.hodRating
                if (existing != null && existing !== "") return String(existing)
                if (!teamId) return "—"
                return (
                  <Button
                    size="small"
                    startIcon={<StarRateIcon fontSize="small" />}
                    onClick={() => setRateTask({ id: String(r.id), title: String(r.title ?? "Task") })}
                  >
                    Rate
                  </Button>
                )
              },
            },
          ]}
          queryKey={["teams", "member", memberId, "tasks", taskStatus, gridKey]}
          queryFn={(p: GridParams) => teamsApi.getMemberTasks(memberId, taskStatus, p)}
        />
      )}

      {tab === 4 && (
        <DataGrid
          columns={[
            { field: "matterTitle", header: "Matter", renderCell: (v, row) => String(v ?? (row as { matterNo?: string }).matterNo ?? "—") },
            { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
            { field: "caseNo", header: "Case No", renderCell: v => String(v || "—") },
            { field: "hearingDate", header: "Date", renderCell: v => v ? formatDateTime(String(v)) : "—" },
            { field: "location", header: "Location", renderCell: v => String(v || "—") },
            { field: "note", header: "Note", renderCell: v => String(v || "—") },
          ]}
          queryKey={["teams", "member", memberId, "hearings"]}
          queryFn={(p: GridParams) => teamsApi.getMemberHearings(memberId, p)}
        />
      )}

      <Modal
        open={!!rateTask}
        onClose={() => setRateTask(null)}
        title={`Rate: ${rateTask?.title ?? ""}`}
        maxWidth="xs"
        actions={(
          <>
            <Button onClick={() => setRateTask(null)}>Cancel</Button>
            <Button variant="contained" disabled={savingRating || !rating} onClick={submitRating}>
              {savingRating ? "Saving…" : "Submit Rating"}
            </Button>
          </>
        )}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Rating value={rating} onChange={(_, v) => setRating(v)} />
          <TextField
            label="Note (optional)"
            value={ratingNote}
            onChange={e => setRatingNote(e.target.value)}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
        </Box>
      </Modal>
    </PageShell>
  )
}
