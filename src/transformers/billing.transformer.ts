/**
 * billing.transformer.ts — normalises invoice/billing data from the backend.
 *
 * Flow: billingApi.getAll() → raw BE response → transformInvoice() → DataGrid
 *
 * Why this exists:
 *   The backend returns camelCase but inconsistently names totals
 *   (taxableAmount vs amount vs totalAmount). This transformer normalises
 *   every invoice to a consistent shape regardless of which endpoint served it.
 */

export interface Invoice {
  id:            string
  invoiceNo:     string
  invoiceStatus: string
  issueDate:     string
  dueDate:       string
  amount:        number          // total including VAT
  taxableAmount: number          // subtotal before VAT
  vatAmount:     number
  balanceAmount: number          // outstanding balance
  paidAmount:    number
  billingType:   string
  client:        { id: string; name: string; companyName?: string } | null
  matter:        { id: string; title: string; matterId?: string }  | null
  currency:      string
}

/** Transform a single raw invoice from any billing endpoint */
export function transformInvoice(raw: Record<string, unknown>): Invoice {
  const client = raw.client as Record<string,unknown> | null
  const matter = raw.matter as Record<string,unknown> | null

  const taxable  = Number(raw.taxableAmount ?? raw.subtotal ?? 0)
  const vat      = Number(raw.vatAmount     ?? raw.tax      ?? 0)
  const total    = Number(raw.totalAmount   ?? raw.amount   ?? taxable + vat)
  const paid     = Number(raw.paidAmount    ?? raw.amountPaid ?? 0)

  return {
    id:            String(raw.id            ?? ""),
    invoiceNo:     String(raw.invoiceNo     ?? raw.invoiceNumber ?? ""),
    invoiceStatus: String(raw.invoiceStatus ?? raw.status        ?? "Draft"),
    issueDate:     String(raw.issueDate     ?? raw.createdAt     ?? ""),
    dueDate:       String(raw.dueDate       ?? ""),
    amount:        total,
    taxableAmount: taxable,
    vatAmount:     vat,
    balanceAmount: Number(raw.balanceAmount ?? raw.outstanding   ?? total - paid),
    paidAmount:    paid,
    billingType:   String(raw.billingType   ?? "Hourly"),
    client: client ? {
      id:          String(client.id          ?? ""),
      name:        String(client.companyName ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()),
      companyName: String(client.companyName ?? ""),
    } : null,
    matter: matter ? {
      id:       String(matter.id       ?? matter.matterId ?? ""),
      title:    String(matter.title    ?? ""),
      matterId: String(matter.matterId ?? matter.id ?? ""),
    } : null,
    currency: String(raw.currency ?? "AED"),
  }
}

/** Transform a page of invoices */
export function transformInvoicePage(
  raw: Record<string, unknown>[]
): Invoice[] {
  return raw.map(transformInvoice)
}
