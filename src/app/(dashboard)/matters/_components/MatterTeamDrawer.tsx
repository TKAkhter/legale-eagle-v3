/**
 * Matter team CRUD — LMS MatterTeamDialog (user × team-role rows + optional template).
 */
import { useEffect, useState } from "react"
import {
  Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { mattersApi } from "@/api/matters"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"

interface MemberRow {
  userId: string
  teamRoleId: string
}

interface Props {
  open: boolean
  onClose: () => void
  matterId: string
  matterTitle?: string
  onSuccess?: () => void
}

export function MatterTeamDrawer({ open, onClose, matterId, matterTitle, onSuccess }: Props) {
  const [rows, setRows] = useState<MemberRow[]>([{ userId: "", teamRoleId: "" }])
  const [description, setDescription] = useState("")
  const [teamId, setTeamId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQ = useQuery({
    queryKey: ["users", "min", "matter-team"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })
  const rolesQ = useQuery({
    queryKey: ["team-roles", "matter-team"],
    enabled: open,
    queryFn: () => mattersApi.getTeamRoles(),
  })
  const templatesQ = useQuery({
    queryKey: ["team-templates"],
    enabled: open,
    queryFn: () => mattersApi.getTeamTemplates(),
  })

  useEffect(() => {
    if (!open || !matterId) return
    let cancelled = false
    ;(async () => {
      try {
        const rec = await mattersApi.getMatterTeamRecord(matterId)
        if (cancelled) return
        if (rec) {
          setTeamId(rec.id)
          setDescription(rec.description)
          setTemplateId(rec.teamTemplateId)
          setRows(
            rec.users.length
              ? rec.users.map(u => ({ userId: u.userId, teamRoleId: u.teamRoleId }))
              : [{ userId: "", teamRoleId: "" }],
          )
        } else {
          setTeamId("")
          setDescription("")
          setTemplateId("")
          setRows([{ userId: "", teamRoleId: "" }])
        }
      } catch (e) {
        logger.error("MatterTeamDrawer", "Load failed", e)
      }
    })()
    return () => { cancelled = true }
  }, [open, matterId])

  async function applyTemplate(id: string) {
    setTemplateId(id)
    if (!id) return
    try {
      const tpl = await mattersApi.getTeamTemplateById(id)
      const users = (tpl.users ?? tpl.members ?? []) as Record<string, unknown>[]
      if (Array.isArray(users) && users.length) {
        setRows(
          users.map(u => ({
            userId: String(u.userId ?? (u.user as { id?: string } | undefined)?.id ?? ""),
            teamRoleId: String(u.teamRoleId ?? u.roleId ?? (u.teamRole as { id?: string } | undefined)?.id ?? ""),
          })).filter(r => r.userId && r.teamRoleId),
        )
      }
    } catch (e) {
      logger.error("MatterTeamDrawer", "Template load failed", e)
      toast.error("Failed to load template")
    }
  }

  async function submit() {
    const valid = rows.filter(r => r.userId && r.teamRoleId)
    if (!valid.length) {
      toast.error("Add at least one user with a role")
      return
    }
    setSaving(true)
    try {
      await mattersApi.saveMatterTeam({
        matterId,
        matterTitle: matterTitle ?? "",
        description,
        users: valid,
        id: teamId || undefined,
        teamTemplateId: templateId || undefined,
      })
      toast.success("Matter team saved")
      onSuccess?.()
      onClose()
    } catch (e) {
      logger.error("MatterTeamDrawer", "Save failed", e)
      toast.error((e as Error)?.message ?? "Failed to save matter team")
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQ.data ?? []) as { id?: string; firstName?: string; lastName?: string }[]
  const roles = (rolesQ.data ?? []) as { id?: string; description?: string; name?: string; roleName?: string }[]
  const templates = (templatesQ.data ?? []) as { id?: string; name?: string }[]

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Matter Team"
      subtitle={matterTitle}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={teamId ? "Update Team" : "Save Team"}
      width={560}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Team template</InputLabel>
          <Select
            label="Team template"
            value={templateId}
            onChange={e => void applyTemplate(String(e.target.value))}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {templates.map(t => (
              <MenuItem key={String(t.id)} value={String(t.id)}>{t.name ?? t.id}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Members</Typography>
        {rows.map((row, idx) => (
          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <FormControl size="small" fullWidth>
              <InputLabel>User</InputLabel>
              <Select
                label="User"
                value={row.userId}
                onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, userId: String(e.target.value) } : r))}
              >
                {users.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={row.teamRoleId}
                onChange={e => setRows(prev => prev.map((r, i) => i === idx ? { ...r, teamRoleId: String(e.target.value) } : r))}
              >
                {roles.map(r => (
                  <MenuItem key={String(r.id)} value={String(r.id)}>
                    {r.description || r.name || r.roleName || r.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton
              size="small"
              disabled={rows.length <= 1}
              onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
              aria-label="Remove member"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setRows(prev => [...prev, { userId: "", teamRoleId: "" }])}
        >
          Add member
        </Button>
      </Box>
    </FormDrawer>
  )
}
