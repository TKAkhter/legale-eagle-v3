import { useEffect, useMemo, useState } from "react"
import { Alert } from "@mui/material"
import { useForm, useWatch } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { FormDrawer } from "@components/ui/FormDrawer"
import { FormSection } from "@components/forms/FormSection"
import { ControlledInput } from "@components/forms/ControlledInput"
import { ControlledSelect } from "@components/forms/ControlledSelect"
import { axiosClient } from "@lib/api/axios"
import { env } from "@/config/env"
import { toast } from "@/lib/toast"
import {
  calendarEventsApi,
  formatCalendarDateTime,
  type CalendarEventRow,
} from "@/api/calendarEvents"

type FormValues = {
  title: string
  eventType: "" | "MATTER" | "LEAD"
  clients: string
  meetingWith: string
  location: string
  start: string
  end: string
  note: string
}

function toDatetimeLocal(value?: string | Date | null): string {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value.replace(" ", "T")) : value
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultRange(initialDate?: string): { start: string; end: string } {
  const base = initialDate ? new Date(`${initialDate}T09:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) {
    const now = new Date()
    const end = new Date(now.getTime() + 60 * 60 * 1000)
    return { start: toDatetimeLocal(now), end: toDatetimeLocal(end) }
  }
  const end = new Date(base.getTime() + 60 * 60 * 1000)
  return { start: toDatetimeLocal(base), end: toDatetimeLocal(end) }
}

function leadLabel(l: Record<string, unknown>): string {
  const name = [l.firstName, l.middleName, l.lastName].filter(Boolean).join(" ").trim()
  return name || String(l.companyName ?? l.id ?? "Lead")
}

function clientLabel(c: Record<string, unknown>): string {
  if (c.clientType === "PERSON") {
    return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || String(c.id)
  }
  return String(c.companyName ?? c.name ?? c.displayName ?? c.id)
}

export function CalendarEventFormDrawer({
  open,
  onClose,
  onSuccess,
  initialDate,
  event,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialDate?: string
  event?: CalendarEventRow | null
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isEdit = Boolean(event?.id)
  const isSyncedMeeting = event?.meeting === true

  const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      title: "",
      eventType: "",
      clients: "",
      meetingWith: "",
      location: "",
      start: "",
      end: "",
      note: "",
    },
  })

  const eventType = useWatch({ control, name: "eventType" })
  const clientId = useWatch({ control, name: "clients" })

  useEffect(() => {
    if (!open) {
      reset()
      setSubmitError(null)
      return
    }
    if (event?.id) {
      reset({
        title: String(event.title ?? ""),
        eventType: (event.eventType === "LEAD" || event.eventType === "MATTER" ? event.eventType : "") as FormValues["eventType"],
        clients: String(event.clientId ?? ""),
        meetingWith: String(event.eventWith ?? ""),
        location: String(event.location ?? ""),
        start: toDatetimeLocal(event.startDateTime),
        end: toDatetimeLocal(event.endDateTime),
        note: String(event.note ?? ""),
      })
      return
    }
    const range = defaultRange(initialDate)
    reset({
      title: "",
      eventType: "",
      clients: "",
      meetingWith: "",
      location: "",
      start: range.start,
      end: range.end,
      note: "",
    })
  }, [open, event, initialDate, reset])

  // Cascade: clearing type/client resets meetingWith (OLD resetField behavior)
  // handled by EventTypeCascade below

  const { data: clients = [] } = useQuery({
    queryKey: ["calendar", "clients"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "c1", companyName: "Al Rashid Holdings", clientType: "COMPANY" },
          { id: "c2", companyName: "KM Group", clientType: "COMPANY" },
        ]
      }
      const r = await axiosClient.get("/api/client/get/by/company")
      return r.data?.data ?? r.data ?? []
    },
    enabled: open && eventType === "MATTER",
  })

  const { data: matters = [] } = useQuery({
    queryKey: ["calendar", "matters", clientId],
    queryFn: async () => {
      if (!clientId) return []
      if (env.USE_STATIC_DATA) {
        return [
          { id: "m1", title: "260303 — Building Dispute" },
          { id: "m2", title: "260293 — Employment" },
        ]
      }
      const r = await axiosClient.get("/api/matter/list/by/client", { params: { clientId } })
      return r.data?.data ?? r.data ?? []
    },
    enabled: open && eventType === "MATTER" && !!clientId,
  })

  const { data: leads = [] } = useQuery({
    queryKey: ["calendar", "leads"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          { id: "l1", firstName: "Omar", middleName: "", lastName: "Hassan", currentStatus: "Open", writeOff: false },
        ]
      }
      const r = await axiosClient.get("/api/leads/get")
      const list = r.data?.data ?? r.data ?? []
      return (Array.isArray(list) ? list : []).filter(
        (o: Record<string, unknown>) => o.currentStatus !== "Converted" && o.writeOff !== true,
      )
    },
    enabled: open && eventType === "LEAD",
  })

  const clientOpts = useMemo(
    () => (clients as Record<string, unknown>[]).map(c => ({
      value: String(c.id),
      label: clientLabel(c),
    })),
    [clients],
  )
  const matterOpts = useMemo(
    () => (matters as Record<string, unknown>[]).map(m => ({
      value: String(m.id ?? m.matterId ?? ""),
      label: String(m.title ?? m.matterTitle ?? m.id ?? ""),
    })),
    [matters],
  )
  const leadOpts = useMemo(
    () => (leads as Record<string, unknown>[]).map(l => ({
      value: String(l.id),
      label: leadLabel(l),
    })),
    [leads],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    if (isSyncedMeeting) {
      setSubmitError("Synced Outlook meetings cannot be edited here.")
      return
    }
    if (!data.title.trim()) {
      setSubmitError("Title is required")
      return
    }
    if (!data.eventType) {
      setSubmitError("Event type is required")
      return
    }
    if (!data.meetingWith) {
      setSubmitError(data.eventType === "MATTER" ? "Matter is required" : "Lead is required")
      return
    }
    if (!data.start || !data.end) {
      setSubmitError("Start and end times are required")
      return
    }
    const start = new Date(data.start)
    const end = new Date(data.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setSubmitError("Invalid date")
      return
    }
    if (end < start) {
      setSubmitError("End time can't be before start time")
      return
    }

    const payload = {
      title: data.title.trim(),
      eventType: data.eventType,
      meetingWith: data.meetingWith,
      location: data.location.trim(),
      startDateTime: formatCalendarDateTime(start),
      endDateTime: formatCalendarDateTime(end),
      note: data.note.trim(),
      remainder: true,
    }

    try {
      if (isEdit && event?.id) {
        toast.success(await calendarEventsApi.update(event.id, payload))
      } else {
        toast.success(await calendarEventsApi.create(payload))
      }
      onSuccess?.()
      onClose()
    } catch (e: unknown) {
      setSubmitError(
        (e as { response?: { data?: { Msg?: string; message?: string } } })?.response?.data?.Msg
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? "Failed to save event",
      )
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Event Details" : "New Event"}
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEdit ? "Save" : "Create"}
      hideSubmit={isSyncedMeeting}
      width={480}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>
      )}
      {isSyncedMeeting && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This event is linked to an Outlook meeting and cannot be edited here.
        </Alert>
      )}
      <FormSection title="Event">
        <ControlledInput name="title" control={control} label="Title" required disabled={isSyncedMeeting} />
        <ControlledSelect
          name="eventType"
          control={control}
          label="Event Type"
          required
          disabled={isSyncedMeeting}
          options={[
            { value: "MATTER", label: "Matter" },
            { value: "LEAD", label: "Lead" },
          ]}
        />
        {/* Watcher side-effect: when type changes away from current, clear dependent fields */}
        <EventTypeCascade
          eventType={eventType}
          clientId={clientId}
          setValue={setValue}
          disabled={isSyncedMeeting || isEdit}
        />
        {eventType === "MATTER" && (
          <>
            <ControlledSelect
              name="clients"
              control={control}
              label="Client"
              disabled={isSyncedMeeting}
              options={clientOpts}
            />
            <ControlledSelect
              name="meetingWith"
              control={control}
              label="Matter"
              required
              disabled={isSyncedMeeting || !clientId}
              options={matterOpts}
            />
          </>
        )}
        {eventType === "LEAD" && (
          <ControlledSelect
            name="meetingWith"
            control={control}
            label="Lead"
            required
            disabled={isSyncedMeeting}
            options={leadOpts}
          />
        )}
        <ControlledInput
          name="start"
          control={control}
          label="Start"
          type="datetime-local"
          required
          disabled={isSyncedMeeting}
        />
        <ControlledInput
          name="end"
          control={control}
          label="End"
          type="datetime-local"
          required
          disabled={isSyncedMeeting}
        />
        <ControlledInput name="location" control={control} label="Location" disabled={isSyncedMeeting} />
        <ControlledInput name="note" control={control} label="Note" multiline rows={2} disabled={isSyncedMeeting} />
      </FormSection>
    </FormDrawer>
  )
}

/** Clears meetingWith when event type or client changes (create mode). */
function EventTypeCascade({
  eventType,
  clientId,
  setValue,
  disabled,
}: {
  eventType: string
  clientId: string
  setValue: (name: keyof FormValues, value: string) => void
  disabled: boolean
}) {
  const [prevType, setPrevType] = useState(eventType)
  const [prevClient, setPrevClient] = useState(clientId)

  useEffect(() => {
    if (disabled) return
    if (prevType !== eventType) {
      setValue("meetingWith", "")
      setValue("clients", "")
      setPrevType(eventType)
    }
  }, [eventType, prevType, setValue, disabled])

  useEffect(() => {
    if (disabled) return
    if (prevClient !== clientId) {
      setValue("meetingWith", "")
      setPrevClient(clientId)
    }
  }, [clientId, prevClient, setValue, disabled])

  return null
}
