/**
 * Shared filter action buttons — only these should trigger list API calls.
 */
import { Box, Button, CircularProgress, Tooltip } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"

interface Props {
  onSearch: () => void
  onClear: () => void
  onExport?: () => void | Promise<void>
  exportLabel?: string
  exportMode?: "download" | "email"
  searching?: boolean
  exporting?: boolean
  searchLabel?: string
  clearLabel?: string
}

export function FilterActions({
  onSearch,
  onClear,
  onExport,
  exportLabel,
  exportMode = "download",
  searching = false,
  exporting = false,
  searchLabel = "Search",
  clearLabel = "Clear",
}: Props) {
  const ExportIcon = exportMode === "email" ? MarkunreadOutlinedIcon : FileDownloadOutlinedIcon
  const defaultExport = exportMode === "email" ? "Email Excel" : "Export"

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
      <Tooltip title="Apply filters and reload results">
        <span>
          <Button
            variant="contained"
            size="small"
            startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
            onClick={onSearch}
            disabled={searching}
          >
            {searchLabel}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Reset filters and reload">
        <Button
          variant="outlined"
          size="small"
          startIcon={<ClearIcon />}
          onClick={onClear}
          disabled={searching}
        >
          {clearLabel}
        </Button>
      </Tooltip>
      {onExport && (
        <Tooltip title={exportMode === "email" ? "Email filtered results as Excel" : "Download filtered results"}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <ExportIcon />}
              onClick={() => { void onExport() }}
              disabled={exporting}
            >
              {exportLabel ?? defaultExport}
            </Button>
          </span>
        </Tooltip>
      )}
    </Box>
  )
}
