import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Autocomplete, Box, Button, TextField, Typography } from "@mui/material"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { toast } from "@/lib/toast"
import { adminApi } from "@/api/admin"
import { PERMISSIONS } from "@config/permissions"
import type { GridParams } from "@/types/common.types"

type MinUser = {
  id: string
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  backEntry?: boolean
}

function displayName(u: MinUser) {
  return u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id
}

/** LMS /activity/access/permission — grant/revoke back-dated timelog entry. */
export default function ActivityAccessPage() {
  const qc = useQueryClient()
  const [gridKey, setGridKey] = useState(0)
  const [picked, setPicked] = useState<MinUser | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: users = [], isLoading } = useQuery<MinUser[]>({
    queryKey: ["users", "min", "back-entry"],
    queryFn: async () => {
      const list = await adminApi.getUsersMin()
      return (Array.isArray(list) ? list : []) as MinUser[]
    },
  })

  const withAccess = useMemo(
    () => users.filter(u => u.backEntry && (u.isActive !== false)),
    [users],
  )
  const withoutAccess = useMemo(
    () => users.filter(u => !u.backEntry && (u.isActive !== false)),
    [users],
  )

  async function grant(user: MinUser) {
    setBusy(true)
    try {
      await adminApi.setBackEntryPermission(user.id, {
        backEntry: true,
        duration: 1,
        backEntryType: "Months",
      })
      toast.success("Back-entry permission granted")
      setPicked(null)
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["users", "min"] })
    } catch {
      toast.error("Failed to grant permission")
    } finally {
      setBusy(false)
    }
  }

  async function revoke(userId: string) {
    try {
      await adminApi.setBackEntryPermission(userId, {
        backEntry: false,
        duration: undefined,
        backEntryType: undefined,
      })
      toast.success("Permission removed")
      setGridKey(k => k + 1)
      qc.invalidateQueries({ queryKey: ["users", "min"] })
    } catch {
      toast.error("Failed to remove permission")
    }
  }

  return (
    <PageShell title="Time Log Entry Access" description="Grant users permission to create back-dated time entries">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 3 }}>
        <Autocomplete
          sx={{ minWidth: 280, flex: 1, maxWidth: 420 }}
          options={withoutAccess}
          loading={isLoading}
          value={picked}
          onChange={(_, v) => setPicked(v)}
          getOptionLabel={o => displayName(o)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => <TextField {...params} label="Add user" size="small" />}
        />
        <Button
          variant="contained"
          disabled={!picked || busy}
          onClick={() => picked && grant(picked)}
        >
          Grant Access
        </Button>
      </Box>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Users with back-entry access
      </Typography>
      <DataGrid
        key={gridKey}
        columns={[
          { field: "fullName", header: "User Name", renderCell: (_v, row) => displayName(row as MinUser) },
          { field: "email", header: "Email", renderCell: v => String(v ?? "—") },
        ]}
        queryKey={["admin", "activity-access", gridKey]}
        queryFn={async (_p: GridParams) => ({
          content: withAccess,
          totalElements: withAccess.length,
          totalPages: 1,
          number: 0,
          size: withAccess.length || 25,
          first: true,
          last: true,
          empty: withAccess.length === 0,
        })}
        isPaginated={false}
        rowMenuItems={row => [
          {
            label: "Remove",
            icon: <DeleteOutlinedIcon fontSize="small" />,
            permission: PERMISSIONS.GROUPS_MANAGE,
            color: "error",
            onClick: () => revoke(String((row as MinUser).id)),
          },
        ]}
      />
    </PageShell>
  )
}
