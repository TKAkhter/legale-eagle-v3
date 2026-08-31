/**
 * CopyCell.tsx — wraps a cell value to show a copy-to-clipboard button on hover.
 *
 * Usage in column renderCell:
 *   renderCell: (v) => <CopyCell value={String(v ?? '')} />
 *
 * Or use the useCopyCell hook directly if you want custom UI.
 */
import { useState } from 'react'
import { Box, Tooltip, IconButton } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon       from '@mui/icons-material/Check'
import { toast } from '@/lib/toast'

interface Props {
  /** The text to display and copy */
  value:     string
  /** Optional custom display (e.g. a formatted version of the value) */
  children?: React.ReactNode
}

export function CopyCell({ value, children }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.info(`Copied: ${value.length > 30 ? value.slice(0, 30) + '…' : value}`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        '& .copy-btn': { opacity: 0, transition: 'opacity 150ms' },
        '&:hover .copy-btn': { opacity: 1 },
      }}
    >
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        {children ?? value}
      </Box>
      <Tooltip title={copied ? 'Copied!' : 'Copy'} placement="top">
        <IconButton
          className="copy-btn"
          size="small"
          onClick={copy}
          sx={{ p: 0.25, flexShrink: 0, color: copied ? 'success.main' : 'text.disabled' }}
        >
          {copied
            ? <CheckIcon sx={{ fontSize: 12 }} />
            : <ContentCopyIcon sx={{ fontSize: 12 }} />
          }
        </IconButton>
      </Tooltip>
    </Box>
  )
}

/** Convenience hook for copy-to-clipboard without the CopyCell wrapper */
export function useCopyToClipboard() {
  return async function copy(text: string, label = 'Value') {
    try {
      await navigator.clipboard.writeText(text)
      toast.info(`Copied: ${text.length > 30 ? text.slice(0, 30) + '…' : text}`)
      return true
    } catch {
      toast.error(`Failed to copy ${label}`)
      return false
    }
  }
}
