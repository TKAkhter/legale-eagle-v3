/**
 * MobileCardList.tsx — card-based view for DataGrid on mobile.
 *
 * On narrow screens (< 640px) tables are hard to use.
 * This renders each row as a card showing the first 3 columns,
 * with a "more" button to see the rest.
 *
 * DataGrid uses this automatically when viewport < 640px.
 */
import { Box, Paper, Typography, Chip, IconButton } from "@mui/material"
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos"
import type { ColumnDef } from "./types"

interface Props<TData> {
  rows:        TData[]
  columns:     ColumnDef<TData>[]
  onRowClick?: (row: TData) => void
  getRowKey:   (row: TData) => string
}

export function MobileCardList<TData>({ rows, columns, onRowClick, getRowKey }: Props<TData>) {
  if (!rows.length) return null

  // Show first 3 columns as primary info, rest on expand
  const primaryCols = columns.slice(0, 3)
  const hasAction   = !!onRowClick

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {rows.map(row => (
        <Paper
          key={getRowKey(row)}
          variant="outlined"
          onClick={() => onRowClick?.(row)}
          sx={{
            p: 2, borderRadius: 2,
            cursor: hasAction ? "pointer" : "default",
            "&:hover": hasAction ? { borderColor: "primary.main", boxShadow: 1 } : {},
            transition: "all 150ms",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {primaryCols.map(col => {
                const value = (row as Record<string, unknown>)[col.field as string]
                const rendered = col.renderCell ? col.renderCell(value, row) : String(value ?? "—")
                const isFirst = col === primaryCols[0]
                return (
                  <Box key={String(col.field)} sx={{ mb: isFirst ? 0.5 : 0.25 }}>
                    {!isFirst && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {col.header}
                      </Typography>
                    )}
                    {isFirst ? (
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                        {rendered}
                      </Typography>
                    ) : (
                      <Box sx={{ fontSize: 13, color: "text.secondary" }}>{rendered}</Box>
                    )}
                  </Box>
                )
              })}
            </Box>
            {hasAction && (
              <IconButton size="small" sx={{ flexShrink: 0, ml: 1 }}>
                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  )
}
