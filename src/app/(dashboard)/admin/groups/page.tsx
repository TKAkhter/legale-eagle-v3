import { PageShell } from '@/components/ui/PageShell'
import { toast } from '@/lib/toast'
import { adminApi } from '@/api/admin'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { Modal } from '@components/ui/Modal'
import { ControlledInput } from '@components/forms/ControlledInput'
import { PERMISSIONS } from '@config/permissions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import type { GridParams } from '@/types/common.types'

const schema = z.object({ name: z.string().min(1, 'Group name required') })
type Form = z.infer<typeof schema>

type GroupRow = { id: string; name: string; permission?: unknown[] }

async function fetchGroups(_p: GridParams) {
  const list = await adminApi.getGroups()
  const arr = (Array.isArray(list) ? list : []) as GroupRow[]
  return {
    content: arr,
    totalElements: arr.length,
    totalPages: 1,
    number: 0,
    size: arr.length,
    first: true,
    last: true,
    empty: arr.length === 0,
  }
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renaming, setRenaming] = useState<GroupRow | null>(null)
  const [gridKey, setGridKey] = useState(0)

  const createForm = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '' } })
  const renameForm = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  async function onCreate({ name }: Form) {
    try {
      const created = await adminApi.createGroup(name) as { id?: string } | undefined
      toast.success('Group created')
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['groups', 'list'] })
      setCreateOpen(false)
      createForm.reset()
      const newId = created?.id
      if (newId) {
        navigate(`/admin/permissions?groupId=${encodeURIComponent(newId)}`)
      } else {
        navigate('/admin/permissions')
      }
    } catch {
      toast.error('Failed to create group')
    }
  }

  function openRename(row: GroupRow) {
    setRenaming(row)
    renameForm.reset({ name: row.name })
    setRenameOpen(true)
  }

  async function onRename({ name }: Form) {
    if (!renaming?.id) return
    try {
      await adminApi.editGroup(renaming.id, { name })
      toast.success('Group renamed')
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['groups', 'list'] })
      setRenameOpen(false)
      setRenaming(null)
      renameForm.reset()
    } catch {
      toast.error('Failed to rename group')
    }
  }

  return (
    <PageShell title="Groups & Roles" description="User groups and role assignments">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Groups & Roles</Typography>
        <Can do={PERMISSIONS.GROUPS_MANAGE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Group
          </Button>
        </Can>
      </Box>
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'name', header: 'Group Name' },
          {
            field: 'permission',
            header: 'Menu Permissions',
            renderCell: v => {
              const arr = v as unknown[]
              return arr?.length ? `${arr.length} menus` : 'No permissions set'
            },
          },
        ]}
        queryKey={['groups', 'list']}
        queryFn={fetchGroups}
        isPaginated={false}
        rowMenuItems={row => [
          {
            label: 'Edit Permissions',
            icon: <EditIcon fontSize="small" />,
            permission: PERMISSIONS.GROUPS_MANAGE,
            onClick: () => navigate(`/admin/permissions?groupId=${encodeURIComponent(String(row.id))}`),
          },
          {
            label: 'Rename',
            icon: <DriveFileRenameOutlineIcon fontSize="small" />,
            permission: PERMISSIONS.GROUPS_MANAGE,
            onClick: () => openRename(row as GroupRow),
          },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset() }}
        title="Create Group"
        actions={(
          <>
            <Button onClick={() => { setCreateOpen(false); createForm.reset() }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={createForm.handleSubmit(onCreate)}
              disabled={createForm.formState.isSubmitting}
            >
              {createForm.formState.isSubmitting ? 'Creating…' : 'Create & set permissions'}
            </Button>
          </>
        )}
      >
        <ControlledInput name="name" control={createForm.control} label="Group Name" required />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          After create you will set the permission matrix (LMS add-group flow).
        </Typography>
      </Modal>

      <Modal
        open={renameOpen}
        onClose={() => { setRenameOpen(false); setRenaming(null); renameForm.reset() }}
        title="Rename Group"
        actions={(
          <>
            <Button onClick={() => { setRenameOpen(false); setRenaming(null) }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={renameForm.handleSubmit(onRename)}
              disabled={renameForm.formState.isSubmitting}
            >
              {renameForm.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </>
        )}
      >
        <ControlledInput name="name" control={renameForm.control} label="Group Name" required />
      </Modal>
    </PageShell>
  )
}
