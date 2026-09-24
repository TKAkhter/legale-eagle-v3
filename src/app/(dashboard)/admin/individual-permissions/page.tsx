import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Autocomplete, Box, Button, Checkbox, Paper, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"
import { PageShell } from "@/components/ui/PageShell"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"

type Action = "visible" | "add" | "edit" | "delete"
const ACTIONS: Action[] = ["visible", "add", "edit", "delete"]

type MinUser = {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
}

type SubmenuAccess = {
  menuInfo?: { id?: string; menuName?: string }
  visible?: boolean
  add?: boolean
  edit?: boolean
  delete?: boolean
}

type IndividualPermGroup = {
  parentMenu?: { id?: string; menuName?: string }
  parentMenuAccess?: { visible?: boolean; add?: boolean; edit?: boolean; delete?: boolean }
  submenu?: SubmenuAccess[]
}

type MatrixRow = {
  menuId: string
  submenuId: string
  label: string
  visible: boolean
  add: boolean
  edit: boolean
  delete: boolean
}

function displayName(u: MinUser) {
  return u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id
}

function buildRows(data: { permissions?: IndividualPermGroup[] } | null): MatrixRow[] {
  const rows: MatrixRow[] = []
  for (const g of data?.permissions ?? []) {
    const menuId = String(g.parentMenu?.id ?? "")
    const menuName = g.parentMenu?.menuName ?? "Menu"
    const subs = g.submenu ?? []
    if (subs.length === 0) {
      const a = g.parentMenuAccess
      rows.push({
        menuId,
        submenuId: "",
        label: menuName,
        visible: Boolean(a?.visible),
        add: Boolean(a?.add),
        edit: Boolean(a?.edit),
        delete: Boolean(a?.delete),
      })
      continue
    }
    for (const s of subs) {
      rows.push({
        menuId,
        submenuId: String(s.menuInfo?.id ?? ""),
        label: `${menuName} › ${s.menuInfo?.menuName ?? "Submenu"}`,
        visible: Boolean(s.visible),
        add: Boolean(s.add),
        edit: Boolean(s.edit),
        delete: Boolean(s.delete),
      })
    }
  }
  return rows
}

function toPayload(rows: MatrixRow[]) {
  const byMenu = new Map<string, MatrixRow[]>()
  for (const r of rows) {
    const list = byMenu.get(r.menuId) ?? []
    list.push(r)
    byMenu.set(r.menuId, list)
  }
  return Array.from(byMenu.entries()).map(([menuId, list]) => ({
    menuId,
    accessModifies: list.map(r => ({
      submenuId: r.submenuId,
      visible: r.visible,
      add: r.add,
      edit: r.edit,
      delete: r.delete,
    })),
  }))
}

/** LMS /individual/modification — per-user menu permission overrides. */
export default function IndividualPermissionsPage() {
  const qc = useQueryClient()
  const [user, setUser] = useState<MinUser | null>(null)
  const [rows, setRows] = useState<MatrixRow[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: users = [], isLoading: usersLoading } = useQuery<MinUser[]>({
    queryKey: ["users", "min"],
    queryFn: async () => {
      const list = await adminApi.getUsersMin()
      return (Array.isArray(list) ? list : []) as MinUser[]
    },
  })

  const activeUsers = useMemo(
    () => users.filter(u => u.isActive !== false),
    [users],
  )

  const { isFetching: menuLoading } = useQuery({
    queryKey: ["admin", "individual-menu", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const data = await adminApi.getIndividualMenu(user!.id)
      setRows(buildRows(data as { permissions?: IndividualPermGroup[] }))
      setDirty(false)
      return data
    },
  })

  function toggle(idx: number, action: Action) {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [action]: !next[idx][action] }
      return next
    })
    setDirty(true)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    try {
      await adminApi.saveIndividualPermissions(user.id, toPayload(rows))
      toast.success("Individual permissions saved")
      setDirty(false)
      qc.invalidateQueries({ queryKey: ["admin", "individual-menu", user.id] })
    } catch {
      toast.error("Failed to save permissions")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Individual Permissions" description="Override menu access for a specific user">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
        <Autocomplete
          sx={{ minWidth: 280, flex: 1, maxWidth: 420 }}
          options={activeUsers}
          loading={usersLoading}
          value={user}
          onChange={(_, v) => {
            setUser(v)
            setRows([])
            setDirty(false)
          }}
          getOptionLabel={o => displayName(o)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Select user" size="small" />}
        />
        {user && (
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!dirty || saving || menuLoading}
            onClick={save}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        )}
      </Box>

      {!user && (
        <Typography color="text.secondary">Select a user to view and edit individual permissions.</Typography>
      )}

      {user && menuLoading && <Skeleton variant="rounded" height={240} />}

      {user && !menuLoading && rows.length === 0 && (
        <Typography color="text.secondary">No permission rows returned for this user.</Typography>
      )}

      {user && !menuLoading && rows.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Menu</TableCell>
                {ACTIONS.map(a => (
                  <TableCell key={a} align="center" sx={{ textTransform: "capitalize" }}>{a}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={`${r.menuId}-${r.submenuId}-${idx}`} hover>
                  <TableCell>{r.label}</TableCell>
                  {ACTIONS.map(a => (
                    <TableCell key={a} align="center">
                      <Checkbox size="small" checked={r[a]} onChange={() => toggle(idx, a)} />
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
