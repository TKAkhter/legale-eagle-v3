import { toast } from '@/lib/toast'
import { env } from '@/config/env'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { Modal } from '@components/ui/Modal'
import { ControlledInput } from '@components/forms/ControlledInput'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { GridParams } from '@/types/common.types'

const schema = z.object({ name: z.string().min(1, 'Name required'), country: z.string().optional() })
type Form = z.infer<typeof schema>

async function fetchLocations(_p: GridParams) {
  if (env.USE_STATIC_DATA) return { content:[], totalElements:0, totalPages:0, number:0, size:25, first:true, last:true, empty:true }
  const r = await axiosClient.get('/api/location/get')
  const list = r.data?.data ?? r.data ?? []
  const arr = Array.isArray(list) ? list : [list].filter(Boolean)
  return { content: arr, totalElements: arr.length, totalPages: 1, number: 0, size: arr.length, first: true, last: true, empty: arr.length === 0 }
}

export default function LocationsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    try {
      await axiosClient.post('/api/location/add', data)
      toast.success('Location added')
      qc.invalidateQueries({ queryKey: ['locations'] })
      setModalOpen(false); reset()
    } catch { toast.error('Action failed') }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Locations</Typography>
        <Can do={PERMISSIONS.LOCATIONS_MANAGE}><Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>Add Location</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field: 'name', header: 'Location Name' },
          { field: 'country', header: 'Country' },
        ]}
        queryKey={['locations']} queryFn={fetchLocations} isPaginated={false}
        rowMenuItems={(row) => [
          { label: 'Delete', icon: <DeleteIcon fontSize="small" />, permission: PERMISSIONS.LOCATIONS_MANAGE, color: 'error', onClick: async () => {
            await axiosClient.delete(`/api/location/delete/${row.id}`)
            qc.invalidateQueries({ queryKey: ['locations'] })
          }}
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Location" maxWidth="sm"
        actions={<><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add'}</Button></>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ControlledInput name="name" control={control} label="Location Name" required />
          <ControlledInput name="country" control={control} label="Country" />
        </Box>
      </Modal>
    </Box>
  )
}
