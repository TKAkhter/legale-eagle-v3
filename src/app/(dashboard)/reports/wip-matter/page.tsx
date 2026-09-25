import { Navigate } from "react-router-dom"

/** Legacy deep-link → WIP hub Matter tab */
export default function Page() {
  return <Navigate to="/reports/wip?tab=matter" replace />
}
