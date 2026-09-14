import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Box, Button, Chip } from "@mui/material"
import AddIcon   from "@mui/icons-material/Add"
import GavelIcon from "@mui/icons-material/Gavel"
import { DataGrid }          from "@/components/data-grid/DataGrid"
import { StatusBadge }       from "@/components/ui/StatusBadge"
import { PageShell }         from "@/components/ui/PageShell"
import { mattersApi }        from "@/api/matters"
import { useAuthStore }      from "@lib/store/authStore"
import { MatterFormDrawer }  from "./_components/MatterFormDrawer"
import { NewMatterWizard }   from "./_components/NewMatterWizard"
import type { GridParams }   from "@/types/common.types"
import { useQueryClient }    from "@tanstack/react-query"

export default function MattersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editId,     setEditId]     = useState<string|undefined>()
  const [searchParams, setSearchParams] = useSearchParams()
  const canAdd   = useAuthStore(s => s.hasPermission)("/matters")
  const qc       = useQueryClient()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <PageShell
      title="Matters"
      description="All active and closed legal matters"
      action={canAdd && (
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditId(undefined); setCreateOpen(true) }}>
          New Matter
        </Button>
      )}
    >
      <DataGrid
        columns={[
          { field:"title", header:"Matter Title", sortKey:"title",
            renderCell:(v,row) => {
              const r = row as Record<string,unknown>
              return (
                <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
                  <GavelIcon sx={{ fontSize:16, color:"text.disabled" }} />
                  <Box>
                    <Box sx={{ fontWeight:500, fontSize:13 }}>{String(v??"")}</Box>
                    <Box sx={{ fontSize:11, color:"text.secondary" }}>{String(r.practiceArea??"")}</Box>
                  </Box>
                </Box>
              )
            }
          },
          { field:"clientMini", header:"Client",
            renderCell:(v) => { const c=v as Record<string,string>; return c?.companyName||c?.firstName||"—" }
          },
          { field:"lawyers",     header:"Attorney" },
          { field:"billingType", header:"Billing",
            renderCell:(v) => <Chip size="small" label={String(v??"")} variant="outlined" />
          },
          { field:"status", header:"Status",
            renderCell:(v) => <StatusBadge status={String(v??"")} />
          },
          { field:"openDate", header:"Opened", sortKey:"openDate",
            renderCell:(v) => v ? new Date(String(v)).toLocaleDateString("en-GB") : "—"
          },
        ]}
        queryKey={["matters","list"]}
        queryFn={(p) => mattersApi.getAll(p as GridParams) as unknown as Promise<import("@/types/common.types").PageResponse<Record<string,unknown>>>}
        hasFilters syncWithUrl
        detailPath={(row) => `/matters/${(row as Record<string,string>).matterId ?? (row as Record<string,string>).id}`}
        defaultSortBy="openDate" defaultSortDir="desc"
        rowMenuItems={(row) => [
          { label:"View",  onClick: () => window.location.href = `/matters/${(row as Record<string,string>).matterId ?? (row as Record<string,string>).id}` },
          { label:"Edit",  onClick: () => { setEditId((row as Record<string,string>).id); setCreateOpen(true) } },
        ]}
      />

      {/* New Matter — use wizard for create, drawer for edit */}
      {createOpen && !editId && (
        <NewMatterWizard open={createOpen} onClose={() => setCreateOpen(false)} />
      )}
      {createOpen && editId && (
        <MatterFormDrawer
          open={createOpen}
          onClose={() => { setCreateOpen(false); setEditId(undefined) }}
          matterId={editId}
          onSuccess={() => { setCreateOpen(false); setEditId(undefined); qc.invalidateQueries({ queryKey:["matters","list"] }) }}
        />
      )}
    </PageShell>
  )
}
