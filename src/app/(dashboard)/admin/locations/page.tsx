import { PageShell } from '@/components/ui/PageShell'
import { adminApi } from '@/api/admin'
import { toast } from '@/lib/toast'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BlockIcon from '@mui/icons-material/Block'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { StatusBadge } from '@components/ui/StatusBadge'
import { Modal } from '@components/ui/Modal'
import { ControlledInput } from '@components/forms/ControlledInput'
import { PERMISSIONS } from '@config/permissions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { GridParams } from '@/types/common.types'

const schema = z.object({ name: z.string().min(1, 'Name required'), country: z.string().optional() })
type Form = z.infer<typeof schema>

async function fetchLocations(_p: GridParams) {
  const list = await adminApi.getLocations()
  const arr = Array.isArray(list) ? list : []
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function LocationsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    try {
      await adminApi.createLocation(data as unknown as Record<string, unknown>)
      toast.success('Location added')
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ['locations'] })
      setModalOpen(false); reset()
    } catch { toast.error('Action failed') }
  }

  return (
    <PageShell title="Locations" description="Hearing venues and court locations">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Locations</Typography>
        <Can do={PERMISSIONS.LOCATIONS_MANAGE}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Add Location</Button>
        </Can>
      </Box>
      <DataGrid
        key={gridKey}
        columns={[
          { field: 'name', header: 'Location Name', renderCell: (v, row) => String(v || (row as Record<string, unknown>).locationName || '—') },
          { field: 'country', header: 'Country', renderCell: v => String(v || '—') },
          { field: 'status', header: 'Status', renderCell: v => <StatusBadge status={String(v || 'Active')} /> },
        ]}
        queryKey={['locations']}
        queryFn={fetchLocations}
        isPaginated={false}
        rowMenuItems={(row) => [
          {
            label: 'Deactivate',
            icon: <BlockIcon fontSize="small" />,
            permission: PERMISSIONS.LOCATIONS_MANAGE,
            color: 'error',
            onClick: async () => {
              try {
                await adminApi.deleteLocation(String((row as { id?: string }).id))
                toast.success('Location deactivated')
                setGridKey(k => k + 1)
                qc.invalidateQueries({ queryKey: ['locations'] })
              } catch { toast.error('Failed to deactivate') }
            },
          },
        ]}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Location"
        maxWidth="sm"
        actions={(
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add'}
            </Button>
          </>
        )}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ControlledInput name="name" control={control} label="Location Name" required />
          <ControlledInput name="country" control={control} label="Country" />
        </Box>
      </Modal>
    </PageShell>
  )
}
