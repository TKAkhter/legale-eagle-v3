/**
 * InlineCellEditor.tsx — renders an input inside a table cell for inline editing.
 *
 * Usage in DataGrid — columns with editable:true get this treatment on double-click.
 * Commits on Enter or blur, cancels on Escape.
 */
import { useState, useRef, useEffect } from 'react'
import { InputBase, CircularProgress, Box } from '@mui/material'
import { toast } from '@/lib/toast'

interface Props {
  value:    string
  onCommit: (newValue: string) => Promise<void> | void
  onCancel: () => void
}

export function InlineCellEditor({ value, onCommit, onCancel }: Props) {
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  async function commit() {
    if (draft === value) { onCancel(); return }
    setSaving(true)
    try {
      await onCommit(draft)
      toast.success('Updated')
    } catch {
      toast.error('Failed to update')
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <InputBase
        inputRef={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        disabled={saving}
        sx={{
          flex: 1,
          fontSize: 13,
          px: 0.5,
          py: 0.25,
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 0.5,
          bgcolor: 'background.paper',
          '& input': { p: 0 },
        }}
      />
      {saving && <CircularProgress size={12} />}
    </Box>
  )
}
