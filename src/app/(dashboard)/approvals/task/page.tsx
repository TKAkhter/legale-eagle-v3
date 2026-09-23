import { PageShell } from '@/components/ui/PageShell'
import { toast } from '@/lib/toast'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { axiosClient } from '@lib/api/axios'
import { formatDate } from '@lib/utils/formatDate'
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

export default function TaskApprovalPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)

  async function handleAction(row: Record<string, unknown>, approve: boolean) {
    try {
      if (!env.USE_STATIC_DATA) {
        const taskId = String(row.id ?? '')
        // LMS uses before/after approving process depending on approval stage
        const approvalType = String(row.approvalType ?? 'post')
        const path = approvalType === 'pre' || approvalType === 'before'
          ? `/api/task/before/approving/process`
          : `/api/task/after/approving/process`
        await axiosClient.post(path, { status: approve ? 'Completed' : 'Rejected' }, { params: { taskId } })
      }
      toast.success(approve ? 'Task approved' : 'Task rejected')
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['tasks', 'approval'] })
    } catch {
      toast.error('Action failed')
    }
  }

  return (
    <PageShell title="Task Approvals" description="Tasks pending your approval">
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
        rowMenuItems={row => [
          { label: 'Approve', icon: <CheckIcon fontSize="small" />, onClick: () => handleAction(row, true) },
          { label: 'Reject', icon: <CloseIcon fontSize="small" />, color: 'error', onClick: () => handleAction(row, false) },
        ]}
      />
    </PageShell>
  )
}
