import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, IconButton, Tooltip } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import StarIcon from "@mui/icons-material/Star"
import StarBorderIcon from "@mui/icons-material/StarBorder"
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined"
import BusinessIcon from "@mui/icons-material/Business"
import PersonIcon from "@mui/icons-material/Person"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { PageShell } from "@/components/ui/PageShell"
import { DataGrid } from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { SearchInput, StatusFilter, CLIENT_STATUS_OPTIONS, FilterActions } from "@components/filters"
import { clientsApi } from "@/api/clients"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@lib/store/authStore"
import { PERMISSIONS } from "@lib/auth/permissions"
import type { GridParams } from "@/types/common.types"
import type { FilterPanelProps } from "@components/data-grid/types"
import { ClientFormDrawer } from "./_components/ClientFormDrawer"

function ClientFilters({ onSearch, onReset, filters }: FilterPanelProps) {
  const [q, setQ] = useState(String(filters.searchText ?? ""))
  const [status, setStatus] = useState(String(filters.status ?? "Active"))
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <SearchInput value={q} onChange={setQ} placeholder="Search clients..." />
      <StatusFilter
        value={status}
        onChange={setStatus}
        options={CLIENT_STATUS_OPTIONS}
        includeAll
      />
      <FilterActions
        onSearch={() => onSearch({ searchText: q, status })}
        onClear={() => { setQ(""); setStatus("Active"); onReset() }}
      />
    </Box>
  )
}

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const hasPermission = useAuthStore(s => s.hasPermission)
  const canCreate = hasPermission(PERMISSIONS.CLIENTS_CREATE)
  const canEdit = hasPermission(PERMISSIONS.CLIENTS_VIEW)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<string>()
  const [gridKey, setGridKey] = useState(0)
  const [favIds, setFavIds] = useState<Set<string>>(new Set())

  const favQuery = useQuery({
    queryKey: ["clients", "favourites"],
    queryFn: () => clientsApi.getFavourites(),
  })

  useEffect(() => {
    if (favQuery.data) setFavIds(new Set(favQuery.data))
  }, [favQuery.data])

  async function toggleFav(clientId: string, currentlyFav: boolean) {
    try {
      await clientsApi.toggleFavourite(clientId, !currentlyFav)
      setFavIds(prev => {
        const next = new Set(prev)
        if (currentlyFav) next.delete(clientId)
        else next.add(clientId)
        return next
      })
      toast.success(currentlyFav ? "Removed from favourites" : "Added to favourites")
      qc.invalidateQueries({ queryKey: ["clients", "favourites"] })
    } catch {
      toast.error("Failed to update favourite")
    }
  }

  async function emailExcel() {
    try {
      toast.success(await clientsApi.requestExcel())
    } catch {
      toast.error("Excel export failed")
    }
  }

  return (
    <PageShell
      title={t("nav.clients")}
      description={t("pages.clientsDesc")}
      action={(
        <Box sx={{ display: "flex", gap: 1 }}>
          {canEdit && (
            <Button size="small" variant="outlined" startIcon={<MarkunreadOutlinedIcon />} onClick={emailExcel}>
              Email Excel
            </Button>
          )}
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(undefined); setDrawerOpen(true) }}>
              New Client
            </Button>
          )}
        </Box>
      )}
    >
      <DataGrid
        key={gridKey}
        columns={[
          {
            field: "favourite",
            header: "",
            width: 52,
            minWidth: 52,
            renderCell: (_, row) => {
              const r = row as Record<string, unknown>
              const id = String(r.id ?? "")
              const closed = String(r.status ?? "") === "CLOSE"
              const isFav = favIds.has(id) || Boolean(r.favourite)
              return (
                <Tooltip title={closed ? "Closed clients cannot be favourited" : isFav ? "Unfavourite" : "Favourite"}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={closed}
                      onClick={e => { e.stopPropagation(); toggleFav(id, isFav) }}
                    >
                      {isFav ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              )
            },
          },
          { field: "clientExternalId", header: "Client ID", minWidth: 120, width: 130 },
          {
            field: "name",
            header: "Name",
            minWidth: 220,
            width: 240,
            renderCell: (v, row) => {
              const r = row as Record<string, unknown>
              const isCompany = r.clientType === "COMPANY"
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  {isCompany ? <BusinessIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} /> : <PersonIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} />}
                  <Box sx={{ minWidth: 0 }}>{String(v || "—")}</Box>
                </Box>
              )
            },
          },
          { field: "lfaCount", header: "LFA Count", minWidth: 110, width: 120, align: "right" },
          { field: "openMatter", header: "Open Matter", minWidth: 120, width: 130, align: "right" },
          { field: "closeMatter", header: "Close Matter", minWidth: 120, width: 130, align: "right" },
          {
            field: "phones",
            header: "Phone",
            minWidth: 160,
            width: 180,
            renderCell: v => {
              const list = Array.isArray(v) ? v.map(String) : []
              return list.length ? list.join(", ") : "—"
            },
          },
          {
            field: "emails",
            header: "Email",
            minWidth: 200,
            width: 220,
            renderCell: v => {
              const list = Array.isArray(v) ? v.map(String) : []
              return list.length ? list.join(", ") : "—"
            },
          },
          { field: "address", header: "Address", minWidth: 220, width: 260, renderCell: v => String(v || "—") },
          {
            field: "nationality",
            header: "Nationality",
            minWidth: 140,
            width: 160,
            renderCell: v => {
              const list = Array.isArray(v) ? v.map(String) : []
              return list.length ? list.join(", ") : "—"
            },
          },
          {
            field: "status",
            header: "Status",
            minWidth: 110,
            width: 120,
            renderCell: v => <StatusBadge status={String(v) === "CLOSE" ? "inactive" : "active"} />,
          },
        ]}
        queryKey={["clients", "list"]}
        queryFn={(p: GridParams) => clientsApi.getAll({
          ...p,
          filters: { status: "Active", ...p.filters },
        })}
        FilterPanel={ClientFilters}
        hasFilters
        syncWithUrl
        isSortingBackend={false}
        defaultPageSize={10}
        detailPath={row => `/clients/${String((row as { id?: string }).id ?? "")}`}
        rowMenuItems={row => {
          const id = String((row as { id?: string }).id ?? "")
          return [
            { label: "Details", onClick: () => navigate(`/clients/${id}`) },
            ...(canEdit ? [{ label: "Edit", icon: <EditIcon fontSize="small" />, onClick: () => { setEditId(id); setDrawerOpen(true) } }] : []),
          ]
        }}
      />
      <ClientFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        clientId={editId}
        onSaved={() => { setDrawerOpen(false); setGridKey(k => k + 1); toast.success(editId ? "Client updated" : "Client created") }}
      />
    </PageShell>
  )
}
