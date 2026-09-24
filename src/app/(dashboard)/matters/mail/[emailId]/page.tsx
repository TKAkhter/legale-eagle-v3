import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Skeleton, Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { formatDate } from "@lib/utils/formatDate"
import { mattersApi } from "@/api/matters"
import { emailApi } from "@/api/email"

function decodeEmailId(raw: string): string {
  const text = String(raw || "").trim()
  if (!text) return ""
  try {
    const normalized = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")
    return decodeURIComponent(
      Array.from(atob(normalized), c => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    )
  } catch {
    try {
      const normalized = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")
      return atob(normalized)
    } catch {
      return text
    }
  }
}

function asList(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).filter(Boolean).join(", ") || "—"
  return String(v ?? "—") || "—"
}

type ThreadMsg = {
  id: string
  subject: string
  from: string
  to: string
  cc: string
  body: string
  date: string
  webLink: string
}

/** LMS /matter-mail/:id — conversation thread for a matter-linked email. */
export default function MatterMailPage() {
  const navigate = useNavigate()
  const { emailId: rawId = "" } = useParams<{ emailId: string }>()
  const [search] = useSearchParams()
  const matterId = search.get("_matterId") || search.get("matterId") || ""
  const emailId = decodeURIComponent(rawId)
  const internetMessageId = useMemo(() => decodeEmailId(emailId), [emailId])
  const [expanded, setExpanded] = useState<string | false>(false)

  const { data: thread = [], isLoading: graphLoading } = useQuery({
    queryKey: ["matter-mail", "graph", internetMessageId],
    enabled: Boolean(internetMessageId),
    queryFn: () => emailApi.getConversationByInternetMessageId(internetMessageId),
  })

  const { data: backendEmail, isLoading: backendLoading } = useQuery({
    queryKey: ["matter-mail", "backend", emailId],
    enabled: Boolean(emailId) && !graphLoading && thread.length === 0,
    queryFn: () => mattersApi.getEmailById(emailId),
  })

  const messages: ThreadMsg[] = useMemo(() => {
    if (thread.length > 0) {
      return thread.map(m => ({
        id: m.id,
        subject: m.subject,
        from: m.from,
        to: m.to,
        cc: m.cc,
        body: m.body,
        date: m.date,
        webLink: m.webLink,
      }))
    }
    if (!backendEmail || typeof backendEmail !== "object") return []
    const e = backendEmail as Record<string, unknown>
    return [{
      id: String(e.emailId ?? e.id ?? emailId),
      subject: String(e.subject ?? "(No subject)"),
      from: asList(e.from),
      to: asList(e.to),
      cc: asList(e.cc),
      body: String(e.body ?? e.htmlBody ?? e.content ?? ""),
      date: String(e.date ?? e.receivedDate ?? e.createdAt ?? ""),
      webLink: String(e.webLink ?? ""),
    }]
  }, [thread, backendEmail, emailId])

  const loading = graphLoading || (thread.length === 0 && backendLoading)
  const subject = messages[0]?.subject ?? "Matter Mail"

  return (
    <PageShell title={subject} description="Matter-linked email conversation">
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (matterId) navigate(`/matters/${matterId}`)
            else navigate(-1)
          }}
        >
          Back
        </Button>
        {matterId && <Chip size="small" label={`Matter ${matterId.slice(0, 8)}…`} />}
      </Box>

      {loading && <Skeleton variant="rounded" height={280} />}

      {!loading && messages.length === 0 && (
        <Typography color="text.secondary">Email not found or Graph access unavailable.</Typography>
      )}

      {!loading && messages.map((m, i) => {
        const key = m.id || String(i)
        const open = expanded === key || (expanded === false && i === 0)
        return (
          <Accordion
            key={key}
            expanded={open}
            onChange={(_, isExp) => setExpanded(isExp ? key : false)}
            variant="outlined"
            sx={{ mb: 1, borderRadius: 2, "&:before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, pr: 2, width: "100%" }}>
                <Typography sx={{ fontWeight: 600 }}>{m.subject || "(No subject)"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  From {m.from || "—"} · {m.date ? formatDate(m.date) : "—"}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 0.5 }}><strong>To:</strong> {m.to || "—"}</Typography>
              {m.cc && m.cc !== "—" && (
                <Typography variant="body2" sx={{ mb: 1 }}><strong>CC:</strong> {m.cc}</Typography>
              )}
              {m.webLink && (
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  href={m.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mb: 1.5 }}
                >
                  Open in Outlook
                </Button>
              )}
              <Box
                sx={{
                  borderTop: 1,
                  borderColor: "divider",
                  pt: 1.5,
                  "& img": { maxWidth: "100%" },
                  "& a": { color: "primary.main" },
                }}
                dangerouslySetInnerHTML={{ __html: m.body || "<p>(No body)</p>" }}
              />
            </AccordionDetails>
          </Accordion>
        )
      })}
    </PageShell>
  )
}
