import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography,
} from "@mui/material"
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt"
import ReplyIcon from "@mui/icons-material/Reply"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { UserSelectFilter } from "@/components/filters/UserSelectFilter"
import { ticketsApi, TICKET_STATUSES } from "@/api/tickets"
import { useAuthStore } from "@lib/store/authStore"
import { formatDate, fromNow } from "@lib/utils/formatDate"
import { toast } from "@/lib/toast"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

function assigneeLabel(a: unknown): string {
  if (!a || typeof a !== "object") return "—"
  const o = a as { firstName?: string; lastName?: string; fullName?: string; name?: string; id?: string }
  return o.fullName || o.name || `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || String(o.id ?? "—")
}

function commentText(c: Record<string, unknown>): string {
  return String(c.comment ?? c.note ?? c.message ?? c.content ?? c.text ?? "")
}

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isAdmin = Boolean(
    user?.companyUserType === "ADMIN"
    || user?.roles?.includes("ROLE_ADMIN")
    || user?.roles?.includes("ROLE_SUB_ADMIN"),
  )

  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState<string>("")
  const [commentOpen, setCommentOpen] = useState(false)
  const [replyParentId, setReplyParentId] = useState<string | undefined>()
  const [commentTextValue, setCommentTextValue] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", "detail", ticketId],
    queryFn: () => ticketsApi.getById(ticketId!),
    enabled: !!ticketId,
  })

  const t = (data ?? {}) as Record<string, unknown>
  const status = String(t.status ?? "")
  const images = useMemo(() => {
    const raw = t.issueImages ?? t.images
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : []
  }, [t.issueImages, t.images])

  const comments = useMemo(() => {
    const raw = t.comments ?? t.replies ?? t.ticketComments
    if (!Array.isArray(raw)) return [] as Record<string, unknown>[]
    return raw as Record<string, unknown>[]
  }, [t.comments, t.replies, t.ticketComments])

  async function confirmStatusChange() {
    if (!ticketId || !pendingStatus) return
    try {
      await ticketsApi.changeStatus(ticketId, pendingStatus)
      toast.success("Status updated")
      qc.invalidateQueries({ queryKey: ["tickets"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change status")
      throw e
    }
  }

  async function submitAssign() {
    if (!ticketId || !assignUserId) {
      toast.error("Select a user")
      return
    }
    try {
      await ticketsApi.assign(ticketId, assignUserId)
      toast.success("Ticket assigned")
      setAssignOpen(false)
      setAssignUserId("")
      qc.invalidateQueries({ queryKey: ["tickets", "detail", ticketId] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign ticket")
    }
  }

  async function submitComment() {
    if (!ticketId || !commentTextValue.trim()) {
      toast.error("Comment is required")
      return
    }
    try {
      await ticketsApi.addComment(ticketId, commentTextValue.trim(), replyParentId)
      toast.success(replyParentId ? "Reply added" : "Comment added")
      setCommentOpen(false)
      setCommentTextValue("")
      setReplyParentId(undefined)
      qc.invalidateQueries({ queryKey: ["tickets", "detail", ticketId] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add comment")
    }
  }

  if (isLoading) {
    return (
      <PageShell title="Ticket" breadcrumbs={[{ label: "Tickets", path: "/tickets" }, { label: "…" }]}>
        <DetailSkeleton />
      </PageShell>
    )
  }

  if (isError || !data) {
    return (
      <PageShell title="Ticket" breadcrumbs={[{ label: "Tickets", path: "/tickets" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Ticket not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate("/tickets")}>Back to tickets</Button>
      </PageShell>
    )
  }

  const title = String(t.title ?? "Ticket")
  const url = String(t.url ?? "")

  return (
    <PageShell
      title={title}
      description={`Related to ${String(t.issueRelatedTo ?? "—")}`}
      breadcrumbs={[
        { label: "Tickets", path: "/tickets" },
        { label: title },
      ]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {isAdmin && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonAddAltIcon />}
              onClick={() => setAssignOpen(true)}
            >
              Assign
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReplyIcon />}
            onClick={() => { setReplyParentId(undefined); setCommentTextValue(""); setCommentOpen(true) }}
          >
            Comment
          </Button>
          {!isAdmin && status === "Resolved" && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={() => setPendingStatus("ReOpen")}
            >
              Re-Open Ticket
            </Button>
          )}
        </Box>
      )}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 280px" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <InfoRow
            label="URL"
            value={url ? (
              <Typography
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
                sx={{ color: "primary.main", wordBreak: "break-all" }}
              >
                {url}
              </Typography>
            ) : "—"}
          />
          <InfoRow label="Created By" value={String(t.createdByName ?? "—")} />
          <InfoRow
            label="Created Date"
            value={t.createdDate ? formatDate(String(t.createdDate)) : "—"}
          />
          <InfoRow label="Related To" value={String(t.issueRelatedTo ?? "—")} />
          <InfoRow label="Assigned To" value={assigneeLabel(t.assignedTo ?? t.assignee)} />
          {images.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}
              >
                Images
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                {images.map((src, i) => (
                  <Box
                    key={`${src}-${i}`}
                    component="img"
                    src={src}
                    alt={`Issue ${i + 1}`}
                    onClick={() => setImagePreview(src)}
                    sx={{ width: "100%", borderRadius: 1, cursor: "pointer", objectFit: "cover", maxHeight: 140 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Note</Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>
            {String(t.note ?? t.description ?? "—")}
          </Typography>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Comments</Typography>
          </Box>
          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No comments yet.</Typography>
          ) : (
            <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {comments.map((c, idx) => {
                const cid = String(c.id ?? idx)
                const isReply = Boolean(c.parentId)
                return (
                  <Box
                    key={cid}
                    sx={{
                      pl: isReply ? 2 : 0,
                      borderLeft: isReply ? "2px solid" : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {commentText(c) || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
                      {String(c.createdByName ?? c.userName ?? "—")}
                      {c.createdAt ? ` · ${fromNow(String(c.createdAt))}` : ""}
                    </Typography>
                    <Button
                      size="small"
                      sx={{ mt: 0.5, textTransform: "none", minWidth: 0, px: 0.5 }}
                      onClick={() => {
                        setReplyParentId(cid)
                        setCommentTextValue("")
                        setCommentOpen(true)
                      }}
                    >
                      Reply
                    </Button>
                  </Box>
                )
              })}
            </Box>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, alignSelf: "start" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Status</Typography>
          <Box sx={{ mb: 2 }}><StatusBadge status={status} /></Box>
          {isAdmin ? (
            <FormControl fullWidth size="small">
              <InputLabel id="ticket-status-label">Change status</InputLabel>
              <Select
                labelId="ticket-status-label"
                label="Change status"
                value={status}
                onChange={e => {
                  const next = String(e.target.value)
                  if (next && next !== status) setPendingStatus(next)
                }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {TICKET_STATUSES.map((s, index, arr) => {
                  const currentIdx = arr.indexOf(status as typeof s)
                  const disabled = status !== "ReOpen" && currentIdx >= 0 && arr.indexOf(s) < currentIdx
                  return (
                    <MenuItem key={s} value={s} disabled={disabled && s !== status}>
                      {s}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {status === "Resolved"
                ? "You can re-open this ticket if the issue persists."
                : "Only admins can change ticket status."}
            </Typography>
          )}
        </Paper>
      </Box>

      <ConfirmDialog
        open={!!pendingStatus}
        onClose={() => setPendingStatus(null)}
        onConfirm={confirmStatusChange}
        title="Confirmation"
        message="Are you sure you want to change the status?"
        confirmLabel="Confirm"
      />

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <UserSelectFilter
            label="Assign To"
            value={assignUserId}
            onChange={v => setAssignUserId(v ?? "")}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAssign}>Assign</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={commentOpen} onClose={() => setCommentOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{replyParentId ? "Reply" : "Add Comment"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label={replyParentId ? "Reply" : "Comment"}
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={commentTextValue}
            onChange={e => setCommentTextValue(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCommentOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitComment}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md" fullWidth>
        <DialogContent>
          {imagePreview && (
            <Box
              component="img"
              src={imagePreview}
              alt="Full"
              sx={{ maxWidth: "100%", maxHeight: "80vh", display: "block", mx: "auto" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
