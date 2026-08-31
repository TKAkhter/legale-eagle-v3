import { toast } from '@/lib/toast'
import { env } from '@/config/env'
import { adminApi } from '@/api/admin'
import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@components/data-grid/DataGrid'
import { Can } from '@components/ui/Can'
import { Modal } from '@components/ui/Modal'
import { ControlledInput } from '@components/forms/ControlledInput'
import { PERMISSIONS } from '@config/permissions'
import { axiosClient } from '@lib/api/axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import type { GridParams } from '@/types/common.types'

const schema = z.object({ name: z.string().min(1,'Group name required') })
type Form = z.infer<typeof schema>

async function fetchGroups(_p: GridParams) {
  if (env.USE_STATIC_DATA) {
    const groups = await adminApi.getGroups()
    return { content: groups, totalElements: groups.length, totalPages: 1, number: 0, size: groups.length, first: true, last: true, empty: groups.length === 0 }
  }
  const r = await axiosClient.get('/api/group/get')
  const list = r.data?.data??r.data??[]
  const arr = Array.isArray(list)?list:[list].filter(Boolean)
  return { content:arr, totalElements:arr.length, totalPages:1, number:0, size:arr.length, first:true, last:true, empty:arr.length===0 }
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modalOpen,setModalOpen] = useState(false)
    const { control, handleSubmit, reset, formState:{isSubmitting} } = useForm<Form>({ resolver:zodResolver(schema) })

  async function onSubmit({ name }: Form) {
    try {
      await axiosClient.post('/api/group/add',{ name })
      toast.success('Group created')
      qc.invalidateQueries({queryKey:['groups','list']})
      setModalOpen(false); reset()
    } catch { toast.error('Failed to create group') }
  }

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>Groups & Roles</Typography>
        <Can do={PERMISSIONS.GROUPS_MANAGE}><Button variant="contained" startIcon={<AddIcon/>} onClick={()=>setModalOpen(true)}>New Group</Button></Can>
      </Box>
      <DataGrid
        columns={[
          { field:'name', header:'Group Name' },
          { field:'permission', header:'Menu Permissions', renderCell:(v)=>{ const arr=v as unknown[]; return arr?.length?`${arr.length} menus`:'No permissions set' } },
        ]}
        queryKey={['groups','list']} queryFn={fetchGroups} isPaginated={false}
        rowMenuItems={()=>[
          { label:'Edit Permissions', icon:<EditIcon fontSize="small"/>, permission:PERMISSIONS.GROUPS_MANAGE, onClick:()=>navigate('/admin/permissions') }
        ]}
      />
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Create Group"
        actions={<><Button onClick={()=>setModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting?'Creating…':'Create'}</Button></>}>
        <ControlledInput name="name" control={control} label="Group Name" required />
      </Modal>
    </Box>
  )
}
