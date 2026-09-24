/**
 * Short matter create/edit — LMS AddShortMatter / EditShortMatter parity.
 */
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { adminApi } from "@/api/admin"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { useAuthStore } from "@lib/store/authStore"

interface Props {
  open: boolean
  onClose: () => void
  shortMatterId?: string
  clientId?: string
  onSuccess: () => void
}

type UserMin = {
  id?: string
  firstName?: string
  lastName?: string
  accessPermission?: string
  active?: boolean
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function asBool(v: unknown): boolean {
  return v === true || v === "true"
}

export function ShortMatterFormDrawer({
  open,
  onClose,
  shortMatterId,
  clientId: fixedClientId,
  onSuccess,
}: Props) {
  const isEdit = !!shortMatterId
  const currentUserId = useAuthStore(s => s.user?.id ?? "")

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState(fixedClientId ?? "")
  const [description, setDescription] = useState("")
  const [practiceArea, setPracticeArea] = useState("")
  const [status, setStatus] = useState("OPEN")
  const [openDate, setOpenDate] = useState(todayIso())
  const [billingType, setBillingType] = useState("Fixed")
  const [rate, setRate] = useState("")
  const [taskDeadLine, setTaskDeadLine] = useState(todayIso())
  const [assignTask, setAssignTask] = useState(false) // false = I am responsible (OLD Yes)
  const [responsibleGroup, setResponsibleGroup] = useState("")
  const [responsibleAttorney, setResponsibleAttorney] = useState("")
  const [approval, setApproval] = useState(false)
  const [afterGroup, setAfterGroup] = useState("")
  const [afterTaskApprovalPerson, setAfterTaskApprovalPerson] = useState("")

  const clientsQuery = useQuery({
    queryKey: ["clients", "mini", "short-matter"],
    enabled: open && !fixedClientId,
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{ id: "c1", companyName: "Al Rashid Holdings" }]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return Array.isArray(list) ? list : []
    },
  })

  const practicesQuery = useQuery({
    queryKey: ["practiceAreas", "short-matter"],
    enabled: open,
    queryFn: () => adminApi.getPracticeAreas(),
  })

  const groupsQuery = useQuery({
    queryKey: ["groups", "short-matter"],
    enabled: open,
    queryFn: () => adminApi.getGroups(),
  })

  const usersQuery = useQuery({
    queryKey: ["users", "min", "short-matter"],
    enabled: open,
    queryFn: () => adminApi.getUsersMin(),
  })

  const users = (usersQuery.data ?? []) as UserMin[]
  const groups = (groupsQuery.data ?? []) as { id?: string; name?: string }[]
  const practices = (practicesQuery.data ?? []) as { id?: string; name?: string }[]

  const responsiblePeople = useMemo(() => {
    if (!responsibleGroup) return []
    const filtered = users.filter(u => u.accessPermission === responsibleGroup)
    return filtered.length ? filtered : users
  }, [users, responsibleGroup])

  const approvalPeople = useMemo(() => {
    if (!afterGroup) return []
    const filtered = users.filter(u => u.accessPermission === afterGroup)
    return filtered.length ? filtered : users
  }, [users, afterGroup])

  useEffect(() => {
    if (!open) return
    setError("")
    setTitle("")
    setClientId(fixedClientId ?? "")
    setDescription("")
    setPracticeArea("")
    setStatus("OPEN")
    setOpenDate(todayIso())
    setBillingType("Fixed")
    setRate("")
    setTaskDeadLine(todayIso())
    setAssignTask(false)
    setResponsibleGroup("")
    setResponsibleAttorney("")
    setApproval(false)
    setAfterGroup("")
    setAfterTaskApprovalPerson("")

    if (isEdit && shortMatterId && !env.USE_STATIC_DATA) {
      axiosClient
        .get("/api/matter/get/short/matter", { params: { id: shortMatterId } })
        .then(r => {
          const d = r.data?.data ?? r.data ?? {}
          setTitle(String(d.title ?? ""))
          setClientId(String(d.clientId ?? d.client?.id ?? fixedClientId ?? ""))
          setDescription(String(d.description ?? ""))
          const pa = d.practiceArea
          setPracticeArea(
            typeof pa === "object" && pa
              ? String((pa as { name?: string }).name ?? "")
              : String(pa ?? d.practiceAreaName ?? ""),
          )
          setStatus(String(d.status ?? "OPEN"))
          setOpenDate(String(d.openDate ?? todayIso()).slice(0, 10))
          setBillingType(String(d.billingType ?? "Fixed"))
          setRate(d.rate != null && d.rate !== "" ? String(d.rate) : "")
          setTaskDeadLine(String(d.taskDeadLine ?? todayIso()).slice(0, 10))
          const assign = asBool(d.assignTask)
          setAssignTask(assign)
          setResponsibleGroup(String(d.responsibleGroup ?? ""))
          const att = d.responsibleAttorney
          setResponsibleAttorney(
            typeof att === "object" && att
              ? String((att as { id?: string }).id ?? "")
              : String(att ?? d.responsibleAttorneyId ?? ""),
          )
          const needApproval = asBool(d.approval)
          setApproval(needApproval)
          setAfterGroup(String(d.afterGroup ?? ""))
          setAfterTaskApprovalPerson(String(d.afterTaskApprovalPerson ?? ""))
        })
        .catch(() => {})
    }
  }, [open, shortMatterId, fixedClientId, isEdit])

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!description.trim()) { setError("Description is required"); return }
    if (!clientId) { setError("Client is required"); return }
    if (!practiceArea) { setError("Practice area is required"); return }
    if (!rate.trim() || Number.isNaN(Number(rate))) { setError("Amount is required"); return }
    if (!taskDeadLine) { setError("Deadline is required"); return }
    if (assignTask && !responsibleGroup) { setError("Responsible group is required"); return }
    if (assignTask && !responsibleAttorney) { setError("Responsible person is required"); return }
    if (approval && !afterGroup) { setError("Approval group is required"); return }
    if (approval && !afterTaskApprovalPerson) { setError("Approval person is required"); return }

    setSaving(true)
    setError("")
    try {
      const attorneyId = assignTask
        ? responsibleAttorney
        : (currentUserId || responsibleAttorney)

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        clientId,
        practiceArea,
        status: status || "OPEN",
        openDate: todayIso(),
        billingType: "Fixed",
        rate: Number(rate),
        taskDeadLine,
        assignTask,
        responsibleGroup: assignTask ? responsibleGroup : "",
        responsibleAttorney: attorneyId,
        approval,
        approvalType: "After",
        afterTaskApproval: approval,
        afterGroup: approval ? afterGroup : "",
        afterTaskApprovalPerson: approval ? afterTaskApprovalPerson : "",
        matterType: "Short_Matter",
        location: "",
        scope: "",
        outcome: "",
        strategy: "",
        closeDate: null,
        pendingDate: null,
      }

      if (!env.USE_STATIC_DATA) {
        if (isEdit) {
          await axiosClient.post("/api/matter/edit/short/matter", payload, {
            params: { id: shortMatterId },
          })
        } else {
          await axiosClient.post("/api/matter/short/matter", payload)
        }
      }
      onSuccess()
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save short matter",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Short Matter" : "New Short Matter"}
      onSubmit={() => { void submit() }}
      isSubmitting={saving}
      submitLabel={isEdit ? "Update" : "Create"}
      width={560}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          size="small"
          label="Title"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        {!fixedClientId && (
          <FormControl size="small" fullWidth required>
            <InputLabel>Client</InputLabel>
            <Select label="Client" value={clientId} onChange={e => setClientId(e.target.value)}>
              {((clientsQuery.data ?? []) as { id: string; companyName?: string; firstName?: string }[]).map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.companyName || c.firstName || c.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" fullWidth required>
          <InputLabel>Practice Area</InputLabel>
          <Select label="Practice Area" value={practiceArea} onChange={e => setPracticeArea(e.target.value)}>
            {practices.map(p => (
              <MenuItem key={String(p.id ?? p.name)} value={String(p.name ?? "")}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <MenuItem value="OPEN">OPEN</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Open Date"
          type="date"
          value={openDate}
          onChange={e => setOpenDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          helperText="Saved as today's date on submit (LMS parity)"
        />
        <TextField
          size="small"
          label="Description"
          required
          multiline
          minRows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <FormControl size="small" fullWidth required>
          <InputLabel>Billing Type</InputLabel>
          <Select label="Billing Type" value={billingType} onChange={e => setBillingType(e.target.value)}>
            <MenuItem value="Fixed">Fixed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Amount"
          required
          type="number"
          value={rate}
          onChange={e => setRate(e.target.value)}
        />
        <TextField
          size="small"
          label="Deadline"
          type="date"
          required
          value={taskDeadLine}
          onChange={e => setTaskDeadLine(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <FormControl>
          <FormLabel>Are you responsible for completion?</FormLabel>
          <RadioGroup
            row
            value={assignTask ? "no" : "yes"}
            onChange={e => {
              const self = e.target.value === "yes"
              setAssignTask(!self)
              if (self) {
                setResponsibleGroup("")
                setResponsibleAttorney("")
              }
            }}
          >
            <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </FormControl>

        {assignTask && (
          <>
            <FormControl size="small" fullWidth required>
              <InputLabel>Group</InputLabel>
              <Select
                label="Group"
                value={responsibleGroup}
                onChange={e => {
                  setResponsibleGroup(e.target.value)
                  setResponsibleAttorney("")
                }}
              >
                {groups.map(g => (
                  <MenuItem key={String(g.id)} value={String(g.id)}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel>Responsible Person</InputLabel>
              <Select
                label="Responsible Person"
                value={responsibleAttorney}
                onChange={e => setResponsibleAttorney(e.target.value)}
              >
                {responsiblePeople.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}

        <FormControl>
          <FormLabel>Need Approval?</FormLabel>
          <RadioGroup
            row
            value={approval ? "yes" : "no"}
            onChange={e => {
              const yes = e.target.value === "yes"
              setApproval(yes)
              if (!yes) {
                setAfterGroup("")
                setAfterTaskApprovalPerson("")
              }
            }}
          >
            <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </FormControl>

        {approval && (
          <>
            <FormControl size="small" fullWidth required>
              <InputLabel>Approval Group</InputLabel>
              <Select
                label="Approval Group"
                value={afterGroup}
                onChange={e => {
                  setAfterGroup(e.target.value)
                  setAfterTaskApprovalPerson("")
                }}
              >
                {groups.map(g => (
                  <MenuItem key={String(g.id)} value={String(g.id)}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth required>
              <InputLabel>Approval Person</InputLabel>
              <Select
                label="Approval Person"
                value={afterTaskApprovalPerson}
                onChange={e => setAfterTaskApprovalPerson(e.target.value)}
              >
                {approvalPeople.map(u => (
                  <MenuItem key={String(u.id)} value={String(u.id)}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      </Box>
    </FormDrawer>
  )
}
