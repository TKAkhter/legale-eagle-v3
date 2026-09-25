import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Box, Button, Chip, LinearProgress, Paper, Typography } from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/ui/PageShell"
import { TeamTemplateFormDrawer } from "../_components/TeamTemplateFormDrawer"
import { teamTemplatesApi } from "@/api/teamTemplates"

function roleSortOrder(roleName: string): number {
  const n = roleName.toLowerCase()
  if (n.includes("handling")) return 0
  if (n.includes("supervisor")) return 1
  return 2
}

export default function TeamTemplateDetailPage() {
  const { templateId = "" } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["team-templates", templateId],
    queryFn: () => teamTemplatesApi.getById(templateId),
    enabled: !!templateId,
  })

  const t = (data ?? {}) as Record<string, unknown>
  const users = useMemo(() => {
    const list = ((t.users ?? []) as Record<string, string>[]).slice()
    list.sort((a, b) => {
      const ra = String(a.teamRoleName ?? a.roleName ?? "")
      const rb = String(b.teamRoleName ?? b.roleName ?? "")
      return roleSortOrder(ra) - roleSortOrder(rb)
    })
    return list
  }, [t.users])

  return (
    <PageShell
      title={String(t.name ?? "Team Template")}
      description={String(t.description ?? "")}
      breadcrumbs={[
        { label: "Team Templates", path: "/team/templates" },
        { label: String(t.name ?? templateId) },
      ]}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/team/templates")}>Back</Button>
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditOpen(true)} disabled={!templateId}>
            Edit
          </Button>
        </Box>
      )}
    >
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {users.length === 0 && !isLoading ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No members in this template.</Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "action.hover" }}>
                {["Member", "Role"].map(h => (
                  <Box component="th" key={h} sx={{ px: 2, py: 1, textAlign: "left", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {users.map((u, i) => (
                <Box component="tr" key={i} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontSize: 13 }}>
                    {String(u.userName ?? u.firstName ?? u.userId ?? "—")}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={String(u.teamRoleName ?? u.roleName ?? "—")} variant="outlined" />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
      <TeamTemplateFormDrawer
        open={editOpen}
        templateId={templateId}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["team-templates", templateId] })
          qc.invalidateQueries({ queryKey: ["team-templates"] })
        }}
      />
    </PageShell>
  )
}
