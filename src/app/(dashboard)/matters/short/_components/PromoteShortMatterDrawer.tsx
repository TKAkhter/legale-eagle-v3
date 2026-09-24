/**
 * Promote short → long matter — LMS MoveShortMatter parity.
 */
import { useEffect, useState } from "react"
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"

interface Props {
  open: boolean
  onClose: () => void
  shortMatter: Record<string, unknown> | null
  onSuccess: () => void
}

type Party = {
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  relation: string
  partyOpposingType: string
}

const emptyParty = (): Party => ({
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  phone: "",
  relation: "",
  partyOpposingType: "",
})

export function PromoteShortMatterDrawer({ open, onClose, shortMatter, onSuccess }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [openDate, setOpenDate] = useState("")
  const [practiceArea, setPracticeArea] = useState("")
  const [billingType, setBillingType] = useState("Hourly")
  const [attorneyId, setAttorneyId] = useState("")
  const [scope, setScope] = useState("")
  const [outcome, setOutcome] = useState("")
  const [strategy, setStrategy] = useState("")
  const [party, setParty] = useState<Party>(emptyParty())
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const usersQuery = useQuery({
    queryKey: ["users", "min", "promote-short"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  const practicesQuery = useQuery({
    queryKey: ["practiceAreas", "promote-short"],
    enabled: open,
    queryFn: () => adminApi.getPracticeAreas(),
  })

  useEffect(() => {
    if (!open || !shortMatter) return
    setTitle(String(shortMatter.title ?? shortMatter.matterTitle ?? ""))
    setDescription(String(shortMatter.description ?? ""))
    setOpenDate(String(shortMatter.openDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10))
    const pa = shortMatter.practiceArea
    setPracticeArea(
      typeof pa === "object" && pa
        ? String((pa as { name?: string }).name ?? "")
        : String(pa ?? shortMatter.practiceAreaName ?? ""),
    )
    setBillingType(String(shortMatter.billingType ?? "Hourly"))
    setAttorneyId(String(
      (shortMatter.responsibleAttorney as { id?: string } | undefined)?.id
      ?? shortMatter.responsibleAttorneyId
      ?? "",
    ))
    setScope(String(shortMatter.scope ?? ""))
    setOutcome(String(shortMatter.outcome ?? ""))
    setStrategy(String(shortMatter.strategy ?? ""))
    const existing = Array.isArray(shortMatter.partyOpposing)
      ? (shortMatter.partyOpposing[0] as Partial<Party> | undefined)
      : undefined
    setParty({
      ...emptyParty(),
      firstName: String(existing?.firstName ?? ""),
      lastName: String(existing?.lastName ?? ""),
      middleName: String(existing?.middleName ?? ""),
      email: String(existing?.email ?? ""),
      phone: String(existing?.phone ?? ""),
      relation: String(existing?.relation ?? ""),
      partyOpposingType: String(existing?.partyOpposingType ?? ""),
    })
    setError("")
  }, [open, shortMatter])

  async function submit() {
    if (!shortMatter?.id) return
    if (!title.trim()) { setError("Title is required"); return }
    if (!description.trim()) { setError("Description is required"); return }
    if (!openDate) { setError("Open date is required"); return }
    if (!practiceArea) { setError("Practice area is required"); return }
    if (!attorneyId) { setError("Responsible attorney is required"); return }
    if (!billingType) { setError("Billing type is required"); return }
    if (!party.firstName.trim()) { setError("Opposing party first name is required"); return }

    setSaving(true)
    setError("")
    try {
      const clientId = String(
        shortMatter.clientId
        ?? (shortMatter.client as { id?: string } | undefined)?.id
        ?? "",
      )
      const lawsRaw = shortMatter.laws
      const laws = Array.isArray(lawsRaw)
        ? lawsRaw.map((l: unknown) => {
            if (typeof l === "object" && l && "id" in l) return String((l as { id: string }).id)
            return String(l)
          })
        : []

      if (!env.USE_STATIC_DATA) {
        await axiosClient.put(`/api/matter/update/v2/${String(shortMatter.id)}`, {
          ...shortMatter,
          title: title.trim(),
          description: description.trim(),
          openDate,
          practiceArea,
          billingType,
          responsibleAttorney: attorneyId,
          clientId,
          scope,
          outcome,
          strategy,
          matterType: "Long_Matter",
          partyOpposing: [party],
          laws,
        })
      }
      onSuccess()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to promote short matter",
      )
    } finally {
      setSaving(false)
    }
  }

  const users = (usersQuery.data ?? []) as {
    id?: string
    firstName?: string
    lastName?: string
    companyUserType?: string
  }[]
  const practices = (practicesQuery.data ?? []) as { id?: string; name?: string }[]

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Promote to Long Matter"
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel="Promote"
      width={560}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField size="small" label="Title" required value={title} onChange={e => setTitle(e.target.value)} />
        <TextField
          size="small"
          label="Description"
          required
          multiline
          minRows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <TextField
          size="small"
          label="Open Date"
          type="date"
          required
          value={openDate}
          onChange={e => setOpenDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControl size="small" fullWidth required>
          <InputLabel>Practice Area</InputLabel>
          <Select label="Practice Area" value={practiceArea} onChange={e => setPracticeArea(e.target.value)}>
            {practices.map(p => (
              <MenuItem key={String(p.id ?? p.name)} value={String(p.name ?? "")}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            {["Hourly", "Fixed", "Session", "Contingent", "NonContingent"].map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth required>
          <InputLabel>Responsible Attorney</InputLabel>
          <Select label="Responsible Attorney" value={attorneyId} onChange={e => setAttorneyId(e.target.value)}>
            {users.filter(u => !u.companyUserType || u.companyUserType === "ATTORNEY").map(u => (
              <MenuItem key={String(u.id)} value={String(u.id)}>
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" label="Scope" multiline minRows={2} value={scope} onChange={e => setScope(e.target.value)} />
        <TextField size="small" label="Outcome" multiline minRows={2} value={outcome} onChange={e => setOutcome(e.target.value)} />
        <TextField size="small" label="Strategy" multiline minRows={2} value={strategy} onChange={e => setStrategy(e.target.value)} />
        <TextField
          size="small"
          label="Opposing Party First Name"
          required
          value={party.firstName}
          onChange={e => setParty(p => ({ ...p, firstName: e.target.value }))}
        />
        <TextField
          size="small"
          label="Opposing Party Last Name"
          value={party.lastName}
          onChange={e => setParty(p => ({ ...p, lastName: e.target.value }))}
        />
        <TextField
          size="small"
          label="Opposing Party Email"
          value={party.email}
          onChange={e => setParty(p => ({ ...p, email: e.target.value }))}
        />
        <TextField
          size="small"
          label="Opposing Party Phone"
          value={party.phone}
          onChange={e => setParty(p => ({ ...p, phone: e.target.value }))}
        />
      </Box>
    </FormDrawer>
  )
}
