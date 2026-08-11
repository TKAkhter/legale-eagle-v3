/**
 * Email Viewer — Outlook-style 3-panel layout.
 *
 * Layout:
 *   ┌──────────┬─────────────────┬─────────────────────────────┐
 *   │ Folders  │  Message List   │  Message Preview            │
 *   │ Inbox(3) │  ─────────────  │  From: Sarah Johnson        │
 *   │ Sent     │  From: Sarah    │  Subject: Matter 260303...  │
 *   │ Drafts   │  Subject...     │  ─────────────────────────  │
 *   │ Trash    │  ─────────────  │  Body text here...          │
 *   └──────────┴─────────────────┴─────────────────────────────┘
 *
 * Responsive:
 *   Tablet: folders collapse to icon-only, list + preview side by side
 *   Mobile: one panel at a time with back navigation
 *
 * Static mode: uses emails from src/data/static.ts
 * Live mode:   uses Microsoft Graph via emailApi
 */
import { useState } from "react"
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Badge, IconButton, Tooltip,
  Paper, Chip, CircularProgress, Button, useMediaQuery,
} from "@mui/material"
import InboxIcon        from "@mui/icons-material/Inbox"
import SendIcon         from "@mui/icons-material/Send"
import DraftsIcon       from "@mui/icons-material/Drafts"
import StarIcon         from "@mui/icons-material/Star"
import DeleteIcon       from "@mui/icons-material/Delete"
import FolderIcon       from "@mui/icons-material/Folder"
import StarBorderIcon   from "@mui/icons-material/StarBorder"
import AttachFileIcon   from "@mui/icons-material/AttachFile"
import ReplyIcon        from "@mui/icons-material/Reply"

import ArrowBackIcon    from "@mui/icons-material/ArrowBack"
import RefreshIcon      from "@mui/icons-material/Refresh"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { emailApi, type Email, type EmailFolder } from "@/api/email"
import { formatDateTime, fromNow } from "@lib/utils/formatDate"
import { toast }   from "@/lib/toast"
import { logger }  from "@/lib/logger"

// Icon map for folder icons
const FOLDER_ICONS: Record<string, React.ReactNode> = {
  Inbox:   <InboxIcon  fontSize="small" />,
  Send:    <SendIcon   fontSize="small" />,
  Drafts:  <DraftsIcon fontSize="small" />,
  Star:    <StarIcon   fontSize="small" />,
  Delete:  <DeleteIcon fontSize="small" />,
  Folder:  <FolderIcon fontSize="small" />,
}

/** Format file size for display */
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function EmailPage() {
  const qc             = useQueryClient()
  const isDesktop      = useMediaQuery("(min-width:1024px)")
  const isTablet       = useMediaQuery("(min-width:640px)")

  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedEmail,  setSelectedEmail]  = useState<Email | null>(null)
  // Mobile: which panel to show (0=folders, 1=list, 2=preview)
  const [mobilePanel,    setMobilePanel]    = useState(1)

  // Fetch folders
  const { data: folders = [], isLoading: fLoading } = useQuery<EmailFolder[]>({
    queryKey: ["email", "folders"],
    queryFn:  () => emailApi.getFolders(),
    staleTime: 5 * 60_000,
  })

  // Fetch emails for selected folder
  const { data: emails = [], isLoading: eLoading, refetch } = useQuery<Email[]>({
    queryKey: ["email", "list", selectedFolder],
    queryFn:  () => emailApi.getEmails(selectedFolder),
    staleTime: 60_000,
  })

  // Mark as read mutation
  const markRead = useMutation({
    mutationFn: (id: string) => emailApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email", "list", selectedFolder] }),
  })

  // Delete mutation
  const deleteEmail = useMutation({
    mutationFn: (id: string) => emailApi.delete(id),
    onSuccess: () => {
      setSelectedEmail(null)
      qc.invalidateQueries({ queryKey: ["email", "list", selectedFolder] })
      toast.success("Email moved to trash")
    },
    onError: () => toast.error("Failed to delete email"),
  })

  function handleSelectEmail(email: Email) {
    logger.debug("EmailPage", `Opening email: ${email.subject}`)
    setSelectedEmail(email)
    if (!email.read) markRead.mutate(email.id)
    if (!isTablet) setMobilePanel(2)
  }

  function handleFolderClick(folderId: string) {
    setSelectedFolder(folderId)
    setSelectedEmail(null)
    if (!isTablet) setMobilePanel(1)
  }

  // ─── Folder panel ──────────────────────────────────────────────────────────
  const folderPanel = (
    <Box sx={{ width: isDesktop ? 200 : isTablet ? 56 : "100%", flexShrink: 0, borderRight: "1px solid", borderColor: "divider", height: "100%", overflow: "auto" }}>
      <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {(isDesktop || !isTablet) && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mail</Typography>
        )}
        <Button variant="contained" size="small" sx={{ fontSize: 12, py: 0.5, minWidth: isTablet && !isDesktop ? 36 : "auto" }}>
          {isTablet && !isDesktop ? "+" : "+ Compose"}
        </Button>
      </Box>
      <List dense disablePadding>
        {folders.map(folder => (
          <ListItemButton
            key={folder.id}
            selected={selectedFolder === folder.id}
            onClick={() => handleFolderClick(folder.id)}
            sx={{ px: isTablet && !isDesktop ? 1.5 : 2, py: 0.75, justifyContent: isTablet && !isDesktop ? "center" : "flex-start" }}
          >
            <ListItemIcon sx={{ minWidth: isTablet && !isDesktop ? 0 : 36 }}>
              <Badge badgeContent={folder.unread || undefined} color="primary" max={99}>
                {FOLDER_ICONS[folder.icon] ?? <FolderIcon fontSize="small" />}
              </Badge>
            </ListItemIcon>
            {(isDesktop || !isTablet) && (
              <ListItemText
                primary={folder.label}
                slotProps={{ primary: { style: { fontSize: 13, fontWeight: selectedFolder === folder.id ? 600 : 400 } } }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  // ─── Email list panel ──────────────────────────────────────────────────────
  const listPanel = (
    <Box sx={{ width: isDesktop ? 300 : "100%", flexShrink: 0, borderRight: "1px solid", borderColor: "divider", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
          {folders.find(f => f.id === selectedFolder)?.label ?? selectedFolder}
          {emails.length > 0 && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({emails.length})</Typography>}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => refetch()}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {eLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : emails.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No emails</Typography>
          </Box>
        ) : (
          emails.map(email => (
            <Box
              key={email.id}
              onClick={() => handleSelectEmail(email)}
              sx={{
                px: 2, py: 1.5,
                cursor: "pointer",
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: selectedEmail?.id === email.id
                  ? "action.selected"
                  : !email.read ? "action.hover" : "transparent",
                "&:hover": { bgcolor: "action.hover" },
                transition: "background-color 150ms",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: !email.read ? 700 : 400, fontSize: 12, flex: 1 }} noWrap>
                  {email.from.replace(/<.*>/, "").trim()}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 1, fontSize: 11 }}>
                  {fromNow(email.date)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: !email.read ? 600 : 400, fontSize: 12 }} noWrap>
                {email.subject}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                {email.hasAttachments && <AttachFileIcon sx={{ fontSize: 11, color: "text.disabled" }} />}
                {email.starred && <StarIcon sx={{ fontSize: 11, color: "warning.main" }} />}
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }} noWrap>
                  {email.preview}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  )

  // ─── Email preview panel ───────────────────────────────────────────────────
  const previewPanel = (
    <Box sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      {!selectedEmail ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box sx={{ textAlign: "center", color: "text.disabled" }}>
            <InboxIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2">Select an email to read</Typography>
          </Box>
        </Box>
      ) : (
        <>
          {/* Email header */}
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            {!isTablet && (
              <IconButton size="small" onClick={() => setMobilePanel(1)} sx={{ mb: 1 }}>
                <ArrowBackIcon fontSize="small" /> <Typography variant="caption" sx={{ ml: 0.5 }}>Back</Typography>
              </IconButton>
            )}
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, lineHeight: 1.3 }}>
              {selectedEmail.subject}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedEmail.from}</Typography>
                <Typography variant="caption" color="text.secondary">To: {selectedEmail.to}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                {selectedEmail.hasAttachments && <Chip size="small" icon={<AttachFileIcon />} label="Attachment" variant="outlined" sx={{ fontSize: 11 }} />}
                <Typography variant="caption" color="text.secondary">{formatDateTime(selectedEmail.date)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Action bar */}
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", gap: 1 }}>
            <Button size="small" startIcon={<ReplyIcon />} variant="outlined">Reply</Button>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => deleteEmail.mutate(selectedEmail.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={selectedEmail.starred ? "Unstar" : "Star"}>
              <IconButton size="small">
                {selectedEmail.starred
                  ? <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
                  : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Email body */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {selectedEmail.body}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  )

  // Determine which panels to show based on viewport + mobilePanel state
  const showFolders = isTablet || mobilePanel === 0
  const showList    = isDesktop || (isTablet && !isDesktop) || mobilePanel === 1
  const showPreview = isDesktop || (isTablet && !isDesktop) || mobilePanel === 2

  return (
    <Box sx={{ height: "calc(100vh - 112px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Email</Typography>
        <Typography variant="body2" color="text.secondary">
          Connected to Microsoft 365 Mail
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ flex: 1, display: "flex", overflow: "hidden", borderRadius: 2 }}>
        {showFolders && folderPanel}
        {showList    && listPanel}
        {showPreview && previewPanel}
      </Paper>
    </Box>
  )
}
