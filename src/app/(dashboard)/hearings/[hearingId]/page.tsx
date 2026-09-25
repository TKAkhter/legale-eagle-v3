/**
 * Hearing detail — LMS `/hearing?m_id=&id=` multi-tab page.
 * Tabs: Overview/Hearings tree · Documents · Notes · Logs · Tasks
 */
import { useMemo, useState, type ReactNode } from "react"
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Paper, Radio, RadioGroup, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import EventAvailableIcon from "@mui/icons-material/EventAvailable"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { Tabs } from "@/components/ui/Tabs"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { HearingFormDrawer } from "@/app/(dashboard)/matters/_components/HearingFormDrawer"
import { ContinueHearingDrawer } from "@/app/(dashboard)/matters/_components/ContinueHearingDrawer"
import { CloseHearingDrawer } from "@/app/(dashboard)/matters/_components/CloseHearingDrawer"
import { OpenHearingDrawer } from "../_components/OpenHearingDrawer"
import { HearingTasksPanel } from "../_components/HearingTasksPanel"
import { hearingsApi } from "@/api/hearings"
import { adminApi } from "@/api/admin"
import { VoiceRecorder } from "@/components/voice/VoiceRecorder"
import { saveHearingToOutlook } from "@/lib/outlook/calendar"
import { formatDate, formatDateTime } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"
import type { GridParams } from "@/types/common.types"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

function personName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const u = v as { firstName?: string; lastName?: string; fullName?: string; name?: string } | null
  if (!u) return "—"
  return u.fullName || u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"
}

function locName(v: unknown): string {
  if (typeof v === "string") return v || "—"
  const loc = v as { name?: string; locationName?: string } | null
  return loc?.name ?? loc?.locationName ?? "—"
}

function matterIdOf(row: Record<string, unknown>): string {
  const mini = row.matterMini as { matterId?: string; id?: string } | null
  const matter = row.matter as { id?: string; matterId?: string } | null
  return String(row.matterId ?? mini?.matterId ?? mini?.id ?? matter?.matterId ?? matter?.id ?? "")
}

function hearingIdOf(row: Record<string, unknown>): string {
  return String(row.hearingId ?? row.id ?? "")
}

function isClosed(row: Record<string, unknown>): boolean {
  return String(row.status ?? "").toUpperCase().includes("CLOSE")
}

function HearingNotesPanel({ hearingId }: { hearingId: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [noteType, setNoteType] = useState<"Text" | "Voice">("Text")
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [recorderKey, setRecorderKey] = useState(0)

  const notesQuery = useQuery({
    queryKey: ["hearings", "notes", hearingId],
    queryFn: () => hearingsApi.getNotes(hearingId, { page: 0, pageSize: 50 }),
    enabled: !!hearingId,
  })

  function resetForm() {
    setTitle("")
    setContent("")
    setNoteType("Text")
    setVoiceBlob(null)
    setRecorderKey(k => k + 1)
  }

  function closeDialog() {
    setOpen(false)
    resetForm()
  }

  const addNote = useMutation({
    mutationFn: () => hearingsApi.addNote(hearingId, {
      title: title.trim(),
      content: content.trim(),
      noteType,
      voiceBlob: noteType === "Voice" ? (voiceBlob ?? undefined) : undefined,
    }),
    onSuccess: () => {
      toast.success("Note added")
      closeDialog()
      qc.invalidateQueries({ queryKey: ["hearings", "notes", hearingId] })
    },
    onError: (error: { message?: string }) => toast.error(error.message ?? "Failed to add note"),
  })

  const canSave = title.trim().length > 0
    && (noteType === "Text" ? content.trim().length > 0 : !!voiceBlob)
    && !addNote.isPending

  const notes = notesQuery.data?.content ?? []

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notes</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Note
        </Button>
      </Box>
      {notes.map(note => (
        <Paper key={String(note.id)} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{String(note.title ?? "Note")}</Typography>
          {String(note.noteType ?? "Text") === "Voice" && note.voiceContent ? (
            <Box sx={{ mt: 1 }}>
              <audio src={String(note.voiceContent)} controls />
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap" }}>
              {String(note.textContent ?? note.content ?? "")}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {String(note.createdBy ?? "")} · {formatDateTime(String(note.createdAt ?? ""))}
          </Typography>
        </Paper>
      ))}
      {!notes.length && !notesQuery.isLoading && (
        <Typography variant="body2" color="text.secondary">No notes yet</Typography>
      )}

      <Dialog open={open} onClose={() => !addNote.isPending && closeDialog()} fullWidth maxWidth="sm">
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            autoFocus
            disabled={addNote.isPending}
          />
          <RadioGroup
            row
            value={noteType}
            onChange={(_, v) => {
              const next = v as "Text" | "Voice"
              setNoteType(next)
              if (next === "Text") {
                setVoiceBlob(null)
                setRecorderKey(k => k + 1)
              } else {
                setContent("")
              }
            }}
          >
            <FormControlLabel value="Text" control={<Radio size="small" />} label="Text" disabled={addNote.isPending} />
            <FormControlLabel value="Voice" control={<Radio size="small" />} label="Voice" disabled={addNote.isPending} />
          </RadioGroup>
          {noteType === "Text" ? (
            <TextField
              label="Content"
              value={content}
              onChange={e => setContent(e.target.value)}
              fullWidth
              multiline
              rows={5}
              disabled={addNote.isPending}
            />
          ) : (
            <VoiceRecorder
              key={recorderKey}
              disabled={addNote.isPending}
              onReady={blob => setVoiceBlob(blob)}
              onClear={() => setVoiceBlob(null)}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={addNote.isPending}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSave}
            onClick={() => addNote.mutate()}
          >
            {addNote.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function HearingsTreePanel({
  parentHearingId,
  matterId,
  oneDriveEnabled,
  onContinue,
  onClose,
  onEdit,
  onReopen,
  onOutlook,
  onOpenMatter,
  gridKey,
}: {
  parentHearingId: string
  matterId: string
  oneDriveEnabled: boolean
  onContinue: (row: Record<string, unknown>) => void
  onClose: (hearingId: string, matterId: string) => void
  onEdit: (row: Record<string, unknown>) => void
  onReopen: (hearingId: string) => void
  onOutlook: (row: Record<string, unknown>) => void
  onOpenMatter: (matterId: string) => void
  gridKey: number
}) {
  return (
    <DataGrid
      key={gridKey}
      columns={[
        { field: "caseType", header: "Case Type", renderCell: v => String(v ?? "—") },
        { field: "caseNo", header: "Case No", renderCell: v => String(v ?? "—") },
        { field: "caseYear", header: "Case Year", renderCell: v => String(v ?? "—") },
        { field: "chamberNo", header: "Chamber No", renderCell: v => String(v ?? "—") },
        {
          field: "hearingsType",
          header: "Hearing Type",
          renderCell: (v, row) => String(
            (v as { name?: string } | undefined)?.name
            ?? (row as Record<string, unknown>).hearingType
            ?? "—",
          ),
        },
        { field: "hearingDate", header: "Hearing Date", renderCell: v => (v ? formatDate(String(v)) : "—") },
        { field: "hearingTime", header: "Time", renderCell: v => String(v || "—") },
        {
          field: "nextHearingDate",
          header: "Next Hearing",
          renderCell: v => (v && String(v) !== "Invalid date" ? formatDate(String(v)) : "—"),
        },
        {
          field: "hearingLocation",
          header: "Location",
          renderCell: (v, row) => locName(v ?? (row as Record<string, unknown>).location),
        },
        { field: "note", header: "Note", renderCell: v => String(v ?? "—") },
        { field: "description", header: "Instruction", renderCell: v => String(v ?? "—") },
        {
          field: "preSummary",
          header: "Previous Summary",
          renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).prvSummary ?? "—"),
        },
        { field: "summary", header: "Decision Summary", renderCell: v => String(v ?? "—") },
        { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
      ]}
      queryKey={["hearings", "tree", parentHearingId]}
      queryFn={async (p: GridParams) => {
        const rows = await hearingsApi.getParentChild(parentHearingId)
        const start = p.page * p.pageSize
        const slice = rows.slice(start, start + p.pageSize)
        return {
          content: slice,
          totalElements: rows.length,
          totalPages: Math.ceil(rows.length / p.pageSize) || 0,
          number: p.page,
          size: p.pageSize,
          first: p.page === 0,
          last: start + p.pageSize >= rows.length,
          empty: slice.length === 0,
        }
      }}
      zebraStriping
      emptyState={
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography color="text.secondary">No related hearings in this chain</Typography>
        </Box>
      }
      rowMenuItems={row => {
        const r = row as Record<string, unknown>
        const hid = hearingIdOf(r)
        const mid = matterIdOf(r) || matterId
        const closed = isClosed(r)
        const current = r.current !== false
        const hasMeeting = Boolean(r.meetingId)
        return [
          {
            label: "Continue",
            icon: <PlayArrowIcon fontSize="small" />,
            hidden: () => closed || !current || !mid,
            onClick: () => onContinue({ ...r, id: hid, matterId: mid }),
          },
          {
            label: "Close",
            icon: <CloseIcon fontSize="small" />,
            hidden: () => closed || !hid || !mid,
            onClick: () => onClose(hid, mid),
          },
          {
            label: "Reopen",
            icon: <RestartAltIcon fontSize="small" />,
            hidden: () => !closed || !hid,
            onClick: () => onReopen(hid),
          },
          {
            label: "Edit",
            icon: <EditIcon fontSize="small" />,
            hidden: () => closed || !hid || !mid,
            onClick: () => onEdit({ ...r, id: hid, matterId: mid }),
          },
          {
            label: "Save to Outlook",
            icon: <EventAvailableIcon fontSize="small" />,
            hidden: () => !oneDriveEnabled || hasMeeting || !hid || closed,
            onClick: () => onOutlook({ ...r, id: hid, matterId: mid }),
          },
          {
            label: "Open Matter",
            icon: <OpenInNewIcon fontSize="small" />,
            hidden: () => !mid,
            onClick: () => onOpenMatter(mid),
          },
        ]
      }}
    />
  )
}

export default function HearingDetailPage() {
  const { t } = useTranslation()
  const { hearingId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const matterId = searchParams.get("matterId") || searchParams.get("m_id") || ""
  const hearingLabel = t("nav.hearing")
  const hearingsListLabel = t("nav.hearings")

  const [gridKey, setGridKey] = useState(0)
  const [continueRow, setContinueRow] = useState<Record<string, unknown> | null>(null)
  const [closeTarget, setCloseTarget] = useState<{ hearingId: string; matterId: string } | null>(null)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [reopenId, setReopenId] = useState<string | null>(null)
  const [outlookHearing, setOutlookHearing] = useState<Record<string, unknown> | null>(null)
  const [outlookSaving, setOutlookSaving] = useState(false)

  const { data: hearing, isLoading, isError } = useQuery({
    queryKey: ["hearings", "detail", matterId, hearingId],
    queryFn: () => hearingsApi.getByMatterAndId(matterId, hearingId!),
    enabled: !!hearingId && !!matterId,
  })

  const companyQ = useQuery({
    queryKey: ["company", "info", "oneDrive"],
    queryFn: () => adminApi.getCompanyInfo() as Promise<Record<string, unknown>>,
  })
  const oneDriveEnabled = Boolean(companyQ.data?.oneDrive)

  const h = (hearing ?? {}) as Record<string, unknown>
  const resolvedMatterId = matterId || matterIdOf(h)
  const hid = hearingId || hearingIdOf(h)
  const closed = isClosed(h)
  const current = h.current !== false
  const hasMeeting = Boolean(h.meetingId)
  const title = String(
    h.hearingTitle
    ?? (h.hearingsType as { name?: string } | undefined)?.name
    ?? h.hearingType
    ?? h.caseNo
    ?? hearingLabel,
  )

  function refresh() {
    setGridKey(k => k + 1)
    qc.invalidateQueries({ queryKey: ["hearings"] })
  }

  async function confirmSaveOutlook() {
    if (!outlookHearing) return
    setOutlookSaving(true)
    try {
      await saveHearingToOutlook({
        ...outlookHearing,
        id: hearingIdOf(outlookHearing),
        hearingId: hearingIdOf(outlookHearing),
      })
      toast.success("Saved to Outlook successfully")
      setOutlookHearing(null)
      refresh()
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? "Failed to save to Outlook")
    } finally {
      setOutlookSaving(false)
    }
  }

  const actions = useMemo(() => {
    if (!hid || !resolvedMatterId) return null
    const nodes: ReactNode[] = []
    if (!closed && current) {
      nodes.push(
        <Button key="continue" variant="contained" startIcon={<PlayArrowIcon />}
          onClick={() => setContinueRow({ ...h, id: hid, matterId: resolvedMatterId })}>
          Continue
        </Button>,
      )
      nodes.push(
        <Button key="close" variant="outlined" color="error" startIcon={<CloseIcon />}
          onClick={() => setCloseTarget({ hearingId: hid, matterId: resolvedMatterId })}>
          Close
        </Button>,
      )
      nodes.push(
        <Button key="edit" variant="outlined" startIcon={<EditIcon />}
          onClick={() => setEditRow({ ...h, id: hid, matterId: resolvedMatterId })}>
          Edit
        </Button>,
      )
    }
    if (closed) {
      nodes.push(
        <Button key="reopen" variant="outlined" startIcon={<RestartAltIcon />}
          onClick={() => setReopenId(hid)}>
          Reopen
        </Button>,
      )
    }
    if (oneDriveEnabled && !hasMeeting && !closed) {
      nodes.push(
        <Button key="outlook" variant="outlined" startIcon={<EventAvailableIcon />}
          onClick={() => setOutlookHearing({ ...h, id: hid, matterId: resolvedMatterId })}>
          Outlook
        </Button>,
      )
    }
    nodes.push(
      <Button key="matter" variant="text" startIcon={<OpenInNewIcon />}
        component={RouterLink} to={`/matters/${resolvedMatterId}`}>
        Matter
      </Button>,
    )
    return nodes
  }, [hid, resolvedMatterId, closed, current, oneDriveEnabled, hasMeeting, h])

  if (!hearingId) {
    return (
      <PageShell title={hearingLabel} breadcrumbs={[{ label: hearingsListLabel, path: "/hearings" }, { label: t("common.notFound", "Not found") }]}>
        <Typography color="text.secondary">Missing hearing id.</Typography>
      </PageShell>
    )
  }

  if (!matterId) {
    return (
      <PageShell
        title={hearingLabel}
        breadcrumbs={[{ label: hearingsListLabel, path: "/hearings" }, { label: hearingId }]}
        description={t("pages.hearingDesc")}
      >
        <Tabs tabs={[
          {
            label: "Hearings",
            content: (
              <HearingsTreePanel
                parentHearingId={hearingId}
                matterId=""
                oneDriveEnabled={oneDriveEnabled}
                gridKey={gridKey}
                onContinue={setContinueRow}
                onClose={(hid, mid) => setCloseTarget({ hearingId: hid, matterId: mid })}
                onEdit={setEditRow}
                onReopen={setReopenId}
                onOutlook={setOutlookHearing}
                onOpenMatter={mid => navigate(`/matters/${mid}`)}
              />
            ),
          },
          { label: "Documents", content: <DocumentsTab relatedTo="HEARING" relatedToId={hearingId} label="hearing" /> },
          { label: "Notes", content: <HearingNotesPanel hearingId={hearingId} /> },
          {
            label: "Logs",
            content: (
              <DataGrid
                columns={[
                  { field: "logType", header: "Type", renderCell: v => String(v ?? "—") },
                  { field: "logTitle", header: "Title", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
                  { field: "createdBy", header: "Created By", renderCell: v => String(v ?? "—") },
                  { field: "createdAt", header: "Created At", renderCell: v => (v ? formatDateTime(String(v)) : "—") },
                ]}
                queryKey={["hearings", "logs", hearingId]}
                queryFn={(p: GridParams) => hearingsApi.getLogs(hearingId, p)}
                zebraStriping
              />
            ),
          },
          {
            label: "Tasks",
            content: <HearingTasksPanel hearingId={hearingId} />,
          },
        ]} />
        <HearingFormDrawer
          open={!!editRow}
          matterId={editRow ? matterIdOf(editRow) : undefined}
          hearingId={editRow ? hearingIdOf(editRow) : undefined}
          initial={editRow ? {
            caseNo: String(editRow.caseNo ?? ""),
            hearingDate: String(editRow.hearingDate ?? editRow.nextHearingDate ?? "").slice(0, 10),
            hearingTime: String(editRow.hearingTime ?? ""),
            location: locName(editRow.hearingLocation ?? editRow.location),
            hearingType: String(
              (editRow.hearingsType as { name?: string } | undefined)?.name
              ?? editRow.hearingType
              ?? "",
            ),
            notes: String(editRow.note ?? editRow.notes ?? ""),
          } : undefined}
          onClose={() => setEditRow(null)}
          onSuccess={() => { toast.success("Hearing updated"); refresh() }}
        />
        <ContinueHearingDrawer
          open={!!continueRow}
          hearing={continueRow}
          matterId={continueRow ? matterIdOf(continueRow) : ""}
          onClose={() => setContinueRow(null)}
          onSuccess={() => { toast.success("Hearing continued"); refresh() }}
        />
        <CloseHearingDrawer
          open={!!closeTarget}
          hearingId={closeTarget?.hearingId ?? ""}
          matterId={closeTarget?.matterId || (continueRow ? matterIdOf(continueRow) : "") || (editRow ? matterIdOf(editRow) : "")}
          onClose={() => setCloseTarget(null)}
          onSuccess={() => { toast.success("Hearing closed"); refresh() }}
        />
        <OpenHearingDrawer
          open={!!reopenId}
          hearingId={reopenId ?? ""}
          onClose={() => setReopenId(null)}
          onSuccess={() => { toast.success("Hearing reopened"); refresh() }}
        />
        <Dialog open={!!outlookHearing} onClose={() => !outlookSaving && setOutlookHearing(null)}>
          <DialogTitle>Save Hearing in Outlook Calendar</DialogTitle>
          <DialogContent>
            Are you sure you want to save this hearing as an Outlook meeting?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOutlookHearing(null)} disabled={outlookSaving}>Cancel</Button>
            <Button variant="contained" disabled={outlookSaving} onClick={() => { void confirmSaveOutlook() }}>
              {outlookSaving ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </PageShell>
    )
  }

  if (isLoading) return <PageShell title={hearingLabel}><DetailSkeleton /></PageShell>

  if (isError || !hearing) {
    return (
      <PageShell title={hearingLabel} breadcrumbs={[{ label: hearingsListLabel, path: "/hearings" }, { label: t("common.notFound", "Not found") }]}>
        <Typography color="text.secondary">Hearing not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/hearings")}>Back to Hearings</Button>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={title}
      description={[h.caseNo, h.caseYear].filter(Boolean).join(" / ") || undefined}
      breadcrumbs={[{ label: hearingsListLabel, path: "/hearings" }, { label: title }]}
      action={actions?.length ? <>{actions}</> : undefined}
    >
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 1 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <StatusBadge status={String(h.status ?? "")} />
          {h.current === true && <StatusBadge status="Current" />}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          <InfoRow label="Hearing Date" value={h.hearingDate ? formatDate(String(h.hearingDate)) : "—"} />
          <InfoRow label="Time" value={String(h.hearingTime ?? "—")} />
          <InfoRow
            label="Next Hearing"
            value={h.nextHearingDate && String(h.nextHearingDate) !== "Invalid date"
              ? formatDate(String(h.nextHearingDate))
              : "—"}
          />
          <InfoRow label="Location" value={locName(h.hearingLocation ?? h.location)} />
          <InfoRow label="Attorney" value={personName(h.attorney) !== "—" ? personName(h.attorney) : String(h.attorneyName ?? "—")} />
          <InfoRow label="Attended" value={personName(h.attendedAttorney)} />
          <InfoRow
            label="Matter"
            value={
              resolvedMatterId
                ? (
                  <Button component={RouterLink} to={`/matters/${resolvedMatterId}`} size="small" sx={{ p: 0, minWidth: 0, textTransform: "none" }}>
                    {String(h.matterTitle ?? (h.matterMini as { title?: string } | undefined)?.title ?? (h.matter as { title?: string } | undefined)?.title ?? resolvedMatterId)}
                  </Button>
                )
                : "—"
            }
          />
          <InfoRow label="Case No" value={[h.caseNo, h.caseYear].filter(Boolean).join(" / ") || "—"} />
          <InfoRow label="Chamber" value={String(h.chamberNo ?? "—")} />
        </Box>
        {!!(h.note || h.notes || h.description || h.summary) && (
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            {!!(h.note || h.notes) && <InfoRow label="Note" value={String(h.note ?? h.notes)} />}
            {!!h.description && <InfoRow label="Instruction" value={String(h.description)} />}
            {!!h.summary && <InfoRow label="Decision Summary" value={String(h.summary)} />}
          </Box>
        )}
      </Paper>

      <Tabs tabs={[
        {
          label: "Hearings",
          content: (
            <HearingsTreePanel
              parentHearingId={hid}
              matterId={resolvedMatterId}
              oneDriveEnabled={oneDriveEnabled}
              gridKey={gridKey}
              onContinue={setContinueRow}
              onClose={(hid, mid) => setCloseTarget({ hearingId: hid, matterId: mid || resolvedMatterId })}
              onEdit={setEditRow}
              onReopen={setReopenId}
              onOutlook={setOutlookHearing}
              onOpenMatter={mid => navigate(`/matters/${mid}`)}
            />
          ),
        },
        {
          label: "Documents",
          content: <DocumentsTab relatedTo="HEARING" relatedToId={hid} label="hearing" />,
        },
        {
          label: "Notes",
          content: <HearingNotesPanel hearingId={hid} />,
        },
        {
          label: "Logs",
          content: (
            <DataGrid
              columns={[
                { field: "logType", header: "Type", renderCell: v => String(v ?? "—") },
                { field: "logTitle", header: "Title", renderCell: (v, row) => String(v ?? (row as { title?: string }).title ?? "—") },
                { field: "createdBy", header: "Created By", renderCell: v => String(v ?? "—") },
                { field: "createdAt", header: "Created At", renderCell: v => (v ? formatDateTime(String(v)) : "—") },
              ]}
              queryKey={["hearings", "logs", hid]}
              queryFn={(p: GridParams) => hearingsApi.getLogs(hid, p)}
              zebraStriping
            />
          ),
        },
        {
          label: "Tasks",
          content: <HearingTasksPanel hearingId={hid} />,
        },
      ]} />

      <HearingFormDrawer
        open={!!editRow}
        matterId={editRow ? matterIdOf(editRow) || resolvedMatterId : undefined}
        hearingId={editRow ? hearingIdOf(editRow) : undefined}
        initial={editRow ? {
          caseNo: String(editRow.caseNo ?? ""),
          hearingDate: String(editRow.hearingDate ?? editRow.nextHearingDate ?? "").slice(0, 10),
          hearingTime: String(editRow.hearingTime ?? ""),
          location: locName(editRow.hearingLocation ?? editRow.location),
          hearingType: String(
            (editRow.hearingsType as { name?: string } | undefined)?.name
            ?? editRow.hearingType
            ?? "",
          ),
          notes: String(editRow.note ?? editRow.notes ?? ""),
        } : undefined}
        onClose={() => setEditRow(null)}
        onSuccess={() => { toast.success("Hearing updated"); refresh() }}
      />
      <ContinueHearingDrawer
        open={!!continueRow}
        hearing={continueRow}
        matterId={continueRow ? (matterIdOf(continueRow) || resolvedMatterId) : ""}
        onClose={() => setContinueRow(null)}
        onSuccess={() => { toast.success("Hearing continued"); refresh() }}
      />
      <CloseHearingDrawer
        open={!!closeTarget}
        hearingId={closeTarget?.hearingId ?? ""}
        matterId={closeTarget?.matterId || resolvedMatterId}
        onClose={() => setCloseTarget(null)}
        onSuccess={() => { toast.success("Hearing closed"); refresh() }}
      />
      <OpenHearingDrawer
        open={!!reopenId}
        hearingId={reopenId ?? ""}
        matterId={resolvedMatterId}
        onClose={() => setReopenId(null)}
        onSuccess={() => { toast.success("Hearing reopened"); refresh() }}
      />
      <Dialog open={!!outlookHearing} onClose={() => !outlookSaving && setOutlookHearing(null)}>
        <DialogTitle>Save Hearing in Outlook Calendar</DialogTitle>
        <DialogContent>
          Are you sure you want to save this hearing as an Outlook meeting?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutlookHearing(null)} disabled={outlookSaving}>Cancel</Button>
          <Button variant="contained" disabled={outlookSaving} onClick={() => { void confirmSaveOutlook() }}>
            {outlookSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
