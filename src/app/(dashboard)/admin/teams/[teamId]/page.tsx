import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, CircularProgress, IconButton, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Can } from "@components/ui/Can"
import { AddMemberDrawer } from "../_components/AddMemberDrawer"
import { teamsApi } from "@/api/teams"
import { toast } from "@/lib/toast"
import { PERMISSIONS } from "@config/permissions"

type Node = {
  memberId?: string
  memberName?: string
  supervisor?: string
  members?: Node[]
}

function TreeNode({
  node,
  depth,
  onRemove,
}: {
  node: Node
  depth: number
  onRemove?: (memberId: string) => void
}) {
  const isRoot = depth === 0
  return (
    <Box sx={{ pl: depth === 0 ? 0 : 2, borderLeft: depth ? "2px solid" : "none", borderColor: "divider", my: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: isRoot ? 700 : 600, fontSize: 14 }}>
          {node.memberName ?? "—"}
        </Typography>
        {!isRoot && node.memberId && onRemove && (
          <IconButton size="small" color="error" aria-label="Remove member" onClick={() => onRemove(node.memberId!)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      {(node.members ?? []).map((child, i) => (
        <TreeNode key={`${child.memberId}-${i}`} node={child} depth={depth + 1} onRemove={onRemove} />
      ))}
    </Box>
  )
}

/** LMS `/team/:id` admin hierarchy — add/remove members. */
export default function AdminTeamDetailPage() {
  const { teamId = "" } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teams", "hierarchy", teamId, "admin"],
    queryFn: () => teamsApi.getHierarchy(teamId),
    enabled: !!teamId,
  })

  const root = useMemo(() => {
    if (!data) return null
    const d = data as Node & { name?: string; members?: Node[] }
    return {
      memberId: d.memberId,
      memberName: d.memberName ?? d.name ?? "Team",
      members: d.members ?? [],
    } as Node
  }, [data])

  const teamName = (data as { name?: string } | undefined)?.name ?? teamId

  async function confirmRemove() {
    if (!removeId) return
    try {
      await teamsApi.removeMember(teamId, removeId)
      toast.success("Member removed")
      setRemoveId(null)
      qc.invalidateQueries({ queryKey: ["teams", "hierarchy", teamId] })
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { message?: string })?.message
        ?? "Failed to remove member",
      )
    }
  }

  return (
    <PageShell
      title={teamName}
      description="Manage team hierarchy and members"
      breadcrumbs={[
        { label: "Teams", path: "/admin/teams" },
        { label: teamName },
      ]}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/admin/teams")}>Back</Button>
          <Can do={PERMISSIONS.TEAM_MANAGE}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
              Add Member
            </Button>
          </Can>
        </Box>
      )}
    >
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {isError && <Typography color="text.secondary">Failed to load hierarchy.</Typography>}
      {root && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <TreeNode node={root} depth={0} onRemove={id => setRemoveId(id)} />
        </Paper>
      )}

      <AddMemberDrawer
        open={addOpen}
        teamId={teamId}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          toast.success("Member added")
          qc.invalidateQueries({ queryKey: ["teams", "hierarchy", teamId] })
        }}
      />

      <ConfirmDialog
        open={!!removeId}
        title="Remove member?"
        message="This member will be removed from the team hierarchy."
        confirmLabel="Remove"
        severity="error"
        onConfirm={confirmRemove}
        onClose={() => setRemoveId(null)}
      />
    </PageShell>
  )
}
