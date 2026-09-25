import { PageShell } from '@/components/ui/PageShell'
import { toast } from '@/lib/toast'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Rating, TextField, Typography,
} from '@mui/material'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatDate } from '@lib/utils/formatDate'
import { tasksApi } from '@/api/tasks'
import type { GridParams } from '@/types/common.types'
import { env } from '@/config/env'
import { taskApprovals as staticTaskApprovals } from '@/data/static'

async function fetchTaskApprovals(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const list = staticTaskApprovals
    return { content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true, empty: list.length === 0 }
  }
  const r = await axiosClient.get('/api/task/get/type/approval', {
    params: { eventType: '', approvalType: 'post' },
  })
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

type ActionMode = 'Completed' | 'Re_Submit'

export default function TaskApprovalPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [row, setRow] = useState<Record<string, unknown> | null>(null)
  const [mode, setMode] = useState<ActionMode>('Completed')
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState<number | null>(0)
  const [busy, setBusy] = useState(false)

  function openAction(r: Record<string, unknown>, approve: boolean) {
    setRow(r)
    setMode(approve ? 'Completed' : 'Re_Submit')
    setReason('')
    setRating(approve ? 0 : null)
  }

  async function submitAction() {
    if (!row || !reason.trim()) {
      toast.error('Add Remarks.')
      return
    }
    setBusy(true)
    try {
      const taskId = String(row.id ?? '')
      const approvalTaskType = String(row.approvalT ?? row.approvalType ?? row.approvalTaskType ?? 'After')
      toast.success(await tasksApi.approveProcess(taskId, {
        approvalTaskType,
        taskStatus: mode,
        reason: reason.trim(),
        taskRating: mode === 'Completed' ? (rating ?? 0) : 0,
      }))
      setRow(null)
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['tasks', 'approval'] })
    } catch {
      toast.error('Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title={t("nav.approvals-task")} description={t("pages.taskApprovalsDesc")}>
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'taskName', header: 'Task' },
          { field: 'taskType', header: 'Related To' },
          {
            field: 'assignedTo',
            header: 'Assigned',
            renderCell: v => {
              const u = v as Record<string, string>
              return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'
            },
          },
          { field: 'taskDeadLine', header: 'Deadline', renderCell: v => formatDate(String(v ?? '')) },
          { field: 'taskStatus', header: 'Status', renderCell: v => <StatusBadge status={String(v ?? '')} /> },
        ]}
        queryKey={['tasks', 'approval']}
        queryFn={fetchTaskApprovals}
        isPaginated={false}
        rowMenuItems={r => [
          {
            label: 'Details',
            icon: <VisibilityIcon fontSize="small" />,
            onClick: () => navigate(`/tasks/${String(r.id ?? '')}?forApproval=1`),
          },
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, onClick: () => openAction(r, true) },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, color: 'error', onClick: () => openAction(r, false) },
        ]}
      />

      <Dialog open={!!row} onClose={() => !busy && setRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Task Approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {mode === 'Completed' ? 'Approve' : 'Reject'}: {String(row?.taskName ?? '')}
          </Typography>
          {mode === 'Completed' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Rate performance
              </Typography>
              <Rating value={rating} precision={0.5} size="large" onChange={(_, v) => setRating(v)} />
            </Box>
          )}
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={4}
            label="Remarks"
            required
            value={reason}
            onChange={e => setReason(e.target.value)}
            helperText="Required"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRow(null)} disabled={busy}>Cancel</Button>
          <Button
            variant="contained"
            color={mode === 'Completed' ? 'primary' : 'error'}
            disabled={busy || !reason.trim()}
            onClick={() => void submitAction()}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}
