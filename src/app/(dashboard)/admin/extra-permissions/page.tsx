import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Autocomplete, Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"
import { PERMISSIONS } from "@config/permissions"
import type { GridParams } from "@/types/common.types"

const PERMISSION_TYPES = [
  { value: "LeadSource", label: "Lead Source", flag: "leadSourceEntry" },
  { value: "PracticeArea", label: "Practice Area", flag: "practiceAreaEntry" },
  { value: "DepartmentInvoiceApproval", label: "Department Invoice Approval", flag: "departmentInvoiceApproval" },
  { value: "DepartmentActivitiesReview", label: "Department Activities Review", flag: "departmentActivitiesReview" },
  { value: "DepartmentActivitiesReviewAndApproval", label: "Department Activities Review and Approval", flag: "departmentActivitiesReviewAndApproval" },
  { value: "ManageClientCredit", label: "Manage Client Credit", flag: "manageClientCredit" },
  { value: "MatterStopWorking", label: "Matter Stop Working Reasons", flag: "matterStopWorking" },
] as const

type MinUser = {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  [key: string]: unknown
}

function displayName(u: MinUser) {
  return u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id
}

/** LMS /activity/extrapermission — grant/revoke specialty capability flags. */
export default function ExtraPermissionsPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [permissionType, setPermissionType] = useState("")
  const [picked, setPicked] = useState<MinUser | null>(null)
  const [busy, setBusy] = useState(false)

  const flag = PERMISSION_TYPES.find(p => p.value === permissionType)?.flag

  const { data: users = [], isLoading } = useQuery<MinUser[]>({
    queryKey: ["users", "min", "extra-perm"],
    queryFn: async () => {
      const list = await adminApi.getUsersMin()
      return (Array.isArray(list) ? list : []) as MinUser[]
    },
  })

  const withPerm = useMemo(() => {
    if (!flag) return []
    return users.filter(u => u.isActive !== false && Boolean(u[flag]))
  }, [users, flag])

  const withoutPerm = useMemo(() => {
    if (!flag) return []
    return users.filter(u => u.isActive !== false && !u[flag])
  }, [users, flag])

  async function add() {
    if (!picked || !permissionType) return
    setBusy(true)
    try {
      await adminApi.setExtraPermission(picked.id, "true", permissionType)
      toast.success("Permission added")
      setPicked(null)
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["users", "min"] })
    } catch {
      toast.error("Failed to add permission")
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: string) {
    if (!permissionType) return
    try {
      await adminApi.setExtraPermission(userId, "false", permissionType)
      toast.success("Permission removed")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["users", "min"] })
    } catch {
      toast.error("Failed to remove permission")
    }
  }

  return (
    <PageShell title="Extra Permissions" description="Grant specialty capabilities beyond group roles">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Permission Type</InputLabel>
          <Select
            label="Permission Type"
            value={permissionType}
            onChange={e => {
              setPermissionType(e.target.value)
              setPicked(null)
              setGridKey(k => k + 1)
            }}
          >
            <MenuItem value=""><em>Select type</em></MenuItem>
            {PERMISSION_TYPES.map(p => (
              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Autocomplete
          sx={{ minWidth: 260, flex: 1, maxWidth: 400 }}
          disabled={!permissionType}
          options={withoutPerm}
          loading={isLoading}
          value={picked}
          onChange={(_, v) => setPicked(v)}
          getOptionLabel={o => displayName(o)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Add user" size="small" />}
        />
        <Button variant="contained" disabled={!picked || !permissionType || busy} onClick={add}>
          Add Permission
        </Button>
      </Box>

      {!permissionType ? (
        <Typography color="text.secondary">Select a permission type to view and manage holders.</Typography>
      ) : (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Users with this permission
          </Typography>
          <DataGrid
            key={`${permissionType}-${gridKey}`}
            columns={[
              { field: "fullName", header: "User Name", renderCell: (_v, row) => displayName(row as MinUser) },
              { field: "email", header: "Email", renderCell: v => String(v ?? "—") },
            ]}
            queryKey={["admin", "extra-permissions", permissionType, gridKey]}
            queryFn={async (_p: GridParams) => ({
              content: withPerm,
              totalElements: withPerm.length,
              totalPages: 1,
              number: 0,
              size: withPerm.length || 25,
              first: true,
              last: true,
              empty: withPerm.length === 0,
            })}
            isPaginated={false}
            rowMenuItems={row => [
              {
                label: "Remove",
                icon: <DeleteOutlinedIcon fontSize="small" />,
                permission: PERMISSIONS.GROUPS_MANAGE,
                color: "error",
                onClick: () => remove(String((row as MinUser).id)),
              },
            ]}
          />
        </>
      )}
    </PageShell>
  )
}
