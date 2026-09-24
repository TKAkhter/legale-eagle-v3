import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Step, StepLabel, Stepper, TextField, Typography, FormControl, InputLabel, MenuItem, Select,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { QK } from "@lib/query/keys"
import { toast } from "@/lib/toast"

interface Props { open: boolean; onClose: () => void; leadId: string; leadName: string }

const STEPS = ["Select Client", "Review Client", "Create / Select LFA", "Review & Convert"]

export function LeadConvertDialog({ open, onClose, leadId, leadName }: Props) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [clientMode, setClientMode] = useState<"existing" | "new">("new")
  const [clientId, setClientId] = useState("")
  const [companyName, setCompanyName] = useState(leadName)
  const [matterTitle, setMatterTitle] = useState("")
  const [billingType, setBillingType] = useState("Hourly")
  const [lfaId, setLfaId] = useState("")
  const [lfaMode, setLfaMode] = useState<"existing" | "new">("new")

  const clientsQuery = useQuery({
    queryKey: ["clients", "min", "convert"],
    enabled: open && clientMode === "existing",
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "c1", companyName: "Al Rashid Holdings" }, { id: "c2", companyName: "KM Group" }]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  const lfasQuery = useQuery({
    queryKey: ["lfa", "convert", clientId],
    enabled: open && lfaMode === "existing" && !!clientId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "lfa1", agreementNo: "LFA-001", billingType: "Hourly" }]
      }
      const res = await axiosClient.get("/api/lfa/get/only/client", { params: { clientId, matterId: "" } })
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  useEffect(() => {
    if (open) {
      setStep(0)
      setError("")
      setDone(false)
      setClientMode("new")
      setClientId("")
      setCompanyName(leadName)
      setMatterTitle("")
      setBillingType("Hourly")
      setLfaId("")
      setLfaMode("new")
    }
  }, [open, leadName])

  function canNext() {
    if (step === 0) return clientMode === "new" ? !!companyName.trim() : !!clientId
    if (step === 1) return true
    if (step === 2) return lfaMode === "new" ? !!billingType : !!lfaId
    return true
  }

  async function convert() {
    setLoading(true)
    setError("")
    try {
      if (!env.USE_STATIC_DATA) {
        await axiosClient.post("/api/leads/convert", {
          leadId,
          clientId: clientMode === "existing" ? clientId : undefined,
          createClient: clientMode === "new",
          client: clientMode === "new" ? { companyName, clientType: "COMPANY" } : undefined,
          lfaId: lfaMode === "existing" ? lfaId : undefined,
          createLfa: lfaMode === "new",
          matter: { title: matterTitle || companyName || leadName, billingType },
          transferConfirmation: true,
        })
      } else {
        await new Promise(r => setTimeout(r, 400))
      }
      qc.invalidateQueries({ queryKey: QK.leads.all() })
      qc.invalidateQueries({ queryKey: QK.clients.all() })
      qc.invalidateQueries({ queryKey: QK.matters.all() })
      setDone(true)
      toast.success("Lead converted")
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string; Msg?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Conversion failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep(0)
    setDone(false)
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Convert Lead</DialogTitle>
      <DialogContent>
        {done ? (
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography variant="h6" sx={{ color: "success.main", fontWeight: 600, mb: 1 }}>Conversion successful</Typography>
            <Typography color="text.secondary">“{leadName}” is now a client with a matter.</Typography>
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
              {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Lead: <strong>{leadName}</strong>
            </Typography>

            {step === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControl size="small">
                  <InputLabel>Client</InputLabel>
                  <Select label="Client" value={clientMode} onChange={e => setClientMode(e.target.value as "existing" | "new")}>
                    <MenuItem value="new">Create new client</MenuItem>
                    <MenuItem value="existing">Use existing client</MenuItem>
                  </Select>
                </FormControl>
                {clientMode === "new" ? (
                  <TextField size="small" label="Company / Client Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                ) : (
                  <FormControl size="small">
                    <InputLabel>Select Client</InputLabel>
                    <Select label="Select Client" value={clientId} onChange={e => setClientId(e.target.value)}>
                      {((clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string }[]).map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.companyName || c.firstName || c.id}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

            {step === 1 && (
              <Alert severity="info">
                {clientMode === "new"
                  ? `A new client “${companyName}” will be created from this lead.`
                  : `Existing client will be linked for conversion.`}
              </Alert>
            )}

            {step === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField size="small" label="Matter Title" value={matterTitle} onChange={e => setMatterTitle(e.target.value)} placeholder={companyName || leadName} />
                <FormControl size="small">
                  <InputLabel>LFA</InputLabel>
                  <Select label="LFA" value={lfaMode} onChange={e => setLfaMode(e.target.value as "existing" | "new")}>
                    <MenuItem value="new">Create new LFA</MenuItem>
                    <MenuItem value="existing" disabled={clientMode === "new" && !clientId}>Select existing LFA</MenuItem>
                  </Select>
                </FormControl>
                {lfaMode === "new" ? (
                  <FormControl size="small">
                    <InputLabel>Billing Type</InputLabel>
                    <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
                      {["Hourly", "Fixed", "Session", "Contingent", "NonContingent", "NoAgreement"].map(t => (
                        <MenuItem key={t} value={t}>{t}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <FormControl size="small">
                    <InputLabel>Select LFA</InputLabel>
                    <Select label="Select LFA" value={lfaId} onChange={e => setLfaId(e.target.value)}>
                      {((lfasQuery.data ?? []) as { id: string; agreementNo?: string; billingType?: string }[]).map(l => (
                        <MenuItem key={l.id} value={l.id}>{l.agreementNo || l.id} · {l.billingType}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

            {step === 3 && (
              <Alert severity="warning">
                Confirm conversion: client ({clientMode === "new" ? companyName : "selected"}), matter “{matterTitle || companyName || leadName}”, billing {billingType}.
              </Alert>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        {done ? (
          <Button variant="contained" onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={loading}>Cancel</Button>
            {step > 0 && <Button onClick={() => setStep(s => s - 1)} disabled={loading}>Back</Button>}
            {step < STEPS.length - 1 ? (
              <Button variant="contained" disabled={!canNext() || loading} onClick={() => setStep(s => s + 1)}>Next</Button>
            ) : (
              <Button variant="contained" color="success" disabled={loading || !canNext()} onClick={convert}>
                {loading ? "Converting…" : "Convert"}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
