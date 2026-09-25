import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Box, Typography, Paper, Avatar, Chip, Button, IconButton, Menu, MenuItem, Tooltip } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import LockIcon from "@mui/icons-material/Lock"
import AddIcon from "@mui/icons-material/Add"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import CategoryIcon from "@mui/icons-material/Category"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import SyncIcon from "@mui/icons-material/Sync"
import StarIcon from "@mui/icons-material/Star"
import StarBorderIcon from "@mui/icons-material/StarBorder"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined"
import LinkIcon from "@mui/icons-material/Link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { clientsApi } from "@/api/clients"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { DetailInfoRow } from "@/components/detail/DetailInfoRow"
import { DocumentsTab } from "@/components/detail/DocumentsTab"
import { ClientFormDrawer } from "../_components/ClientFormDrawer"
import { ClientBillingThreshold, type ClientRevenuePayload } from "../_components/ClientBillingThreshold"
import { FinanceContactDrawer, type FinanceContactFormValues } from "../_components/FinanceContactDrawer"
import { AllotBankAccountDrawer } from "../_components/AllotBankAccountDrawer"
import { AssignCreditCategoryDrawer } from "../_components/AssignCreditCategoryDrawer"
import { CreateAccountDrawer } from "../_components/CreateAccountDrawer"
import { UploadAdminDocumentDrawer } from "../_components/UploadAdminDocumentDrawer"
import { ClientZohoOutstandingTab } from "../_components/ClientZohoOutstandingTab"
import { LfaFormDrawer } from "../../lfa/_components/LfaFormDrawer"
import { ActivityFormDrawer } from "../../time-log-entries/_components/ActivityFormDrawer"
import { AttachTimelogEntriesDialog } from "../../leads/_components/AttachTimelogEntriesDialog"
import { LeadFormDrawer } from "../../leads/_components/LeadFormDrawer"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"
import type { Client } from "@/transformers/client.transformer"

export default function ClientDetailPage() {
  const { t } = useTranslation()
  const { clientId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const hasPermission = useAuthStore(s => s.hasPermission)
  // Path checks mirror OLD ClientDetails; resource:action matches resolvePermissions().
  const canEdit = hasPermission("/clients") || hasPermission("clients:edit") || hasPermission("clients:view")
  const canAddLead = hasPermission("/leads") || hasPermission("leads:view") || hasPermission("leads:create")
  // OLD Admin Documents: /clients add → clients:create (no document/admin in PERMISSIONS)
  const canViewAdminDocs = hasPermission("clients:create") || hasPermission("/clients")
  const canViewTasks = hasPermission("/tasks") || hasPermission("tasks:view")
  const canViewTimeLogs =
    hasPermission("/activities")
    || hasPermission("/time-log-entries")
    || hasPermission("timelogs:view")
  const canViewLogs = hasPermission("/clients") || hasPermission("clients:view") || hasPermission("clients:edit")
  const canViewLfa = hasPermission("/lfa") || hasPermission("/LFAs") || hasPermission("lfa:view")
  const canViewLeads = hasPermission("/leads") || hasPermission("leads:view")
  const clientLabel = t("pages.client", "Client")
  const clientsListLabel = t("nav.clients")
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [financeContact, setFinanceContact] = useState<FinanceContactFormValues | null>(null)
  const [deleteFinanceId, setDeleteFinanceId] = useState<string | null>(null)
  const [bankOpen, setBankOpen] = useState(false)
  const [creditOpen, setCreditOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [adminUploadOpen, setAdminUploadOpen] = useState(false)
  const [lfaOpen, setLfaOpen] = useState(false)
  const [logTimeOpen, setLogTimeOpen] = useState(false)
  const [attachTimelogOpen, setAttachTimelogOpen] = useState(false)
  const [attachActivityIds, setAttachActivityIds] = useState<string[]>([])
  const [timelogGridKey, setTimelogGridKey] = useState(0)
  const [addMatterOpen, setAddMatterOpen] = useState(false)
  const [zohoConfirmOpen, setZohoConfirmOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [favOptimistic, setFavOptimistic] = useState<boolean | null>(null)
  const [showAllRepresentatives, setShowAllRepresentatives] = useState(false)

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: () => {
      logger.debug("ClientDetail", `id:${clientId}`)
      return clientsApi.getById(clientId!)
    },
    enabled: !!clientId,
  })

  const revenueQuery = useQuery({
    queryKey: ["clients", "revenue", clientId],
    queryFn: () => clientsApi.getRevenue(clientId!),
    enabled: !!clientId,
  })

  const creditQuery = useQuery({
    queryKey: ["clients", "credit-categories", clientId],
    queryFn: () => clientsApi.getCreditCategories(clientId!),
    enabled: !!clientId,
  })

  const favQuery = useQuery({
    queryKey: ["clients", "favourites"],
    queryFn: () => clientsApi.getFavourites(),
  })

  if (isLoading) return <PageShell title={clientLabel}><DetailSkeleton /></PageShell>
  if (isError || !client) {
    return (
      <PageShell title={clientLabel} breadcrumbs={[{ label: clientsListLabel, path: "/clients" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Client not found.</Typography>
      </PageShell>
    )
  }

  const c = client as Client
  const name = c.name || clientLabel
  const isClosed = c.status === "CLOSE"
  const revenue = (revenueQuery.data ?? {}) as ClientRevenuePayload
  const creditCategories = creditQuery.data ?? []
  const isFavourite = favOptimistic ?? (
    Boolean(c.favourite)
    || (favQuery.data ?? []).includes(String(c.id))
    || (favQuery.data ?? []).includes(String(clientId))
  )
  const canMutate = canEdit && !isClosed
  const primaryEmail = (c.emails ?? [])[0]?.replace(" (primary)", "") || c.email || ""
  const clientMailAddresses = [
    ...(c.emails ?? []).map(e => e.replace(/\s*\(primary\)\s*$/i, "").trim()),
    ...(c.email ? [String(c.email).replace(/\s*\(primary\)\s*$/i, "").trim()] : []),
  ].filter(Boolean)
  const representatives = c.representatives ?? []
  const visibleRepresentatives = showAllRepresentatives
    ? representatives
    : representatives.slice(0, 2)

  async function toggleStatus() {
    try {
      const message = isClosed
        ? await clientsApi.open(String(clientId))
        : await clientsApi.close(String(clientId))
      toast.success(message)
      qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
      qc.invalidateQueries({ queryKey: ["clients", "list"] })
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to update client status")
    }
  }

  async function toggleFavourite() {
    const next = !isFavourite
    setFavOptimistic(next)
    try {
      await clientsApi.toggleFavourite(String(clientId), next)
      toast.success(next ? "Added to favourites" : "Removed from favourites")
      qc.invalidateQueries({ queryKey: ["clients", "favourites"] })
      qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
      qc.invalidateQueries({ queryKey: ["clients", "list"] })
    } catch {
      setFavOptimistic(null)
      toast.error("Failed to update favourite")
    }
  }

  async function confirmCreateInZoho() {
    try {
      const message = await clientsApi.addToZoho(String(clientId))
      toast.success(message)
      qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to create client in Zoho")
    } finally {
      setZohoConfirmOpen(false)
    }
  }

  async function confirmDeleteFinance() {
    if (!deleteFinanceId) return
    try {
      await clientsApi.deleteFinanceContact(deleteFinanceId)
      toast.success("Finance contact deleted")
      qc.invalidateQueries({ queryKey: ["clients", "finance-contacts", clientId] })
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Failed to delete finance contact")
    } finally {
      setDeleteFinanceId(null)
    }
  }

  function openFinanceCreate() {
    setFinanceContact(null)
    setFinanceOpen(true)
  }

  function openFinanceEdit(row: Record<string, unknown>) {
    setFinanceContact({
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      contactNumber: String(row.contactNumber ?? ""),
      primary: Boolean(row.primary),
    })
    setFinanceOpen(true)
  }

  return (
    <PageShell
      title={name}
      description={`${clientLabel} • ${c.clientType}`}
      breadcrumbs={[{ label: clientsListLabel, path: "/clients" }, { label: name }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Tooltip title={isClosed ? "Closed clients cannot be favourited" : isFavourite ? "Remove from favourites" : "Add to favourites"}>
            <span>
              <IconButton
                size="small"
                disabled={isClosed}
                onClick={() => { void toggleFavourite() }}
                aria-label="Toggle favourite"
              >
                {isFavourite ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          {canMutate && (
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
          )}
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              color={isClosed ? "success" : "error"}
              startIcon={isClosed ? <LockOpenIcon /> : <LockIcon />}
              onClick={() => setStatusOpen(true)}
            >
              {isClosed ? "Activate" : "Deactivate"}
            </Button>
          )}
          {canEdit && (
            <>
              <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="More actions">
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem
                  disabled={!canMutate}
                  onClick={() => { setMenuAnchor(null); setBankOpen(true) }}
                >
                  <AccountBalanceIcon fontSize="small" sx={{ mr: 1 }} /> Allot Bank Account
                </MenuItem>
                <MenuItem
                  disabled={!canMutate}
                  onClick={() => { setMenuAnchor(null); setCreditOpen(true) }}
                >
                  <CategoryIcon fontSize="small" sx={{ mr: 1 }} /> Assign Credit Category
                </MenuItem>
                {!c.username && (
                  <MenuItem
                    disabled={!canMutate}
                    onClick={() => { setMenuAnchor(null); setAccountOpen(true) }}
                  >
                    <PersonAddIcon fontSize="small" sx={{ mr: 1 }} /> Add Username
                  </MenuItem>
                )}
                {!c.zohoClientId && (
                  <MenuItem
                    onClick={() => { setMenuAnchor(null); setZohoConfirmOpen(true) }}
                  >
                    <SyncIcon fontSize="small" sx={{ mr: 1 }} /> Create in Zoho
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      )}
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, display: "flex", gap: 2.5, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 22 }}>{name[0]?.toUpperCase() ?? "C"}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{name}</Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
            <StatusBadge status={isClosed ? "inactive" : "active"} />
            <Chip size="small" label={c.clientType} variant="outlined" />
            {!!c.clientExternalId && <Chip size="small" label={c.clientExternalId} variant="outlined" />}
            {!!c.trnNo && <Chip size="small" label={`TRN: ${c.trnNo}`} variant="outlined" />}
            {!!c.zohoClientId && <Chip size="small" label="Zoho" color="info" variant="outlined" />}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 3 }, flexWrap: "wrap", width: "100%", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
          {([
            ["Open Matters", String(c.openMatter)],
            ["Closed", String(c.closeMatter)],
            ["LFAs", String(c.lfaCount)],
            ["Total Billed", formatCurrency(Number(revenue.billed ?? c.totalInvoiceAmount ?? 0))],
          ] as [string, string][]).map(([label, value]) => (
            <Box key={label} sx={{ textAlign: "center", minWidth: 72 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      <Tabs tabs={[
        {
          label: "Home",
          content: (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Contact</Typography>
                  <DetailInfoRow label="Emails" value={(c.emails ?? []).join(", ") || c.email || "—"} />
                  <DetailInfoRow label="Phones" value={(c.phones ?? []).join(", ") || c.phone || "—"} />
                  <DetailInfoRow label="Address" value={c.address || "—"} />
                  <DetailInfoRow
                    label="Nationality"
                    value={(c.nationality ?? []).length ? (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {(c.nationality ?? []).map(item => <Chip key={item} size="small" label={item} variant="outlined" />)}
                      </Box>
                    ) : "—"}
                  />
                  {representatives.length > 0 && (
                    <DetailInfoRow
                      label="Representatives"
                      value={(
                        <Box>
                          {visibleRepresentatives.map((rep, i) => (
                            <Typography key={`${rep.name}-${i}`} variant="body2">
                              {rep.name}{rep.designation ? ` (${rep.designation})` : ""}
                            </Typography>
                          ))}
                          {representatives.length > 2 && (
                            <Button
                              size="small"
                              onClick={() => setShowAllRepresentatives(v => !v)}
                              sx={{ mt: 0.5, p: 0, minWidth: "auto", textTransform: "none" }}
                            >
                              {showAllRepresentatives ? "Show less" : "Show more"}
                            </Button>
                          )}
                        </Box>
                      )}
                    />
                  )}
                </Paper>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Details</Typography>
                  <DetailInfoRow label="Client ID" value={c.clientExternalId || "—"} />
                  <DetailInfoRow label="Type" value={c.clientType} />
                  <DetailInfoRow label="Username" value={c.username || "—"} />
                  <DetailInfoRow label="Group" value={c.groupName || "—"} />
                  <DetailInfoRow label="Bank Account" value={c.bankAccount || "—"} />
                  <DetailInfoRow
                    label="Credit Category"
                    value={creditCategories.length ? (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {creditCategories.map((item, idx) => (
                          <Chip
                            key={String(item.id ?? item.creditCategoryId ?? idx)}
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={`${item.creditCategoryName || item.name || "Category"}${
                              item.creditActualLimit != null ? ` · ${formatCurrency(Number(item.creditActualLimit))}` : ""
                            }`}
                          />
                        ))}
                      </Box>
                    ) : (creditQuery.isLoading ? "Loading…" : "Not assigned")}
                  />
                  <DetailInfoRow label="Last Activity" value={c.lastActivityDate ? formatDate(c.lastActivityDate) : "—"} />
                  <DetailInfoRow label="Created" value={formatDate(c.createdAt)} />
                  <DetailInfoRow label="Collected" value={formatCurrency(Number(revenue.collected ?? 0))} />
                  <DetailInfoRow label="Outstanding" value={formatCurrency(Number(revenue.outstanding ?? 0))} />
                </Paper>
              </Box>
              <ClientBillingThreshold
                revenue={revenue}
                loading={revenueQuery.isLoading}
                error={revenueQuery.isError}
                onRefresh={() => { void revenueQuery.refetch() }}
              />
            </Box>
          ),
        },
        {
          label: "Matters",
          content: (
            <Box>
              {canAddLead && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={isClosed}
                    onClick={() => setAddMatterOpen(true)}
                  >
                    Add Matter
                  </Button>
                </Box>
              )}
              <DataGrid
                columns={[
                  { field: "title", header: "Title" },
                  { field: "practiceArea", header: "Practice Area", renderCell: v => typeof v === "object" && v ? String((v as { name?: string }).name ?? "") : String(v ?? "—") },
                  {
                    field: "sowCount",
                    header: "SOWs",
                    align: "center",
                    renderCell: (v, row) => {
                      const r = row as Record<string, unknown>
                      const n = v ?? r.totalSowCount
                      if (n == null || n === "") {
                        const subs = r.subMatters
                        return Array.isArray(subs) && subs.length ? String(subs.length) : "—"
                      }
                      return String(n)
                    },
                  },
                  { field: "billingType", header: "Billing", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
                  { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                  { field: "createdAt", header: "Opened", renderCell: v => v ? formatDate(String(v)) : "—" },
                ]}
                queryKey={["clients", "matters", clientId]}
                queryFn={(p: GridParams) => clientsApi.getMatters(String(clientId), p)}
                detailPath={row => `/matters/${String((row as { id?: string; matterId?: string }).matterId ?? (row as { id?: string }).id ?? "")}`}
                rowExpansion={{
                  render: (row) => {
                    const r = row as Record<string, unknown>
                    const subs = Array.isArray(r.subMatters)
                      ? r.subMatters as Record<string, unknown>[]
                      : Array.isArray(r.scopeOfWorks)
                        ? r.scopeOfWorks as Record<string, unknown>[]
                        : []
                    if (!subs.length) {
                      return <Typography variant="body2" color="text.secondary">No SOW / sub-matters</Typography>
                    }
                    return (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, py: 0.5 }}>
                        {subs.map(item => {
                          const sid = String(item.matterId ?? item.id ?? "")
                          const label = `${String(item.title ?? "Sub-matter")} · ${String(item.status ?? "")} · ${String(item.billingType ?? item.scopeOfWork ?? "")}`
                          return sid ? (
                            <Typography
                              key={sid}
                              variant="body2"
                              component="button"
                              onClick={e => {
                                e.stopPropagation()
                                navigate(`/matters/${sid}`)
                              }}
                              sx={{
                                all: "unset",
                                cursor: "pointer",
                                color: "primary.main",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {label}
                            </Typography>
                          ) : (
                            <Typography key={label} variant="body2">{label}</Typography>
                          )
                        })}
                      </Box>
                    )
                  },
                }}
              />
            </Box>
          ),
        },
        ...(canViewAdminDocs ? [{
          label: "Admin Documents",
          content: (
            <Box>
              {canMutate && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setAdminUploadOpen(true)}>
                    Upload Document
                  </Button>
                </Box>
              )}
              <DataGrid
                columns={[
                  { field: "documentName", header: "Document", renderCell: (v, row) => String(v ?? (row as { name?: string }).name ?? "—") },
                  { field: "docType", header: "Type", renderCell: v => String(v || "—") },
                  { field: "uploadedBy", header: "Uploaded By", renderCell: v => String(v || "—") },
                  { field: "uploadedAt", header: "Date", renderCell: (v, row) => formatDate(String(v ?? (row as { createdAt?: string }).createdAt ?? "")) },
                ]}
                queryKey={["clients", "admin-docs", clientId]}
                queryFn={(p: GridParams) => clientsApi.getAdminDocuments(String(clientId), p)}
                zebraStriping
              />
            </Box>
          ),
        }] : []),
        ...(canViewTasks ? [{
          label: "Tasks",
          content: (
            <DataGrid
              columns={[
                { field: "taskName", header: "Task" },
                { field: "taskStatus", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "taskDeadLine", header: "Deadline", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["clients", "tasks", clientId]}
              queryFn={(p: GridParams) => clientsApi.getTasks(String(clientId), p)}
              detailPath={row => `/tasks/${String((row as { id?: string }).id ?? "")}`}
              zebraStriping
            />
          ),
        }] : []),
        ...(canViewTimeLogs ? [{
          label: "Time Logs",
          content: (
            <Box>
              {canMutate && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<TimerOutlinedIcon />} onClick={() => setLogTimeOpen(true)}>
                    Log Time
                  </Button>
                </Box>
              )}
              <DataGrid
                key={timelogGridKey}
                columns={[
                  { field: "activity", header: "Activity" },
                  {
                    field: "totalHours",
                    header: "Hours",
                    align: "right",
                    renderCell: (_v, row) => {
                      const r = row as Record<string, unknown>
                      if (r.totalHours != null) return Number(r.totalHours).toFixed(2)
                      const h = Number(r.hours ?? 0)
                      const m = Number(r.minutes ?? 0)
                      return h || m ? `${h}:${String(m).padStart(2, "0")}h` : "0"
                    },
                  },
                  { field: "billing", header: "Amount", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                  {
                    field: "entryDate",
                    header: "Date",
                    renderCell: (v, row) => {
                      const d = v ?? (row as Record<string, unknown>).createdAt
                      return d ? formatDate(String(d)) : "—"
                    },
                  },
                ]}
                queryKey={["clients", "timelogs", clientId]}
                queryFn={(p: GridParams) => clientsApi.getTimelogs(String(clientId), p)}
                zebraStriping
                hasRowSelection={!isClosed}
                bulkActions={!isClosed ? [{
                  label: "Attach Time Log Entries",
                  icon: <LinkIcon fontSize="small" />,
                  onClick: (selected) => {
                    const ids = selected
                      .map(r => String((r as Record<string, unknown>).activityId ?? (r as Record<string, unknown>).id ?? ""))
                      .filter(Boolean)
                    if (!ids.length) {
                      toast.error("Select at least one time log entry")
                      return
                    }
                    setAttachActivityIds(ids)
                    setAttachTimelogOpen(true)
                  },
                }] : undefined}
              />
            </Box>
          ),
        }] : []),
        ...(canViewLogs ? [{
          label: "Logs",
          content: (
            <DataGrid
              columns={[
                { field: "logType", header: "Type", renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).type ?? "—") },
                { field: "logDec", header: "Title", renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).logTitle ?? (row as Record<string, unknown>).title ?? "—") },
                { field: "createdBy", header: "Created By" },
                { field: "createdAt", header: "Created At", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["clients", "logs", clientId]}
              queryFn={(p: GridParams) => clientsApi.getLogs(String(clientId), p)}
            />
          ),
        }] : []),
        ...(canViewLfa ? [{
          label: "LFA",
          content: (
            <Box>
              {!isClosed && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setLfaOpen(true)}>
                    Add LFA
                  </Button>
                </Box>
              )}
              <DataGrid
                columns={[
                  {
                    field: "agreementNo",
                    header: "LFA No",
                    renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).lfaNo ?? "—"),
                  },
                  {
                    field: "billingType",
                    header: "Type",
                    renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).lfaType ?? "—"),
                  },
                  {
                    field: "lfaStatus",
                    header: "Status",
                    renderCell: (v, row) => <StatusBadge status={String(v ?? (row as Record<string, unknown>).status ?? "")} />,
                  },
                  { field: "createdAt", header: "Created", renderCell: v => v ? formatDate(String(v)) : "—" },
                ]}
                queryKey={["clients", "lfas", clientId]}
                queryFn={(p: GridParams) => clientsApi.getLfas(String(clientId), p)}
                detailPath={row => `/lfa/${String((row as { id?: string }).id ?? "")}`}
                zebraStriping
              />
            </Box>
          ),
        }] : []),
        ...(canViewLeads ? [{
          label: "Leads",
          content: (
            <DataGrid
              columns={[
                { field: "name", header: "Lead", renderCell: (v, row) => String(v ?? (row as { companyName?: string }).companyName ?? "—") },
                { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "practiceArea", header: "Practice Area", renderCell: v => typeof v === "object" && v ? String((v as { name?: string }).name ?? "") : String(v ?? "—") },
                { field: "createdAt", header: "Created", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["clients", "leads", clientId]}
              queryFn={(p: GridParams) => clientsApi.getLeads(String(clientId), p)}
              detailPath={row => `/leads/${String((row as { id?: string }).id ?? "")}`}
              zebraStriping
            />
          ),
        }] : []),
        {
          label: "Mails",
          content: (
            <DataGrid
              columns={[
                {
                  field: "date",
                  header: "Date",
                  renderCell: (v, row) => {
                    const d = v ?? (row as Record<string, unknown>).receivedDate ?? (row as Record<string, unknown>).createdAt
                    return d ? formatDate(String(d)) : "—"
                  },
                },
                { field: "subject", header: "Subject" },
                {
                  field: "from",
                  header: "From",
                  renderCell: v => Array.isArray(v) ? v.join(", ") : String(v || "—"),
                },
                {
                  field: "to",
                  header: "To",
                  renderCell: (v, row) => {
                    const to = v ?? (row as Record<string, unknown>).toRecipients
                    return Array.isArray(to) ? to.join(", ") : String(to || "—")
                  },
                },
                {
                  field: "cc",
                  header: "CC",
                  renderCell: v => Array.isArray(v) ? v.join(", ") : String(v || "—"),
                },
              ]}
              queryKey={["clients", "mails", clientId, clientMailAddresses.join("|")]}
              queryFn={(p: GridParams) => clientsApi.getMails(String(clientId), p, clientMailAddresses)}
              onRowClick={row => {
                const r = row as Record<string, unknown>
                const eid = String(r.internetMessageId ?? r.emailId ?? r.id ?? "")
                if (!eid) return
                navigate(`/matter-mail/${encodeURIComponent(eid)}?_clientId=${encodeURIComponent(String(clientId))}`)
              }}
              zebraStriping
            />
          ),
        },
        {
          label: "Finance Contacts",
          content: (
            <Box>
              {canMutate && (
                <Box sx={{ mb: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openFinanceCreate}>Add Contact</Button>
                </Box>
              )}
              <DataGrid
                columns={[
                  { field: "name", header: "Name" },
                  { field: "email", header: "Email" },
                  { field: "contactNumber", header: "Contact Number" },
                  { field: "primary", header: "Primary", renderCell: v => v ? "Yes" : "No" },
                ]}
                queryKey={["clients", "finance-contacts", clientId]}
                queryFn={(p: GridParams) => clientsApi.getFinanceContacts(String(clientId), p)}
                zebraStriping
                rowMenuItems={row => {
                  if (!canMutate) return []
                  const r = row as Record<string, unknown>
                  return [
                    {
                      label: "Edit",
                      icon: <EditOutlinedIcon fontSize="small" />,
                      onClick: () => openFinanceEdit(r),
                    },
                    {
                      label: "Delete",
                      icon: <DeleteOutlinedIcon fontSize="small" />,
                      color: "error",
                      onClick: () => setDeleteFinanceId(String(r.id ?? "")),
                    },
                  ]
                }}
              />
            </Box>
          ),
        },
        {
          label: "Financials",
          content: (
            <DataGrid
              columns={[
                {
                  field: "taxInvoiceNo",
                  header: "Invoice #",
                  renderCell: (v, row) => String(v ?? (row as Record<string, unknown>).invoiceNo ?? "—"),
                },
                {
                  field: "dueAmount",
                  header: "Total",
                  align: "right",
                  renderCell: (v, row) => formatCurrency(Number(v ?? (row as Record<string, unknown>).taxableAmount ?? 0)),
                },
                { field: "paidAmount", header: "Paid", align: "right", renderCell: v => formatCurrency(Number(v ?? 0)) },
                {
                  field: "balanceAmount",
                  header: "Balance",
                  align: "right",
                  renderCell: (v, row) => {
                    const r = row as Record<string, unknown>
                    const due = Number(r.dueAmount ?? r.taxableAmount ?? 0)
                    const paid = Number(r.paidAmount ?? 0)
                    return formatCurrency(Number(v ?? (due - paid)))
                  },
                },
                {
                  field: "paymentStaus",
                  header: "Status",
                  renderCell: (v, row) => <StatusBadge status={String(v ?? (row as Record<string, unknown>).invoiceStatus ?? "")} />,
                },
                { field: "dueDate", header: "Due", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["clients", "invoices", clientId]}
              queryFn={(p: GridParams) => clientsApi.getInvoices(String(clientId), p)}
              detailPath={row => `/billings/${String((row as { id?: string }).id ?? "")}`}
              zebraStriping
            />
          ),
        },
        ...(c.zohoClientId
          ? [{
              label: "Zoho Outstanding",
              content: <ClientZohoOutstandingTab clientId={String(clientId)} />,
            }]
          : []),
        {
          label: "Documents",
          content: <DocumentsTab relatedTo="CLIENT" relatedToId={String(clientId)} />,
        },
      ]} />

      <ClientFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clientId={clientId}
        onSaved={() => {
          setEditOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          toast.success("Client updated")
        }}
      />
      <FinanceContactDrawer
        open={financeOpen}
        onClose={() => { setFinanceOpen(false); setFinanceContact(null) }}
        clientId={String(clientId)}
        contact={financeContact}
        onSuccess={mode => {
          setFinanceOpen(false)
          setFinanceContact(null)
          qc.invalidateQueries({ queryKey: ["clients", "finance-contacts", clientId] })
          toast.success(mode === "update" ? "Finance contact updated" : "Finance contact added")
        }}
      />
      <AllotBankAccountDrawer
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        clientId={String(clientId)}
        onSuccess={() => {
          setBankOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          toast.success("Bank account allotted")
        }}
      />
      <AssignCreditCategoryDrawer
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        clientId={String(clientId)}
        initialCategory={creditCategories[0] ?? null}
        onSuccess={() => {
          setCreditOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          qc.invalidateQueries({ queryKey: ["clients", "credit-categories", clientId] })
          toast.success("Credit category assigned")
        }}
      />
      <CreateAccountDrawer
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        clientId={String(clientId)}
        defaultUsername={primaryEmail}
        onSuccess={() => {
          setAccountOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          toast.success("Username created")
        }}
      />
      <UploadAdminDocumentDrawer
        open={adminUploadOpen}
        onClose={() => setAdminUploadOpen(false)}
        clientId={String(clientId)}
        onSuccess={() => {
          setAdminUploadOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "admin-docs", clientId] })
          toast.success("Document uploaded")
        }}
      />
      <LfaFormDrawer
        open={lfaOpen}
        onClose={() => setLfaOpen(false)}
        clientId={String(clientId)}
        onSuccess={() => {
          setLfaOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "lfas", clientId] })
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          toast.success("LFA created")
        }}
      />
      <ActivityFormDrawer
        open={logTimeOpen}
        onClose={() => setLogTimeOpen(false)}
        prefillClientId={String(clientId)}
        onSuccess={() => {
          setLogTimeOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "timelogs", clientId] })
          toast.success("Time logged")
        }}
      />
      <AttachTimelogEntriesDialog
        open={attachTimelogOpen}
        onClose={() => {
          setAttachTimelogOpen(false)
          setAttachActivityIds([])
        }}
        clientId={String(clientId)}
        activityIds={attachActivityIds}
        onSuccess={() => {
          setAttachTimelogOpen(false)
          setAttachActivityIds([])
          setTimelogGridKey(k => k + 1)
          void qc.invalidateQueries({ queryKey: ["clients", "timelogs", clientId] })
        }}
      />
      <LeadFormDrawer
        open={addMatterOpen}
        onClose={() => setAddMatterOpen(false)}
        clientId={String(clientId)}
        onSaved={() => {
          setAddMatterOpen(false)
          qc.invalidateQueries({ queryKey: ["clients", "leads", clientId] })
          qc.invalidateQueries({ queryKey: ["clients", "matters", clientId] })
          qc.invalidateQueries({ queryKey: ["clients", "detail", clientId] })
          toast.success("Lead created")
        }}
      />
      <ConfirmDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onConfirm={toggleStatus}
        title={isClosed ? "Activate Client" : "Deactivate Client"}
        message={isClosed ? "Are you sure you want to activate this client?" : "Are you sure you want to deactivate this client?"}
        confirmLabel={isClosed ? "Activate" : "Deactivate"}
        severity={isClosed ? "info" : "warning"}
      />
      <ConfirmDialog
        open={!!deleteFinanceId}
        onClose={() => setDeleteFinanceId(null)}
        onConfirm={() => { void confirmDeleteFinance() }}
        title="Delete Finance Contact"
        message="Are you sure you want to delete this finance contact?"
        confirmLabel="Delete"
        severity="warning"
      />
      <ConfirmDialog
        open={zohoConfirmOpen}
        onClose={() => setZohoConfirmOpen(false)}
        onConfirm={() => { void confirmCreateInZoho() }}
        title="Create in Zoho"
        message="Create this client in Zoho Books?"
        confirmLabel="Create"
        severity="info"
      />
    </PageShell>
  )
}
