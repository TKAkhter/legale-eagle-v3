/**
 * LMS `/hearing?m_id=&id=` → `/hearings/:hearingId?matterId=`
 * Bare `/hearing` → `/hearings` queue.
 */
import { Navigate, useSearchParams } from "react-router-dom"

export default function LegacyHearingRedirect() {
  const [params] = useSearchParams()
  const hearingId = params.get("id") || params.get("hearingId")
  const matterId = params.get("m_id") || params.get("matterId")

  if (hearingId) {
    const q = matterId ? `?matterId=${encodeURIComponent(matterId)}` : ""
    return <Navigate to={`/hearings/${encodeURIComponent(hearingId)}${q}`} replace />
  }
  return <Navigate to="/hearings" replace />
}
