/**
 * Group permissions matrix — LMS nested menu + submenu CRUD flags.
 */
import { PageShell } from "@/components/ui/PageShell"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, Skeleton, Button, Chip,
} from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

type Action = "visible" | "add" | "edit" | "delete"
const ACTIONS: Action[] = ["visible", "add", "edit", "delete"]
const EMPTY_FLAGS: Record<Action, boolean> = { visible: false, add: false, edit: false, delete: false }

interface SubPerm { submenuId: string; visible: boolean; add: boolean; edit: boolean; delete: boolean }
interface GroupPerm { menuId: string; accessModifies: SubPerm[] }
interface Group { id: string; name: string; permission: GroupPerm[] }

interface SubmenuNode { submenuId: string; submenuName: string }
interface MenuNode { menuId: string; menuName: string; submenu: SubmenuNode[] }

function normalizeMenus(raw: unknown): MenuNode[] {
  const list = Array.isArray(raw) ? raw : []
  if (!list.length) return []

  // LMS nested shape: { menuId, menuName, submenu: [{ submenuId, submenuName }] }
  if (list.some((m: Record<string, unknown>) => Array.isArray(m.submenu) || m.menuId)) {
    return list.map((m: Record<string, unknown>) => ({
      menuId: String(m.menuId ?? m.id ?? ""),
      menuName: String(m.menuName ?? m.name ?? ""),
      submenu: (Array.isArray(m.submenu) ? m.submenu : []).map((s: Record<string, unknown>) => ({
        submenuId: String(s.submenuId ?? s.id ?? ""),
        submenuName: String(s.submenuName ?? s.menuName ?? s.name ?? ""),
      })),
    })).filter(m => m.menuId)
  }

  // Flat shape with parent — build tree
  const items = list as { id?: string; menuName?: string; parent?: string; parentId?: string }[]
  const tops = items.filter(m => {
    const parent = m.parent ?? m.parentId ?? "0"
    return !parent || parent === "0" || parent === ""
  })
  return tops.map(m => {
    const menuId = String(m.id ?? "")
    const children = items.filter(c => String(c.parent ?? c.parentId ?? "") === menuId)
    return {
      menuId,
      menuName: String(m.menuName ?? ""),
      submenu: children.map(c => ({
        submenuId: String(c.id ?? ""),
        submenuName: String(c.menuName ?? ""),
      })),
    }
  }).filter(m => m.menuId)
}

export default function PermissionsPage() {
  const qc = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  /** Keyed by `${menuId}::${submenuId}` */
  const [localPerms, setLocalPerms] = useState<Record<string, Record<Action, boolean>>>({})
  const [saving, setSaving] = useState(false)

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["groups", "list"],
    queryFn: async () => {
      const list = await adminApi.getGroups()
      return (Array.isArray(list) ? list : []) as Group[]
    },
  })

  const { data: menuRaw = [], isLoading: menuLoading } = useQuery({
    queryKey: ["admin", "menu-list"],
    queryFn: () => adminApi.getMenuList(),
  })

  const menus = useMemo(() => normalizeMenus(menuRaw), [menuRaw])
  const group = groups.find(g => g.id === selectedGroup)

  function rowKey(menuId: string, submenuId: string) {
    return `${menuId}::${submenuId}`
  }

  function getPermission(menuId: string, submenuId: string, action: Action): boolean {
    const key = rowKey(menuId, submenuId)
    if (localPerms[key]?.[action] !== undefined) return localPerms[key][action]
    const gp = group?.permission?.find(p => p.menuId === menuId)
    const sp = gp?.accessModifies?.find(a => a.submenuId === submenuId)
      ?? gp?.accessModifies?.find(a => a.submenuId === menuId)
    return sp?.[action] ?? false
  }

  function togglePerm(menuId: string, submenuId: string, action: Action) {
    const key = rowKey(menuId, submenuId)
    setLocalPerms(p => ({
      ...p,
      [key]: {
        ...(p[key] ?? { ...EMPTY_FLAGS }),
        [action]: !getPermission(menuId, submenuId, action),
      },
    }))
  }

  async function save() {
    if (!selectedGroup || !group) return
    setSaving(true)
    try {
      const permission = menus.map(menu => {
        const targets = menu.submenu.length
          ? menu.submenu
          : [{ submenuId: menu.menuId, submenuName: menu.menuName }]
        return {
          menuId: menu.menuId,
          accessModifies: targets.map(sub => ({
            submenuId: sub.submenuId,
            visible: getPermission(menu.menuId, sub.submenuId, "visible"),
            add: getPermission(menu.menuId, sub.submenuId, "add"),
            edit: getPermission(menu.menuId, sub.submenuId, "edit"),
            delete: getPermission(menu.menuId, sub.submenuId, "delete"),
          })),
        }
      })
      await adminApi.saveGroupPermissions(selectedGroup, permission)
      toast.success("Permissions saved")
      qc.invalidateQueries({ queryKey: ["groups", "list"] })
      setLocalPerms({})
    } catch { toast.error("Failed to save") }
    finally { setSaving(false) }
  }

  if (groupsLoading || menuLoading) {
    return <PageShell title="Permissions"><Skeleton variant="rounded" height={200} /></PageShell>
  }

  return (
    <PageShell title="Permissions Matrix" description="Manage group permissions and access control">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Permissions Matrix</Typography>
        {selectedGroup && (
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={save}
            disabled={saving || !Object.keys(localPerms).length}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {groups.map(g => (
          <Chip
            key={g.id}
            label={g.name}
            onClick={() => { setSelectedGroup(g.id); setLocalPerms({}) }}
            color={selectedGroup === g.id ? "primary" : "default"}
            variant={selectedGroup === g.id ? "filled" : "outlined"}
          />
        ))}
      </Box>

      {!selectedGroup && (
        <Typography color="text.secondary">Select a group to view and edit its permissions.</Typography>
      )}

      {selectedGroup && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Menu</TableCell>
                <TableCell>Submenu</TableCell>
                {ACTIONS.map(a => (
                  <TableCell key={a} align="center" sx={{ textTransform: "capitalize" }}>{a}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {menus.map(menu => {
                const hasSubs = menu.submenu.length > 0
                return (
                  <FragmentRows key={menu.menuId}>
                    <TableRow hover>
                      <TableCell sx={{ fontWeight: 600 }}>{menu.menuName}</TableCell>
                      <TableCell />
                      {ACTIONS.map(a => (
                        <TableCell key={a} align="center">
                          {!hasSubs && (
                            <Checkbox
                              size="small"
                              checked={getPermission(menu.menuId, menu.menuId, a)}
                              onChange={() => togglePerm(menu.menuId, menu.menuId, a)}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {menu.submenu.map(sub => (
                      <TableRow key={sub.submenuId} hover>
                        <TableCell />
                        <TableCell>{sub.submenuName}</TableCell>
                        {ACTIONS.map(a => (
                          <TableCell key={a} align="center">
                            <Checkbox
                              size="small"
                              checked={getPermission(menu.menuId, sub.submenuId, a)}
                              onChange={() => togglePerm(menu.menuId, sub.submenuId, a)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </FragmentRows>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PageShell>
  )
}

/** Tiny helper so we can return multiple rows without React.Fragment import noise in map */
function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
