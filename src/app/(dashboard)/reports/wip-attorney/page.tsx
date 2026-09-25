import { Navigate } from "react-router-dom"

/** Legacy deep-link → WIP hub Attorney tab */
export default function Page() {
  return <Navigate to="/reports/wip?tab=attorney" replace />
}
