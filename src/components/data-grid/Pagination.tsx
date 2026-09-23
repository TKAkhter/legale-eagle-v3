import { Box, Button, FormControl, IconButton, MenuItem, Select, Typography, useMediaQuery } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FirstPageIcon from '@mui/icons-material/FirstPage'
import LastPageIcon from '@mui/icons-material/LastPage'

interface Props {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}

/**
 * Pagination with always-visible Previous / Next (and first/last on wider screens).
 * Works for every DataGrid instance — desktop table and mobile cards.
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const isNarrow = useMediaQuery('(max-width:599px)')
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <Box
      sx={{
        mt: 1.5,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {total === 0 ? '0–0 of 0' : `${from}–${to} of ${total.toLocaleString()}`}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            displayEmpty
            inputProps={{ 'aria-label': 'Rows per page' }}
            sx={{ fontSize: 13, height: 32 }}
          >
            {[10, 25, 50, 100].map((n) => (
              <MenuItem key={n} value={n}>{n} / page</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {!isNarrow && (
          <IconButton
            size="small"
            aria-label="First page"
            disabled={!canPrev}
            onClick={() => onPageChange(0)}
          >
            <FirstPageIcon fontSize="small" />
          </IconButton>
        )}

        {isNarrow ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChevronLeftIcon />}
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            sx={{ textTransform: 'none', minWidth: 0 }}
          >
            Prev
          </Button>
        ) : (
          <IconButton
            size="small"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}

        <Typography variant="body2" sx={{ px: 1, minWidth: 64, textAlign: 'center', fontWeight: 500 }}>
          {page + 1} / {totalPages}
        </Typography>

        {isNarrow ? (
          <Button
            size="small"
            variant="outlined"
            endIcon={<ChevronRightIcon />}
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            sx={{ textTransform: 'none', minWidth: 0 }}
          >
            Next
          </Button>
        ) : (
          <IconButton
            size="small"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        )}

        {!isNarrow && (
          <IconButton
            size="small"
            aria-label="Last page"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages - 1)}
          >
            <LastPageIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}
