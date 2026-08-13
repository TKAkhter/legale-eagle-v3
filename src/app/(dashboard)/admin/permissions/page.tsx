import { env } from '@/config/env'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Skeleton, Button, Snackbar, Alert, Chip } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from '@lib/api/axios'

type Action = 'visible'|'add'|'edit'|'delete'
const ACTIONS: Action[] = ['visible','add','edit','delete']

interface SubPerm { submenuId:string; visible:boolean; add:boolean; edit:boolean; delete:boolean }
interface GroupPerm { menuId:string; accessModifies:SubPerm[] }
interface Group { id:string; name:string; permission:GroupPerm[] }
interface MenuItem { id:string; menuName:string; parent?:string }

export default function PermissionsPage() {
  const qc = useQueryClient()
  const [selectedGroup,setSelectedGroup] = useState<string|null>(null)
  const [localPerms,setLocalPerms] = useState<Record<string,Record<Action,boolean>>>({})
  const [saving,setSaving] = useState(false)
  const [snack,setSnack] = useState<{open:boolean;msg:string;severity:'success'|'error'}>({open:false,msg:'',severity:'success'})

  const { data:groups=[], isLoading:groupsLoading } = useQuery<Group[]>({
    queryKey:['groups','list'],
    queryFn: async()=>{ const r=await axiosClient.get('/api/group/get'); return r.data?.data??r.data??[] }
  })

  const { data:menuItems=[], isLoading:menuLoading } = useQuery<MenuItem[]>({
    queryKey:['auth','menu'],
    queryFn: async()=>{ const r=await axiosClient.get('/api/user/get/access/menu'); return r.data?.data??r.data??[] }
  })

  const group = groups.find((g:Group)=>g.id===selectedGroup)

  function getPermission(menuId:string, action:Action): boolean {
    if (localPerms[menuId]?.[action] !== undefined) return localPerms[menuId][action]
    const gp = group?.permission?.find((p:GroupPerm)=>p.menuId===menuId)
    const sp = gp?.accessModifies?.[0]
    return sp?.[action]??false
  }

  function togglePerm(menuId:string, action:Action) {
    setLocalPerms(p=>({
      ...p,
      [menuId]:{ ...(p[menuId]??{ visible:false,add:false,edit:false,delete:false }), [action]:!getPermission(menuId,action) }
    }))
  }

  async function save() {
    if (!selectedGroup||!group) return
    setSaving(true)
    try {
      const permission = menuItems.map((m:MenuItem)=>({
        menuId:m.id,
        accessModifies:[{
          submenuId:m.id,
          visible: getPermission(m.id,'visible'),
          add:     getPermission(m.id,'add'),
          edit:    getPermission(m.id,'edit'),
          delete:  getPermission(m.id,'delete'),
        }]
      }))
      await axiosClient.post(`/api/group/add/individual/permission`,{ groupId:selectedGroup, permission })
      setSnack({open:true,msg:'Permissions saved',severity:'success'})
      qc.invalidateQueries({queryKey:['groups','list']})
      setLocalPerms({})
    } catch { setSnack({open:true,msg:'Failed to save',severity:'error'}) }
    finally { setSaving(false) }
  }

  if (groupsLoading) return <Skeleton variant="rounded" height={200} />
  const topLevelMenus = menuItems.filter((m:MenuItem)=>!m.parent||m.parent==='0'||m.parent==='')

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
        <Typography variant="h5" sx={{ fontWeight:600 }}>Permissions Matrix</Typography>
        {selectedGroup && (
          <Button variant="contained" startIcon={<SaveIcon/>} onClick={save} disabled={saving || !Object.keys(localPerms).length}>
            {saving?'Saving…':'Save Changes'}
          </Button>
        )}
      </Box>

      {/* Group selector */}
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb:3 }}>
        {groups.map((g:Group)=>(
          <Chip key={g.id} label={g.name} onClick={()=>{ setSelectedGroup(g.id); setLocalPerms({}) }}
            color={selectedGroup===g.id?'primary':'default'} variant={selectedGroup===g.id?'filled':'outlined'} />
        ))}
      </Box>

      {!selectedGroup && <Typography color="text.secondary">Select a group to view and edit its permissions.</Typography>}

      {selectedGroup && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius:2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight:600, minWidth:200 }}>Menu Item</TableCell>
                {ACTIONS.map(a=><TableCell key={a} align="center" sx={{ fontWeight:600, textTransform:'capitalize', minWidth:80 }}>{a}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {menuLoading
                ? [...Array(8)].map((_,i)=><TableRow key={i}><TableCell colSpan={5}><Skeleton/></TableCell></TableRow>)
                : topLevelMenus.map((m:MenuItem)=>(
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ fontWeight:500 }}>{m.menuName}</TableCell>
                      {ACTIONS.map(a=>(
                        <TableCell key={a} align="center" padding="checkbox">
                          <Checkbox size="small" checked={getPermission(m.id,a)} onChange={()=>togglePerm(m.id,a)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=>setSnack(s=>({...s,open:false}))}>
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  )
}
