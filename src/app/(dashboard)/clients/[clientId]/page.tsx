import { useState } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, Paper, Avatar, Chip, Button } from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import LockIcon from "@mui/icons-material/Lock"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { clientsApi } from "@/api/clients"
import { PageShell } from "@/components/ui/PageShell"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DetailSkeleton } from "@/components/ui/Skeletons"
import { Tabs } from "@/components/ui/Tabs"
import { DataGrid } from "@/components/data-grid/DataGrid"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ClientFormDrawer } from "../_components/ClientFormDrawer"
import { formatDate } from "@lib/utils/formatDate"
import { formatCurrency } from "@lib/utils/formatCurrency"
import { toast } from "@/lib/toast"
import { logger } from "@/lib/logger"
import { useAuthStore } from "@lib/store/authStore"
import type { GridParams } from "@/types/common.types"
import type { Client } from "@/transformers/client.transformer"

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>{value ?? "—"}</Typography>
    </Box>
  )
}

export default function ClientDetailPage() {
  const { clientId } = useParams()
  const qc = useQueryClient()
  const canEdit = useAuthStore(s => s.hasPermission)("/clients")
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

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

  if (isLoading) return <PageShell title="Client"><DetailSkeleton /></PageShell>
  if (isError || !client) {
    return (
      <PageShell title="Client" breadcrumbs={[{ label: "Clients", path: "/clients" }, { label: "Not found" }]}>
        <Typography color="text.secondary">Client not found.</Typography>
      </PageShell>
    )
  }

  const c = client as Client
  const name = c.name || "Client"
  const isClosed = c.status === "CLOSE"
  const revenue = (revenueQuery.data ?? {}) as { billed?: number; collected?: number; outstanding?: number }

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

  return (
    <PageShell
      title={name}
      description={`Client • ${c.clientType}`}
      breadcrumbs={[{ label: "Clients", path: "/clients" }, { label: name }]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {canEdit && !isClosed && (
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
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Contact</Typography>
                <InfoRow label="Emails" value={c.emails.join(", ") || "—"} />
                <InfoRow label="Phones" value={c.phones.join(", ") || "—"} />
                <InfoRow label="Address" value={c.address || "—"} />
                <InfoRow
                  label="Nationality"
                  value={c.nationality.length ? (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {c.nationality.map(item => <Chip key={item} size="small" label={item} variant="outlined" />)}
                    </Box>
                  ) : "—"}
                />
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Details</Typography>
                <InfoRow label="Client ID" value={c.clientExternalId || "—"} />
                <InfoRow label="Type" value={c.clientType} />
                <InfoRow label="Username" value={c.username || "—"} />
                <InfoRow label="Group" value={c.groupName || "—"} />
                <InfoRow label="Bank Account" value={c.bankAccount || "—"} />
                <InfoRow label="Last Activity" value={c.lastActivityDate ? formatDate(c.lastActivityDate) : "—"} />
                <InfoRow label="Created" value={formatDate(c.createdAt)} />
                <InfoRow label="Collected" value={formatCurrency(Number(revenue.collected ?? 0))} />
                <InfoRow label="Outstanding" value={formatCurrency(Number(revenue.outstanding ?? 0))} />
              </Paper>
            </Box>
          ),
        },
        {
          label: "Matters",
          content: (
            <DataGrid
              columns={[
                { field: "title", header: "Title" },
                { field: "practiceArea", header: "Practice Area", renderCell: v => typeof v === "object" && v ? String((v as { name?: string }).name ?? "") : String(v ?? "—") },
                { field: "billingType", header: "Billing", renderCell: v => <Chip size="small" label={String(v ?? "")} variant="outlined" /> },
                { field: "status", header: "Status", renderCell: v => <StatusBadge status={String(v ?? "")} /> },
                { field: "createdAt", header: "Opened", renderCell: v => v ? formatDate(String(v)) : "—" },
              ]}
              queryKey={["clients", "matters", clientId]}
              queryFn={(p: GridParams) => clientsApi.getMatters(String(clientId), p)}
              detailPath={row => `/matters/${String((row as { id?: string; matterId?: string }).matterId ?? (row as { id?: string }).id ?? "")}`}
            />
          ),
        },
        {
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
            />
          ),
        },
        {
          label: "Time Logs",
          content: (
            <DataGrid
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
            />
          ),
        },
        {
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
        },
        {
          label: "LFA",
          content: (
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
            />
          ),
        },
        {
          label: "Finance Contacts",
          content: (
            <DataGrid
              columns={[
                { field: "name", header: "Name" },
                { field: "email", header: "Email" },
                { field: "contactNumber", header: "Contact Number" },
                { field: "primary", header: "Primary", renderCell: v => v ? "Yes" : "No" },
              ]}
              queryKey={["clients", "finance-contacts", clientId]}
              queryFn={(p: GridParams) => clientsApi.getFinanceContacts(String(clientId), p)}
            />
          ),
        },
        {
          label: "Invoices",
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
            />
          ),
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
      <ConfirmDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onConfirm={toggleStatus}
        title={isClosed ? "Activate Client" : "Deactivate Client"}
        message={isClosed ? "Are you sure you want to activate this client?" : "Are you sure you want to deactivate this client?"}
        confirmLabel={isClosed ? "Activate" : "Deactivate"}
        severity={isClosed ? "info" : "warning"}
      />
    </PageShell>
  )
}
