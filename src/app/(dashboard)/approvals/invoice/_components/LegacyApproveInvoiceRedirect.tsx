/**
 * LMS email/notification deep-links:
 *   /:attorneyId/:invoiceId/approve-invoice
 *   /:attorneyId/:invoiceId/approve-invoice/:invoiceNumber/:invoicePrefix/:approveId/:matterId
 *   /:attorneyId/:invoiceId/approve-department-invoice/.../:approveId/:matterId/:isDepartment
 * → /approvals/invoice?invoiceId=&approveId=  (or department-invoice)
 */
import { Navigate, useParams, useLocation } from "react-router-dom"

export default function LegacyApproveInvoiceRedirect() {
  const { invoiceId, approveId } = useParams()
  const { pathname } = useLocation()
  const isDepartment = pathname.includes("approve-department-invoice")
  const base = isDepartment ? "/approvals/department-invoice" : "/approvals/invoice"

  const qs = new URLSearchParams()
  if (invoiceId) qs.set("invoiceId", invoiceId)
  if (approveId) qs.set("approveId", approveId)
  const q = qs.toString()

  return <Navigate to={q ? `${base}?${q}` : base} replace />
}
