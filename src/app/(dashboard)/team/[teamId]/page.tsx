import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { teamsApi } from "@/api/teams"

type Node = {
  memberId?: string
  memberName?: string
  members?: Node[]
}

function TreeNode({ node, onSelect }: { node: Node; onSelect: (n: Node) => void }) {
  return (
    <Box sx={{ pl: 2, borderLeft: "2px solid", borderColor: "divider", my: 0.75 }}>
      <Button
        size="small"
        variant="text"
        onClick={() => onSelect(node)}
        sx={{ textTransform: "none", fontWeight: 600, justify: "text.primary" }}
      >
        {node.memberName ?? "—"}
      </Button>
      {(node.members ?? []).map((child, i) => (
        <TreeNode key={`${child.memberId}-${i}`} node={child} onSelect={onSelect} />
      ))}
    </Box>
  )
}

export default function TeamHierarchyPage() {
  const { teamId = "" } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teams", "hierarchy", teamId],
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

  function openMember(node: Node) {
    if (!node.memberId) return
    sessionStorage.setItem("teamMember", JSON.stringify({ memberId: node.memberId, name: node.memberName }))
    navigate(`/team/member/${node.memberId}?teamId=${teamId}`)
  }

  return (
    <PageShell
      title={(data as { name?: string })?.name ?? "Team Hierarchy"}
      description="Click a member to view their matters and tasks"
      breadcrumbs={[{ label: "My Teams", path: "/team" }, { label: (data as { name?: string })?.name ?? teamId }]}
      action={<Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/team")}>Back</Button>}
    >
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {isError && <Typography color="text.secondary">Failed to load hierarchy.</Typography>}
      {root && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <TreeNode node={root} onSelect={openMember} />
        </Paper>
      )}
    </PageShell>
  )
}
