import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import UpdateIcon from "@mui/icons-material/Update"
import EventNoteIcon from "@mui/icons-material/EventNote"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { leadsApi } from "@/api/leads"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import { PERMISSIONS } from "@lib/auth/permissions"
import type { GridParams } from "@/types/common.types"
import { LeadFormDrawer } from "./_components/LeadFormDrawer"
import { LeadStatusDialog } from "./_components/LeadStatusDialog"
import { FollowupFormDrawer } from "./_components/FollowupFormDrawer"
import { LeadListFilters } from "./_components/LeadListFilters"
import { getLeadListColumns } from "./_components/LeadListColumns"

export default function LeadsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission(PERMISSIONS.LEADS_CREATE)
  const canEdit = hasPermission(PERMISSIONS.LEADS_VIEW)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [editLeadId, setEditLeadId] = useState<string>()
  const [prefillClientId, setPrefillClientId] = useState<string>()
  const [writeOffId, setWriteOffId] = useState<string>()
  const [writeOffReason, setWriteOffReason] = useState("")
  const [reopenId, setReopenId] = useState<string>()
  const [statusLead, setStatusLead] = useState<{ id: string; status?: string } | null>(null)
  const [followUpLeadId, setFollowUpLeadId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const cid = searchParams.get("clientId") ?? undefined
      setEditLeadId(undefined)
      setPrefillClientId(cid || undefined)
      setDrawerOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Dashboard deep-links: /leads?status=Open|Converted|Writeoff
  const urlStatus = searchParams.get("status")
  const initialStatusGroup = urlStatus === "Write_Off" || urlStatus === "Written Off"
    ? "Writeoff"
    : (urlStatus || undefined)

  const reasonsQuery = useQuery({
    queryKey: ["leads", "writeoff-reasons"],
    queryFn: () => leadsApi.getWriteOffReasons(),
    enabled: !!writeOffId,
  })

  const { data: statusOptions = [] } = useQuery({
    queryKey: ["leads", "statuses"],
    queryFn: () => leadsApi.getLeadStatuses(),
  })

  const statusChoices = useMemo(() => (
    statusOptions.length ? statusOptions : ["NEW", "FOLLOW_UP", "PROPOSAL", "CONVERTED", "CLOSED", "WRITE_OFF"]
  ), [statusOptions])

  async function confirmWriteOff() {
    if (!writeOffId) return
    await leadsApi.writeOff(writeOffId, writeOffReason)
    setWriteOffId(undefined)
    setWriteOffReason("")
    setGridKey(k => k + 1)
    toast.success("Lead written off")
  }

  async function confirmReopen() {
    if (!reopenId) return
    toast.success(await leadsApi.reopen(reopenId))
    setReopenId(undefined)
    setGridKey(k => k + 1)
  }

  return (
    <PageShell
      title={t("nav.leads")}
      description={t("pages.leadsDesc")}
      action={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditLeadId(undefined); setPrefillClientId(undefined); setDrawerOpen(true) }}>New Lead</Button> : undefined}
    >
      <DataGrid
        key={gridKey}
        columns={getLeadListColumns()}
        queryKey={["leads", "list"]}
        queryFn={(p: GridParams) => leadsApi.getAll({
          ...p,
          filters: {
            type: "All",
            statusGroup: initialStatusGroup ?? "Open",
            ...p.filters,
            ...(initialStatusGroup && !p.filters?.statusGroup ? { statusGroup: initialStatusGroup } : {}),
          },
        })}
        FilterPanel={LeadListFilters}
        hasFilters
        syncWithUrl
        isSortingBackend={false}
        defaultPageSize={10}
        detailPath={row => `/leads/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const r = row as {
            id?: string; status?: string; writeOff?: boolean; converted?: boolean
            repeated?: boolean; conflictCheckStatus?: string
          }
          const id = String(r.id ?? "")
          const status = String(r.status ?? "")
          const writtenOff = !!r.writeOff || ["WRITE_OFF", "Writeoff"].includes(status)
          const converted = !!r.converted || status === "CONVERTED" || status === "Converted"
          const conflictOk = String(r.conflictCheckStatus ?? "").replace(/\s+/g, "_") === "No_Conflict"
          const convertLabel = r.repeated ? "Convert Lead" : "Close Lead"
          const active = !writtenOff && !converted
          return [
            { label: "Details", onClick: () => navigate(`/leads/${id}`) },
            ...(canEdit && active ? [{ label: "Edit", icon: <EditIcon fontSize="small" />, onClick: () => { setEditLeadId(id); setDrawerOpen(true) } }] : []),
            ...(canEdit && active ? [{
              label: "Update Status",
              icon: <UpdateIcon fontSize="small" />,
              onClick: () => setStatusLead({ id, status }),
            }] : []),
            ...(canEdit && active ? [{
              label: "Follow Up",
              icon: <EventNoteIcon fontSize="small" />,
              onClick: () => setFollowUpLeadId(id),
            }] : []),
            ...(active && conflictOk ? [{
              label: convertLabel,
              icon: <SwapHorizIcon fontSize="small" />,
              onClick: () => navigate(`/leads/${id}`),
            }] : []),
            ...(canEdit && active ? [{ label: "Write Off", icon: <DeleteIcon fontSize="small" />, onClick: () => setWriteOffId(id) }] : []),
            ...(canEdit && writtenOff ? [{ label: "Reopen", icon: <RestartAltIcon fontSize="small" />, onClick: () => setReopenId(id) }] : []),
          ]
        }}
      />

      <LeadFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPrefillClientId(undefined) }}
        leadId={editLeadId}
        clientId={prefillClientId}
        onSaved={() => { setDrawerOpen(false); setPrefillClientId(undefined); setGridKey(k => k + 1); toast.success(editLeadId ? "Lead updated" : "Lead created") }}
      />

      <LeadStatusDialog
        open={!!statusLead}
        onClose={() => setStatusLead(null)}
        leadId={statusLead?.id ?? ""}
        statuses={statusChoices}
        initialStatus={statusLead?.status}
        onSuccess={() => { setGridKey(k => k + 1); toast.success("Status updated") }}
      />

      <FollowupFormDrawer
        open={!!followUpLeadId}
        onClose={() => setFollowUpLeadId(undefined)}
        leadId={followUpLeadId ?? ""}
        onSuccess={() => { setFollowUpLeadId(undefined); setGridKey(k => k + 1); toast.success("Follow-up added") }}
      />

      <Dialog open={!!writeOffId} onClose={() => setWriteOffId(undefined)} fullWidth maxWidth="xs">
        <DialogTitle>Write Off Lead</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Reason</InputLabel>
            <Select label="Reason" value={writeOffReason} onChange={e => setWriteOffReason(e.target.value)}>
              {(reasonsQuery.data ?? []).map(reason => (
                <MenuItem key={reason.id} value={reason.name}>{reason.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWriteOffId(undefined)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!writeOffReason} onClick={confirmWriteOff}>Write Off</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!reopenId}
        onClose={() => setReopenId(undefined)}
        onConfirm={confirmReopen}
        title="Reopen Lead"
        message="Are you sure you want to reopen this lead?"
        confirmLabel="Reopen"
      />
    </PageShell>
  )
}
