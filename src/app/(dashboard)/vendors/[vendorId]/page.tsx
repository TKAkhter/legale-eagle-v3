import { useNavigate, useParams } from "react-router-dom"
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Paper, Typography,
} from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import EditIcon from "@mui/icons-material/Edit"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { PageShell } from "@/components/ui/PageShell"
import { vendorsApi } from "@/api/vendors"
import { toast } from "@/lib/toast"
import { formatAddress } from "../_components/vendorFormModel"

export default function VendorDetailPage() {
  const { vendorId = "" } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [toggling, setToggling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", vendorId],
    queryFn: () => vendorsApi.getById(vendorId),
    enabled: !!vendorId,
  })

  const v = (data ?? {}) as Record<string, unknown>
  const contacts = (v.contactPersons ?? []) as Record<string, unknown>[]
  const primary = contacts.find(c => c.primary) ?? contacts[0]
  const additional = contacts.filter(c => c !== primary)
  const active = v.active !== false
  const zohoId = v.zohoVendorId ?? v.zohoId

  async function toggleStatus() {
    setToggling(true)
    try {
      toast.success(await vendorsApi.setStatus(vendorId, !active))
      qc.invalidateQueries({ queryKey: ["vendors"] })
      setConfirmOpen(false)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? "Failed to update status")
    } finally {
      setToggling(false)
    }
  }

  return (
    <PageShell
      title={String(v.displayName ?? v.companyName ?? "Vendor")}
      description={String(v.companyName ?? "")}
      breadcrumbs={[
        { label: "Vendors", path: "/vendors" },
        { label: String(v.displayName ?? vendorId) },
      ]}
      action={(
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/vendors")}>Back</Button>
          <Button variant="outlined" disabled={toggling} onClick={() => setConfirmOpen(true)}>
            {active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/vendors?edit=${vendorId}`)}>
            Edit
          </Button>
        </Box>
      )}
    >
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Details</Typography>
          <DetailRow label="Display Name" value={String(v.displayName ?? "—")} />
          <DetailRow label="Company" value={String(v.companyName ?? "—")} />
          <DetailRow label="Type" value={String(v.vendorType ?? "—")} />
          <DetailRow label="TRN" value={String(v.trnNo || "—")} />
          <DetailRow
            label="Status"
            value={<Chip size="small" label={active ? "Active" : "Inactive"} color={active ? "success" : "default"} variant="outlined" />}
          />
          {zohoId != null && String(zohoId) !== "" && (
            <DetailRow label="Zoho Vendor" value={String(zohoId)} />
          )}
          <DetailRow label="Note" value={String(v.note || "—")} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Addresses</Typography>
          <DetailRow label="Billing" value={formatAddress(v.billingAddress)} />
          <DetailRow label="Shipping" value={formatAddress(v.shippingAddress)} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Primary Contact</Typography>
          {!primary ? (
            <Typography color="text.secondary" variant="body2">No primary contact.</Typography>
          ) : (
            <ContactBlock contact={primary} />
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Additional Contacts</Typography>
          {additional.length === 0 ? (
            <Typography color="text.secondary" variant="body2">No additional contacts.</Typography>
          ) : additional.map((c, i) => (
            <Box
              key={i}
              sx={{
                mb: 1.5,
                pb: 1.5,
                borderBottom: i < additional.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <ContactBlock contact={c} />
            </Box>
          ))}
        </Paper>
      </Box>

      <Dialog open={confirmOpen} onClose={() => !toggling && setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{active ? "Deactivate Vendor" : "Activate Vendor"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {active
              ? `Deactivate “${String(v.displayName ?? v.companyName)}”? They will be hidden from active lists.`
              : `Activate “${String(v.displayName ?? v.companyName)}”?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={toggling} onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={toggling} onClick={() => { void toggleStatus() }}>
            {active ? "Deactivate" : "Activate"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  )
}

function ContactBlock({ contact }: { contact: Record<string, unknown> }) {
  const email = contact.email
  const phone = contact.phone
  const emailStr = typeof email === "string" ? email : String((email as { emailId?: string })?.emailId ?? "—")
  const phoneObj = phone && typeof phone === "object" ? phone as { codeNo?: string; phoneNo?: string } : null
  const phoneStr = typeof phone === "string"
    ? phone
    : phoneObj
      ? `${phoneObj.codeNo ?? ""} ${phoneObj.phoneNo ?? ""}`.trim() || "—"
      : "—"
  return (
    <>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {`${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "—"}
      </Typography>
      <Typography variant="body2" color="text.secondary">{emailStr}</Typography>
      <Typography variant="body2" color="text.secondary">{phoneStr}</Typography>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" component="div" sx={{ textAlign: "right" }}>{value}</Typography>
    </Box>
  )
}
