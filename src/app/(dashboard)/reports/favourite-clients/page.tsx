import { SimpleReportPage } from "../_components/SimpleReportPage"
import { reportsApi } from "@/api/reports"

export default function Page() {
  return (
    <SimpleReportPage
      title="Favourite Clients"
      description="Favourite clients grouped listing"
      queryKey={["reports", "favourite-clients"]}
      queryFn={p => reportsApi.getFavouriteClients(p)}
      filters={{"showClient":true}}
      columns={[
        { field: "clientName", header: "Client", renderCell: v => String(v || "—") },
        { field: "userName", header: "Added By", renderCell: v => String(v || "—") },
        { field: "count", header: "Favourites", align: "right", renderCell: v => String(v ?? "—") },
        { field: "createdAt", header: "Date", renderCell: v => String(v || "—") },
      ]}
    />
  )
}
