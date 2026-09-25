import { PageShell } from '@/components/ui/PageShell'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import ViewListIcon from '@mui/icons-material/ViewList'
import { TaskKanban } from './_components/TaskKanban'
import { Box, Button, Chip, FormControl, InputLabel, Link, MenuItem, Select, ToggleButton, ToggleButtonGroup } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Link as RouterLink, useSearchParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { DataGrid } from '@components/data-grid/DataGrid'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Can } from '@components/ui/Can'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SearchInput, FilterActions } from '@components/filters'
import { PERMISSIONS } from '@config/permissions'
import { formatDate } from '@lib/utils/formatDate'
import type { GridParams } from '@/types/common.types'
import type { FilterPanelProps } from '@components/data-grid/types'
import { tasksApi } from '@/api/tasks'
import { TaskFormDrawer } from './_components/TaskFormDrawer'
import { AssignTemplateDrawer } from './_components/AssignTemplateDrawer'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'

/** LMS `/tasks` Related To — default MATTER (OLD typeFilter=0). */
const EVENT_TYPES = ['MATTER', 'CLIENT', 'LEAD', 'HEARING', 'GENERAL', 'ALL']
/** LMS status tabs: Pending | Completed | Re-Submit (+ extras NEW already had). */
const STATUSES = ['Pending', 'Completed', 'Re_Submit', 'In_Progress', 'Overdue', 'Canceled', 'All']

function clientLabel(row: Record<string, unknown>): { id: string; name: string } {
  const matterMini = row.matterMini as {
    clientMini?: Record<string, unknown>
    matterId?: string
  } | null
  const clientMini = (row.clientMini ?? matterMini?.clientMini) as Record<string, unknown> | null
  if (!clientMini) return { id: "", name: "—" }
  const id = String(clientMini.id ?? clientMini.clientId ?? "")
  const name = String(
    clientMini.companyName
    || `${String(clientMini.firstName ?? "")} ${String(clientMini.lastName ?? "")}`.trim()
    || clientMini.name
    || "—",
  )
  return { id, name }
}

function matterLabel(row: Record<string, unknown>): { id: string; title: string } {
  const mini = row.matterMini as { title?: string; matterId?: string; id?: string } | null
  return {
    id: String(mini?.matterId ?? mini?.id ?? row.matterId ?? ""),
    title: String(mini?.title ?? row.matterTitle ?? "—"),
  }
}

function TaskFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [f, setF] = useState<Record<string, unknown>>({
    eventType: 'MATTER',
    taskStatus: 'Pending',
    ...filters,
  })
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
      <SearchInput value={String(f.searchText ?? '')} onChange={v => setF(p => ({ ...p, searchText: v }))} placeholder="Search tasks..." />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Related To</InputLabel>
        <Select label="Related To" value={String(f.eventType ?? 'MATTER')} onChange={e => setF(p => ({ ...p, eventType: e.target.value }))}>
          {EVENT_TYPES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Status</InputLabel>
        <Select label="Status" value={String(f.taskStatus ?? 'Pending')} onChange={e => setF(p => ({ ...p, taskStatus: e.target.value }))}>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s === 'Re_Submit' ? 'Re-Submit' : s.replace(/_/g, ' ')}</MenuItem>)}
        </Select>
      </FormControl>
      <FilterActions
        onSearch={() => onSearch(f)}
        onClear={() => { setF({ eventType: 'MATTER', taskStatus: 'Pending' }); onReset() }}
      />
    </Box>
  )
}

export default function TasksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState<'list' | 'board'>('list')
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [editId, setEditId] = useState<string | undefined>()
  const [deleteId, setDeleteId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditId(undefined)
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
      return
    }
    if (searchParams.get("assignTemplate") === "1") {
      setTemplateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data: kanbanData } = useQuery({
    queryKey: ['tasks', 'kanban'],
    queryFn: async () => {
      const page = await tasksApi.getAll({ page: 0, pageSize: 100, filters: { eventType: 'ALL', taskStatus: 'All' } })
      return page.content
    },
    enabled: view === 'board',
  })
  const kanbanTasks = (kanbanData ?? []) as unknown as import('./_components/TaskKanban').KanbanTask[]

  return (
    <PageShell
      title={t("nav.tasks")}
      description={t("pages.tasksDesc")}
      action={(
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, value) => value && setView(value)}>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="board"><ViewKanbanIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
          <Can do={PERMISSIONS.TASKS_CREATE}>
            <Button variant="outlined" onClick={() => setTemplateOpen(true)}>
              Assign Template
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
              New Task
            </Button>
          </Can>
        </Box>
      )}
    >
      {view === 'board' ? (
        <TaskKanban tasks={kanbanTasks} onAddTask={() => { setEditId(undefined); setDrawerOpen(true) }} />
      ) : (
        <DataGrid
          key={gridKey}
          columns={[
            { field: 'taskName', header: 'Task Name', minWidth: 160 },
            {
              field: 'title',
              header: 'Description',
              minWidth: 180,
              renderCell: (v, row) => String(v || (row as Record<string, unknown>).description || '—'),
            },
            {
              field: 'matterMini',
              header: 'Matter',
              minWidth: 140,
              renderCell: (_v, row) => {
                const m = matterLabel(row as Record<string, unknown>)
                if (!m.id || m.title === '—') return m.title
                return (
                  <Link component={RouterLink} to={`/matters/${m.id}`} underline="hover" onClick={e => e.stopPropagation()}>
                    {m.title}
                  </Link>
                )
              },
            },
            {
              field: 'taskDeadLine',
              header: 'Deadline',
              minWidth: 120,
              renderCell: (v) => formatDate(String(v ?? '')),
            },
            {
              field: 'clientMini',
              header: 'Client',
              minWidth: 160,
              renderCell: (_v, row) => {
                const c = clientLabel(row as Record<string, unknown>)
                if (!c.id || c.name === '—') return c.name
                return (
                  <Link component={RouterLink} to={`/clients/${c.id}`} underline="hover" onClick={e => e.stopPropagation()}>
                    {c.name}
                  </Link>
                )
              },
            },
            { field: 'taskType', header: 'Related To', renderCell: v => <Chip size="small" label={String(v ?? '—')} variant="outlined" /> },
            { field: 'priority', header: 'Priority', renderCell: (v) => {
              const color = v === 'High' ? 'error' : v === 'Low' ? 'default' : 'warning'
              return <Chip size="small" label={String(v ?? 'Normal')} color={color as 'error' | 'warning' | 'default'} variant="outlined" />
            }},
            { field: 'taskStatus', header: 'Status', renderCell: v => <StatusBadge status={String(v ?? '')} /> },
            { field: 'assignedTo', header: 'Assigned To', renderCell: v => {
              const u = v as { firstName?: string; lastName?: string } | null
              return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—' : '—'
            }},
          ]}
          queryKey={['tasks', 'list']}
          queryFn={(p: GridParams) => tasksApi.getAll({
            ...p,
            filters: { eventType: 'MATTER', taskStatus: 'Pending', ...p.filters },
          })}
          FilterPanel={TaskFilters}
          hasFilters
          syncWithUrl
          isSortingBackend={false}
          defaultPageSize={10}
          detailPath={(row) => `/tasks/${String((row as { id?: string }).id ?? '')}`}
          rowMenuItems={(row) => {
            const id = String((row as { id?: string }).id ?? '')
            return [
              { label: 'Details', onClick: () => navigate(`/tasks/${id}`) },
              { label: 'Edit', icon: <EditIcon fontSize="small" />, onClick: () => { setEditId(id); setDrawerOpen(true) } },
              { label: 'Delete', icon: <DeleteIcon fontSize="small" />, onClick: () => setDeleteId(id) },
            ]
          }}
        />
      )}
      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        taskId={editId}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['tasks'] })
          setDrawerOpen(false)
          setGridKey(k => k + 1)
          toast.success(editId ? 'Task updated' : 'Task created')
        }}
      />
      <AssignTemplateDrawer
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['tasks'] })
          setGridKey(k => k + 1)
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(undefined)}
        onConfirm={async () => {
          toast.success(await tasksApi.delete(String(deleteId)))
          setGridKey(k => k + 1)
          qc.invalidateQueries({ queryKey: ['tasks'] })
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        severity="error"
      />
    </PageShell>
  )
}
