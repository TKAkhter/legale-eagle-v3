/**
 * billing/page.tsx — canonical redirect to /billings
 *
 * The route /billing is kept for backwards compatibility.
 * All actual billing content lives under /billings.
 */
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function BillingRedirectPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate("/billings", { replace: true }) }, [navigate])
  return null
}
