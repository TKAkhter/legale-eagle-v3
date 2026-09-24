/**
 * Favourite client detail — LMS `/favourite-client/detail`.
 * Resolves favouriters from sessionStorage (set by report) or GET /api/fav/client/list/group.
 */
import { useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Typography,
} from "@mui/material"
import StarIcon from "@mui/icons-material/Star"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import { PageShell } from "@/components/ui/PageShell"
import { PanelLoader } from "@/components/ui/PanelLoader"
import { env } from "@/config/env"
import { clientsApi } from "@/api/clients"
import { axiosClient } from "@lib/api/axios"

interface GroupMember {
  memberId?: string
  name?: string
  addedClientIds?: string[]
}

interface FavGroup {
  name?: string
  memberDetails?: GroupMember[]
}

function loadSessionGroupData(): FavGroup[] {
  try {
    const raw = sessionStorage.getItem("favClientGroupData")
    if (!raw) return []
    const parsed = JSON.parse(raw) as FavGroup[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function matchFavouriters(groups: FavGroup[], clientId: string): Record<string, { name: string }[]> {
  const byGroup: Record<string, { name: string }[]> = {}
  for (const group of groups) {
    const matched: { name: string }[] = []
    for (const member of group.memberDetails ?? []) {
      const ids = (member.addedClientIds ?? []).map(String)
      if (ids.some(id => id === clientId || id.includes(clientId))) {
        matched.push({ name: String(member.name ?? member.memberId ?? "—") })
      }
    }
    if (matched.length) byGroup[String(group.name ?? "Group")] = matched
  }
  return byGroup
}

export default function FavouriteClientDetailPage() {
  const navigate = useNavigate()
  const { clientId: paramId } = useParams()
  const [sp] = useSearchParams()
  const clientId = paramId || sp.get("clientId") || ""

  const clientQ = useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return {
          id: clientId || "c1",
          companyName: "Al Rashid Holdings",
          clientType: "COMPANY",
          firstName: "",
          lastName: "",
        }
      }
      return clientsApi.getById(clientId)
    },
    enabled: Boolean(clientId),
  })

  const groupsQ = useQuery({
    queryKey: ["fav", "client", "list", "group", "detail"],
    queryFn: async () => {
      const session = loadSessionGroupData()
      if (session.length) return session
      if (env.USE_STATIC_DATA) {
        return [{
          name: "Partners",
          memberDetails: [
            { memberId: "u1", name: "Sarah Johnson", addedClientIds: [clientId || "c1"] },
          ],
        }] as FavGroup[]
      }
      const res = await axiosClient.get("/api/fav/client/list/group")
      const raw = res.data?.data ?? res.data ?? []
      return (Array.isArray(raw) ? raw : []) as FavGroup[]
    },
    enabled: Boolean(clientId),
  })

  const matchingUsers = useMemo(
    () => matchFavouriters(groupsQ.data ?? [], clientId),
    [groupsQ.data, clientId],
  )

  const client = clientQ.data as Record<string, unknown> | undefined
  const title = useMemo(() => {
    if (!client) return "Favourite Client"
    if (String(client.clientType) === "PERSON" || client.firstName) {
      const n = `${String(client.firstName ?? "")} ${String(client.lastName ?? "")}`.trim()
      return n || String(client.companyName ?? "Client")
    }
    return String(client.companyName ?? client.name ?? "Client")
  }, [client])

  const groupNames = Object.keys(matchingUsers)
  const loading = clientQ.isLoading || groupsQ.isLoading

  return (
    <PageShell
      title="Favourite Client Details"
      description="Users and groups who favourited this client"
      action={
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate("/reports/favourite-clients")}>
          Back to report
        </Button>
      }
    >
      {!clientId && <Typography color="text.secondary">Missing clientId</Typography>}
      {clientId && loading && <PanelLoader label="Loading…" />}
      {clientId && !loading && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: "warning.light", color: "warning.contrastText" }}>C</Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                {title}
                <StarIcon sx={{ color: "gold" }} fontSize="small" />
              </Typography>
              <Button size="small" onClick={() => navigate(`/clients/${clientId}`)}>Open client profile</Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {!groupNames.length && (
            <Typography color="text.secondary">
              No users currently have this client in their favourites groups.
            </Typography>
          )}
          {groupNames.map(groupName => (
            <Box key={groupName} sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Members of {groupName} who favourited this client ({matchingUsers[groupName]?.length ?? 0})
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {(matchingUsers[groupName] ?? []).map((u, i) => (
                  <Chip key={`${groupName}-${i}`} label={u.name} variant="outlined" />
                ))}
              </Box>
            </Box>
          ))}
        </Paper>
      )}
    </PageShell>
  )
}
