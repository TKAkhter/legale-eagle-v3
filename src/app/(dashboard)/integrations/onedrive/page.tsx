/**
 * OneDrive File Manager — browser-style file manager UI.
 *
 * Features:
 *   - Breadcrumb navigation (click to go back up)
 *   - Grid / list view toggle
 *   - Upload (click or drag-and-drop)
 *   - New folder
 *   - Rename (inline click on name)
 *   - Delete (with confirm dialog)
 *   - Download
 *   - Right-click context menu
 *   - File type icons (PDF, Word, Excel, folder)
 *
 * Static mode: uses fileTree from src/data/static.ts (in-memory, mutations persist until refresh)
 * Live mode:   calls Microsoft Graph / OneDrive API
 */
import { useState, useRef, useCallback } from "react"
import {
  Box, Typography, IconButton, Tooltip, Button, Grid, Paper,
  List, ListItem, ListItemIcon, ListItemText, LinearProgress,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, Divider, useMediaQuery, Chip,
} from "@mui/material"
import FolderIcon           from "@mui/icons-material/Folder"
import FolderOpenIcon       from "@mui/icons-material/FolderOpen"
import PictureAsPdfIcon     from "@mui/icons-material/PictureAsPdf"
import DescriptionIcon      from "@mui/icons-material/Description"
import TableChartIcon       from "@mui/icons-material/TableChart"
import InsertDriveFileIcon  from "@mui/icons-material/InsertDriveFile"
import GridViewIcon         from "@mui/icons-material/GridView"
import ViewListIcon         from "@mui/icons-material/ViewList"
import CloudUploadIcon      from "@mui/icons-material/CloudUpload"
import CreateNewFolderIcon  from "@mui/icons-material/CreateNewFolder"
import DownloadIcon         from "@mui/icons-material/Download"
import DeleteIcon    from "@mui/icons-material/Delete"
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline"
import NavigateNextIcon     from "@mui/icons-material/NavigateNext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fileManagerApi, type FileItem } from "@/api/fileManager"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { formatDateTime } from "@lib/utils/formatDate"
import { toast }  from "@/lib/toast"
import { logger } from "@/lib/logger"

/** Get icon component for a file */
function FileIcon({ item, size = 24 }: { item: FileItem; size?: number }) {
  if (item.type === "folder") return <FolderIcon sx={{ fontSize: size, color: "#F59E0B" }} />
  const m = item.mimeType ?? ""
  if (m.includes("pdf"))   return <PictureAsPdfIcon    sx={{ fontSize: size, color: "#EF4444" }} />
  if (m.includes("word") || item.name.endsWith(".docx")) return <DescriptionIcon  sx={{ fontSize: size, color: "#3B82F6" }} />
  if (m.includes("excel") || m.includes("sheet") || item.name.endsWith(".xlsx"))  return <TableChartIcon  sx={{ fontSize: size, color: "#22C55E" }} />
  return <InsertDriveFileIcon sx={{ fontSize: size, color: "#94A3B8" }} />
}

/** Format file size */
function fmtSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function FileManagerPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDesktop = useMediaQuery("(min-width:1024px)")

  // Navigation state — stack of { id, name } for breadcrumbs
  const [pathStack, setPathStack] = useState<{ id: string; name: string }[]>([])
  const currentFolderId = pathStack[pathStack.length - 1]?.id ?? ""

  const [viewMode,      setViewMode]      = useState<"grid" | "list">("grid")
  const [dragging,      setDragging]      = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [uploadProgress,setUploadProgress]= useState(0)
  const [renameItem,    setRenameItem]    = useState<FileItem | null>(null)
  const [renameValue,   setRenameValue]   = useState("")
  const [deleteItem,    setDeleteItem]    = useState<FileItem | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [contextMenu,   setContextMenu]   = useState<{ x: number; y: number; item: FileItem } | null>(null)

  // Fetch current folder contents
  const { data: items = [], isLoading, refetch } = useQuery<FileItem[]>({
    queryKey: ["files", currentFolderId || "root"],
    queryFn:  () => fileManagerApi.listFolder(currentFolderId),
    staleTime: 30_000,
  })

  // Mutations
  const createFolder = useMutation({
    mutationFn: (name: string) => fileManagerApi.createFolder(currentFolderId, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); toast.success("Folder created") },
    onError:   () => toast.error("Failed to create folder"),
  })

  const renameFile = useMutation({
    mutationFn: ({ item, name }: { item: FileItem; name: string }) =>
      fileManagerApi.rename(item.id, name, currentFolderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); toast.success("Renamed") },
    onError:   () => toast.error("Failed to rename"),
  })

  const deleteFile = useMutation({
    mutationFn: (item: FileItem) => fileManagerApi.delete(item.id, currentFolderId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); toast.success("Deleted") },
    onError:   () => toast.error("Failed to delete"),
  })

  // File upload
  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadProgress(0)
    let done = 0
    for (const file of Array.from(files)) {
      try {
        await fileManagerApi.uploadFile(currentFolderId, file)
        done++
        setUploadProgress(Math.round((done / files.length) * 100))
      } catch (e) {
        logger.error("FileManager", `Failed to upload ${file.name}`, e)
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    setUploading(false)
    qc.invalidateQueries({ queryKey: ["files"] })
    toast.success(`${done} file${done > 1 ? "s" : ""} uploaded`)
  }

  // Drag and drop
  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleUpload(e.dataTransfer.files)
  }, [currentFolderId]) // eslint-disable-line

  // Navigate into a folder
  function openFolder(item: FileItem) {
    logger.debug("FileManager", `Opening folder: ${item.name}`)
    setPathStack(prev => [...prev, { id: item.id, name: item.name }])
  }

  // Breadcrumb navigation
  function navigateTo(index: number) {
    if (index < 0) setPathStack([])
    else setPathStack(prev => prev.slice(0, index + 1))
  }

  function startRename(item: FileItem) {
    setRenameItem(item)
    setRenameValue(item.name)
    setContextMenu(null)
  }

  async function commitRename() {
    if (!renameItem || !renameValue.trim() || renameValue === renameItem.name) {
      setRenameItem(null)
      return
    }
    await renameFile.mutateAsync({ item: renameItem, name: renameValue.trim() })
    setRenameItem(null)
  }

  async function handleDownload(item: FileItem) {
    try {
      const url = await fileManagerApi.getDownloadUrl(item.id)
      const a = document.createElement("a")
      a.href = url; a.download = item.name; a.click()
    } catch {
      toast.error("Failed to download file")
    }
  }

  // Render one file/folder item
  function renderItem(item: FileItem) {
    const isRenaming = renameItem?.id === item.id

    if (viewMode === "grid") {
      return (
        <Box
          key={item.id}
          onDoubleClick={() => item.type === "folder" ? openFolder(item) : handleDownload(item)}
          onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }) }}
          sx={{
            p: 1.5, borderRadius: 2, cursor: "pointer", textAlign: "center",
            border: "1px solid", borderColor: "divider",
            "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
            transition: "all 150ms",
          }}
        >
          <FileIcon item={item} size={40} />
          {isRenaming ? (
            <TextField
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => e.key === "Enter" && commitRename()}
              size="small" autoFocus
              sx={{ mt: 0.5, "& input": { textAlign: "center", fontSize: 12, py: 0.5 } }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 500, wordBreak: "break-all", fontSize: 11 }} noWrap>
              {item.name}
            </Typography>
          )}
          {item.size != null && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
              {fmtSize(item.size)}
            </Typography>
          )}
        </Box>
      )
    }

    // List view
    return (
      <ListItem
        key={item.id}
        onDoubleClick={() => item.type === "folder" ? openFolder(item) : handleDownload(item)}
        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }) }}
        sx={{ py: 0.75, cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1 }}
        secondaryAction={
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {item.type === "file" && (
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => handleDownload(item)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Rename">
              <IconButton size="small" onClick={() => startRename(item)}>
                <DriveFileRenameOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteItem(item)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      >
        <ListItemIcon sx={{ minWidth: 36 }}><FileIcon item={item} size={20} /></ListItemIcon>
        {isRenaming ? (
          <TextField
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => e.key === "Enter" && commitRename()}
            size="small" autoFocus sx={{ maxWidth: 300 }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <ListItemText
            primary={item.name}
            secondary={`${formatDateTime(item.modified)} ${item.size != null ? `· ${fmtSize(item.size)}` : ""}`}
            slotProps={{ primary: { style: { fontSize: 13 } }, secondary: { style: { fontSize: 11 } } }}
          />
        )}
      </ListItem>
    )
  }

  const folders = items.filter(i => i.type === "folder")
  const files   = items.filter(i => i.type === "file")

  return (
    <Box
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        height: "calc(100vh - 112px)",
        display: "flex",
        flexDirection: "column",
        outline: dragging ? "2px dashed" : "none",
        outlineColor: "primary.main",
        borderRadius: 2,
        transition: "outline 150ms",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Files</Typography>
          <Typography variant="body2" color="text.secondary">Microsoft OneDrive</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button variant="outlined" size="small" startIcon={<CreateNewFolderIcon />} onClick={() => { setNewFolderName(""); setNewFolderOpen(true) }}>
            New Folder
          </Button>
          <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()}>
            Upload
          </Button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={e => handleUpload(e.target.files)} />
          <Divider orientation="vertical" flexItem />
          <Tooltip title="Grid view">
            <IconButton size="small" color={viewMode === "grid" ? "primary" : "default"} onClick={() => setViewMode("grid")}>
              <GridViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="List view">
            <IconButton size="small" color={viewMode === "list" ? "primary" : "default"} onClick={() => setViewMode("list")}>
              <ViewListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Breadcrumbs */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5, flexWrap: "wrap" }}>
        <Chip
          size="small"
          icon={<FolderOpenIcon sx={{ fontSize: 14 }} />}
          label="My Files"
          onClick={() => navigateTo(-1)}
          variant={pathStack.length === 0 ? "filled" : "outlined"}
          color={pathStack.length === 0 ? "primary" : "default"}
          sx={{ fontSize: 12 }}
        />
        {pathStack.map((seg, i) => (
          <Box key={seg.id} sx={{ display: "flex", alignItems: "center" }}>
            <NavigateNextIcon sx={{ fontSize: 14, color: "text.disabled" }} />
            <Chip
              size="small"
              label={seg.name}
              onClick={() => navigateTo(i)}
              variant={i === pathStack.length - 1 ? "filled" : "outlined"}
              color={i === pathStack.length - 1 ? "primary" : "default"}
              sx={{ fontSize: 12 }}
            />
          </Box>
        ))}
      </Box>

      {/* Upload progress */}
      {uploading && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">Uploading… {uploadProgress}%</Typography>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5, borderRadius: 1 }} />
        </Box>
      )}

      {/* Drag overlay hint */}
      {dragging && (
        <Box sx={{ position: "absolute", inset: 0, bgcolor: "primary.main", opacity: 0.08, borderRadius: 2, zIndex: 10, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h6" color="primary">Drop files to upload</Typography>
        </Box>
      )}

      {/* File grid / list */}
      <Paper variant="outlined" sx={{ flex: 1, overflow: "auto", borderRadius: 2, p: 2, position: "relative" }}>
        {isLoading ? (
          <LinearProgress />
        ) : items.length === 0 ? (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
            <FolderOpenIcon sx={{ fontSize: 48, color: "text.disabled" }} />
            <Typography variant="body2" color="text.secondary">This folder is empty</Typography>
            <Typography variant="caption" color="text.disabled">Upload files or create a folder to get started</Typography>
          </Box>
        ) : viewMode === "grid" ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1.5 }}>
            {[...folders, ...files].map(renderItem)}
          </Box>
        ) : (
          <List dense disablePadding>
            {folders.length > 0 && <>
              <Typography variant="caption" sx={{ px: 1, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Folders</Typography>
              {folders.map(renderItem)}
              <Divider sx={{ my: 1 }} />
            </>}
            {files.length > 0 && <>
              <Typography variant="caption" sx={{ px: 1, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Files</Typography>
              {files.map(renderItem)}
            </>}
          </List>
        )}
      </Paper>

      {/* Right-click context menu */}
      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
      >
        {contextMenu?.item.type === "file" && (
          <MenuItem onClick={() => { handleDownload(contextMenu.item); setContextMenu(null) }}>
            <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} /> Download
          </MenuItem>
        )}
        {contextMenu?.item.type === "folder" && (
          <MenuItem onClick={() => { openFolder(contextMenu.item); setContextMenu(null) }}>
            <FolderOpenIcon fontSize="small" sx={{ mr: 1.5 }} /> Open
          </MenuItem>
        )}
        <MenuItem onClick={() => { if (contextMenu) startRename(contextMenu.item); }}>
          <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1.5 }} /> Rename
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setDeleteItem(contextMenu?.item ?? null); setContextMenu(null) }} sx={{ color: "error.main" }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} /> Delete
        </MenuItem>
      </Menu>

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} maxWidth="xs" fullWidth sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
        <DialogTitle>New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            label="Folder name" size="small" fullWidth
            onKeyDown={e => e.key === "Enter" && newFolderName.trim() && (createFolder.mutate(newFolderName.trim()), setNewFolderOpen(false))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewFolderOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!newFolderName.trim() || createFolder.isPending}
            onClick={() => { createFolder.mutate(newFolderName.trim()); setNewFolderOpen(false) }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={async () => { if (deleteItem) await deleteFile.mutateAsync(deleteItem) }}
        title={`Delete ${deleteItem?.type === "folder" ? "Folder" : "File"}`}
        message={`Are you sure you want to delete "${deleteItem?.name}"?${deleteItem?.type === "folder" ? " All contents will be deleted." : ""}`}
        confirmLabel="Delete"
        severity="error"
      />
    </Box>
  )
}
