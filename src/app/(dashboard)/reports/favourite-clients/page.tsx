/**
 * Favourite Clients report — LMS `/favourite-clients/reports`.
 * By Groups: join /fav/client/list/group + /client/mini/list
 * By Individual: /fav/client/favorite-clients
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@/components/data-grid/DataGrid"
import type { ColumnDef } from "@/components/data-grid/types"
import { env } from "@/config/env"
import { axiosClient } from "@lib/api/axios"
import { toast } from "@/lib/toast"
import { reportsApi } from "@/api/reports"
import type { GridParams, PageResponse } from "@/types/common.types"

interface FavClientRow extends Record<string, unknown> {
  id: string
  clientId: string
  name: string
  lfaCount: number | string
  openMatter: number | string
  email: string
  phone: string
  country: string
}

interface FavGroup {
  name?: string
  clientIds?: string[]
  memberDetails?: {
    memberId?: string
    name?: string
    addedClientIds?: string[]
  }[]
}

function pageOf<T extends Record<string, unknown>>(rows: T[], p: GridParams): PageResponse<T> {
  const start = p.page * p.pageSize
  const slice = rows.slice(start, start + p.pageSize)
  return {
    content: slice,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / p.pageSize) || 0,
    number: p.page,
    size: p.pageSize,
    first: p.page === 0,
    last: start + p.pageSize >= rows.length,
    empty: slice.length === 0,
  }
}

function mapClientMini(raw: Record<string, unknown>): FavClientRow {
  const clientId = String(raw.clientId ?? raw.id ?? "")
  const externalId = String(raw.clientExternalId ?? raw.externalId ?? clientId)
  const isPerson = String(raw.clientType ?? "") === "PERSON"
  const name = isPerson
    ? `${String(raw.firstName ?? "")} ${String(raw.middleName ?? "")} ${String(raw.lastName ?? "")}`.replace(/\s+/g, " ").trim()
    : String(raw.companyName ?? raw.name ?? "—")
  const emails = raw.email as { emailId?: string }[] | string | undefined
  const phones = raw.phones as { phoneNo?: string }[] | undefined
  const address = raw.address as { country?: string }[] | undefined
  return {
    id: externalId || clientId,
    clientId,
    name: name || "—",
    lfaCount: Number(raw.lfaCount ?? 0),
    openMatter: Number(raw.openMatter ?? 0),
    email: Array.isArray(emails) && emails[0] ? String(emails[0].emailId ?? "—") : (typeof emails === "string" ? emails : "—"),
    phone: Array.isArray(phones) && phones[0] ? String(phones[0].phoneNo ?? "—") : "—",
    country: Array.isArray(address) && address[0] ? String(address[0].country ?? "—") : "—",
  }
}

const columns: ColumnDef<FavClientRow>[] = [
  { field: "id", header: "Client ID", width: 120 },
  { field: "name", header: "Name" },
  { field: "lfaCount", header: "LFA Count", width: 100, align: "right" },
  { field: "openMatter", header: "Open Matter", width: 110, align: "right" },
  { field: "email", header: "Email" },
  { field: "phone", header: "Phone", width: 130 },
  { field: "country", header: "Country", width: 120 },
]

export default function FavouriteClientsReportPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [memberFilter, setMemberFilter] = useState("")
  const [emailing, setEmailing] = useState(false)

  const groupsQ = useQuery({
    queryKey: ["fav-client", "groups"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [{
          name: "Litigation",
          clientIds: ["c1", "c2"],
          memberDetails: [
            { memberId: "u1", name: "Sarah Johnson", addedClientIds: ["c1"] },
            { memberId: "u2", name: "James Okonkwo", addedClientIds: ["c1", "c2"] },
          ],
        }] as FavGroup[]
      }
      const res = await axiosClient.get("/api/fav/client/list/group")
      const d = res.data?.data ?? res.data ?? []
      return (Array.isArray(d) ? d : d.content ?? []) as FavGroup[]
    },
  })

  const clientsQ = useQuery({
    queryKey: ["clients", "mini", "fav-report"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return [
          mapClientMini({
            clientId: "c1",
            clientExternalId: "EXT-1",
            companyName: "Al Rashid Holdings",
            clientType: "COMPANY",
            lfaCount: 2,
            openMatter: 3,
            email: [{ emailId: "a@acme.com" }],
            phones: [{ phoneNo: "555-0100" }],
            address: [{ country: "UAE" }],
          }),
          mapClientMini({
            clientId: "c2",
            clientExternalId: "EXT-2",
            firstName: "Jane",
            lastName: "Doe",
            clientType: "PERSON",
            lfaCount: 1,
            openMatter: 1,
            email: [{ emailId: "j@ex.com" }],
            phones: [{ phoneNo: "555-0200" }],
            address: [{ country: "UAE" }],
          }),
        ]
      }
      const res = await axiosClient.get("/api/client/mini/list")
      const list = res.data?.data ?? res.data ?? []
      return (Array.isArray(list) ? list : []).map((r: Record<string, unknown>) => mapClientMini(r))
    },
  })

  const individualQ = useQuery({
    queryKey: ["fav-client", "individual"],
    queryFn: async () => {
      if (env.USE_STATIC_DATA) {
        return clientsQ.data ?? []
      }
      try {
        const res = await axiosClient.get("/api/fav/client/favorite-clients")
        const list = res.data?.data ?? res.data ?? []
        const arr = Array.isArray(list) ? list : list.content ?? []
        return (arr as Record<string, unknown>[]).map(mapClientMini)
      } catch {
        return clientsQ.data ?? []
      }
    },
    enabled: tab === 1,
  })

  const members = useMemo(() => {
    const opts: { id: string; label: string }[] = []
    for (const g of groupsQ.data ?? []) {
      for (const m of g.memberDetails ?? []) {
        if (m.memberId) opts.push({ id: String(m.memberId), label: String(m.name ?? m.memberId) })
      }
    }
    return opts
  }, [groupsQ.data])

  const groupClientRows = useMemo(() => {
    const clients = clientsQ.data ?? []
    const byId = new Map(clients.map(c => [c.clientId, c]))
    const ids = new Set<string>()
    for (const g of groupsQ.data ?? []) {
      for (const id of g.clientIds ?? []) ids.add(String(id))
    }
    let rows = [...ids].map(id => byId.get(id)).filter(Boolean) as FavClientRow[]

    if (memberFilter) {
      const memberClientIds = new Set<string>()
      for (const g of groupsQ.data ?? []) {
        for (const m of g.memberDetails ?? []) {
          if (String(m.memberId) === memberFilter) {
            for (const id of m.addedClientIds ?? []) memberClientIds.add(String(id))
          }
        }
      }
      rows = rows.filter(r => memberClientIds.has(r.clientId))
    }
    return rows
  }, [groupsQ.data, clientsQ.data, memberFilter])

  async function emailExcel() {
    setEmailing(true)
    try {
      toast.success(await reportsApi.requestReportExcel("/api/fav/client/favourite-clients/excel", {}, "post"))
    } catch {
      toast.error("Excel export failed")
    } finally {
      setEmailing(false)
    }
  }

  function openDetail(row: FavClientRow) {
    // Persist group data for detail page (OLD localStorage pattern → sessionStorage)
    try {
      sessionStorage.setItem("favClientGroupData", JSON.stringify(groupsQ.data ?? []))
    } catch { /* ignore */ }
    navigate(`/reports/favourite-clients/${row.clientId}`)
  }

  return (
    <PageShell
      title="Favourite Clients"
      description="Clients favourited by groups and individuals"
      action={
        <Button
          variant="outlined"
          size="small"
          disabled={emailing}
          startIcon={<MarkunreadOutlinedIcon />}
          onClick={() => { void emailExcel() }}
        >
          Email Excel
        </Button>
      }
    >
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="By Groups" />
        <Tab label="By Individual" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Group Member</InputLabel>
              <Select
                label="Group Member"
                value={memberFilter}
                onChange={e => setMemberFilter(String(e.target.value))}
              >
                <MenuItem value="">All members</MenuItem>
                {members.map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" onClick={() => setMemberFilter("")}>Clear</Button>
          </Box>
        </Paper>
      )}

      {tab === 0 && (
        <DataGrid<FavClientRow>
          columns={columns}
          queryKey={["fav-clients", "by-group", memberFilter, groupClientRows.length]}
          queryFn={async (p: GridParams) => pageOf(groupClientRows, p)}
          zebraStriping
          syncWithUrl={false}
          isSortingBackend={false}
          onRowClick={openDetail}
          rowMenuItems={row => [
            { label: "View Members", onClick: () => openDetail(row) },
            { label: "Open Client", onClick: () => navigate(`/clients/${row.clientId}`) },
          ]}
          emptyState={<Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No favourite clients in groups</Typography>}
        />
      )}

      {tab === 1 && (
        <DataGrid<FavClientRow>
          columns={columns}
          queryKey={["fav-clients", "individual", individualQ.dataUpdatedAt]}
          queryFn={async (p: GridParams) => pageOf(individualQ.data ?? [], p)}
          zebraStriping
          syncWithUrl={false}
          isSortingBackend={false}
          onRowClick={openDetail}
          rowMenuItems={row => [
            { label: "View Members", onClick: () => openDetail(row) },
            { label: "Open Client", onClick: () => navigate(`/clients/${row.clientId}`) },
          ]}
          emptyState={<Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No individually favourited clients</Typography>}
        />
      )}
    </PageShell>
  )
}
