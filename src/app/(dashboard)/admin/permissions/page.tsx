import { PageShell } from '@/components/ui/PageShell'
import { toast } from '@/lib/toast'
import { adminApi } from '@/api/admin'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Skeleton, Button, Chip } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type Action = 'visible' | 'add' | 'edit' | 'delete'
const ACTIONS: Action[] = ['visible', 'add', 'edit', 'delete']

interface SubPerm { submenuId: string; visible: boolean; add: boolean; edit: boolean; delete: boolean }
interface GroupPerm { menuId: string; accessModifies: SubPerm[] }
interface Group { id: string; name: string; permission: GroupPerm[] }
interface MenuItem { id: string; menuName: string; parent?: string; parentId?: string }

export default function PermissionsPage() {
  const qc = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [localPerms, setLocalPerms] = useState<Record<string, Record<Action, boolean>>>({})
  const [saving, setSaving] = useState(false)

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['groups', 'list'],
    queryFn: async () => {
      const list = await adminApi.getGroups()
      return (Array.isArray(list) ? list : []) as Group[]
    },
  })

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['admin', 'menu-list'],
    queryFn: async () => {
      const list = await adminApi.getMenuList()
      return (Array.isArray(list) ? list : []) as MenuItem[]
    },
  })

  const group = groups.find((g: Group) => g.id === selectedGroup)

  function getPermission(menuId: string, action: Action): boolean {
    if (localPerms[menuId]?.[action] !== undefined) return localPerms[menuId][action]
    const gp = group?.permission?.find((p: GroupPerm) => p.menuId === menuId)
    const sp = gp?.accessModifies?.[0]
    return sp?.[action] ?? false
  }

  function togglePerm(menuId: string, action: Action) {
    setLocalPerms(p => ({
      ...p,
      [menuId]: { ...(p[menuId] ?? { visible: false, add: false, edit: false, delete: false }), [action]: !getPermission(menuId, action) },
    }))
  }

  async function save() {
    if (!selectedGroup || !group) return
    setSaving(true)
    try {
      const permission = menuItems.map((m: MenuItem) => ({
        menuId: m.id,
        accessModifies: [{
          submenuId: m.id,
          visible: getPermission(m.id, 'visible'),
          add: getPermission(m.id, 'add'),
          edit: getPermission(m.id, 'edit'),
          delete: getPermission(m.id, 'delete'),
        }],
      }))
      await adminApi.saveGroupPermissions(selectedGroup, permission)
      toast.success('Permissions saved')
      qc.invalidateQueries({ queryKey: ['groups', 'list'] })
      setLocalPerms({})
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (groupsLoading || menuLoading) return <PageShell title="Permissions"><Skeleton variant="rounded" height={200} /></PageShell>

  const topLevelMenus = menuItems.filter((m: MenuItem) => {
    const parent = m.parent ?? m.parentId ?? '0'
    return !parent || parent === '0' || parent === ''
  })

  return (
    <PageShell title="Permissions Matrix" description="Manage group permissions and access control">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Permissions Matrix</Typography>
        {selectedGroup && (
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !Object.keys(localPerms).length}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {groups.map((g: Group) => (
          <Chip
            key={g.id}
            label={g.name}
            onClick={() => { setSelectedGroup(g.id); setLocalPerms({}) }}
            color={selectedGroup === g.id ? 'primary' : 'default'}
            variant={selectedGroup === g.id ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {!selectedGroup && <Typography color="text.secondary">Select a group to view and edit its permissions.</Typography>}

      {selectedGroup && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Menu</TableCell>
                {ACTIONS.map(a => <TableCell key={a} align="center" sx={{ textTransform: 'capitalize' }}>{a}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {topLevelMenus.map((m: MenuItem) => (
                <TableRow key={m.id} hover>
                  <TableCell>{m.menuName}</TableCell>
                  {ACTIONS.map(a => (
                    <TableCell key={a} align="center">
                      <Checkbox size="small" checked={getPermission(m.id, a)} onChange={() => togglePerm(m.id, a)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PageShell>
  )
}
