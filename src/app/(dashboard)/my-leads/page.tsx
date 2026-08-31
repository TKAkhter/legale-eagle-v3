import { useAuthStore } from "@lib/store/authStore"
import { PageShell }   from "@/components/ui/PageShell"
import { DataGrid }    from "@components/data-grid/DataGrid"
import { StatusBadge } from "@components/ui/StatusBadge"
import { Chip }        from "@mui/material"
import { axiosClient } from "@lib/api/axios"
import { buildQueryParams } from "@lib/utils/buildQueryParams"
import { leadsApi }    from "@/api/leads"
import { env }         from "@/config/env"
import type { GridParams } from "@/types/common.types"

async function fetchMyLeads(params: GridParams) {
  if (env.USE_STATIC_DATA) return leadsApi.getAll(params)
  const qp = buildQueryParams(params, { paginationConvention: "pageNo-pageSize" })
  const res = await axiosClient.get("/api/leads/my", {
    params: { ...qp, leadType: "ALL", status: params.filters?.status ?? "ALL" },
  })
  return res.data?.data ?? res.data
}

export default function MyLeadsPage() {
  const user = useAuthStore(s => (s as {user?:{firstName?:string}}).user)
  return (
    <PageShell
      title="My Leads"
      description={`Leads assigned to ${user?.firstName ?? "you"}`}
    >
      <DataGrid
        columns={[
          { field:"firstName", header:"Name", sortKey:"firstName",
            renderCell:(_,row)=>{ const r=row as Record<string,string>; return `${r.firstName??""} ${r.lastName??""}`.trim()||r.companyName||"—" } },
          { field:"companyName",   header:"Company" },
          { field:"currentStatus", header:"Status",   renderCell:(v)=><StatusBadge status={String(v??"")} /> },
          { field:"practiceArea",  header:"Practice", renderCell:(v)=>(v as Record<string,string>)?.name??"—" },
          { field:"leadType",      header:"Type",     renderCell:(v)=><Chip size="small" label={String(v??"")} variant="outlined" /> },
          { field:"createdAt",     header:"Created",  sortKey:"createdAt",
            renderCell:(v)=>v?new Date(String(v)).toLocaleDateString("en-GB"):"—" },
        ]}
        queryKey={["leads","my"]}
        queryFn={fetchMyLeads}
        hasFilters={false}
        syncWithUrl
        detailPath={(row)=>`/leads/${(row as Record<string,string>).id}`}
        defaultSortBy="createdAt"
        defaultSortDir="desc"
      />
    </PageShell>
  )
}
