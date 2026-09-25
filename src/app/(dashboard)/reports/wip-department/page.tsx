import { Navigate } from "react-router-dom"

/** Legacy deep-link → WIP hub Department tab */
export default function Page() {
  return <Navigate to="/reports/wip?tab=department" replace />
}
