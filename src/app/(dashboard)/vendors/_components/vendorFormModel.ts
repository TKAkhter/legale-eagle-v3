export type VendorAddress = {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export type VendorContact = {
  firstName: string
  lastName: string
  email: { emailId: string; primary?: boolean }
  phone: { codeNo: string; phoneNo: string; primary?: boolean }
  primary?: boolean
}

export type VendorFormValues = {
  companyName: string
  displayName: string
  vendorType: "COMPANY" | "PERSON"
  trnNo: string
  note: string
  billingAddress: VendorAddress
  shippingAddress: VendorAddress
  contactPersons: VendorContact[]
}

export const emptyAddress = (): VendorAddress => ({
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
})

export const emptyPrimaryContact = (): VendorContact => ({
  firstName: "",
  lastName: "",
  email: { emailId: "", primary: true },
  phone: { codeNo: "+971", phoneNo: "", primary: true },
  primary: true,
})

export const emptyAdditionalContact = (): VendorContact => ({
  firstName: "",
  lastName: "",
  email: { emailId: "" },
  phone: { codeNo: "+971", phoneNo: "" },
})

export function getDefaultVendorValues(): VendorFormValues {
  return {
    companyName: "",
    displayName: "",
    vendorType: "COMPANY",
    trnNo: "",
    note: "",
    billingAddress: emptyAddress(),
    shippingAddress: emptyAddress(),
    contactPersons: [emptyPrimaryContact()],
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function emailIdOf(email: unknown): string {
  if (typeof email === "string") return email
  if (email && typeof email === "object" && "emailId" in email) {
    return String((email as { emailId?: string }).emailId ?? "")
  }
  return ""
}

function mapPhone(phone: unknown, primary = false): VendorContact["phone"] {
  const p = (phone && typeof phone === "object" ? phone : {}) as {
    codeNo?: string
    phoneNo?: string
  }
  return {
    codeNo: p.codeNo || "+971",
    phoneNo: p.phoneNo || (typeof phone === "string" ? phone : ""),
    ...(primary ? { primary: true } : {}),
  }
}

function mapEmail(email: unknown, primary = false): VendorContact["email"] {
  return {
    emailId: emailIdOf(email),
    ...(primary ? { primary: true } : {}),
  }
}

function mapAddress(address: unknown): VendorAddress {
  const a = (address && typeof address === "object" ? address : {}) as Record<string, string>
  return {
    street: a.street || "",
    city: a.city || "",
    state: a.state || a.State || "",
    zip: a.zip || "",
    country: a.country || "",
  }
}

function findLegacyAddress(addresses: unknown, typeValues: string[]): unknown {
  return asArray<Record<string, unknown>>(addresses).find(address =>
    typeValues.includes(String(address?.type || "").trim().toLowerCase()),
  )
}

function mapFormContact(person: Record<string, unknown> | null, isPrimary: boolean): VendorContact {
  if (!person) return isPrimary ? emptyPrimaryContact() : emptyAdditionalContact()
  return {
    firstName: String(person.firstName ?? ""),
    lastName: String(person.lastName ?? ""),
    email: mapEmail(person.email, isPrimary),
    phone: mapPhone(person.phone ?? person.workPhone ?? person.mobile, isPrimary),
    ...(isPrimary ? { primary: true } : {}),
  }
}

export function vendorFromApi(data: Record<string, unknown> = {}): VendorFormValues {
  const people = asArray<Record<string, unknown>>(data.contactPersons)
  const primaryIndex = people.findIndex(p => p.primary === true)
  const resolvedPrimary = people.length ? (primaryIndex >= 0 ? primaryIndex : 0) : -1
  const primaryPerson = resolvedPrimary >= 0 ? people[resolvedPrimary] : null
  const additionalPeople = people.filter((_p, index) => index !== resolvedPrimary)

  const vendorTypeRaw = String(data.vendorType ?? "COMPANY")
  const vendorType: "COMPANY" | "PERSON" =
    vendorTypeRaw === "PERSON" || vendorTypeRaw === "INDIVIDUAL" ? "PERSON" : "COMPANY"

  return {
    companyName: String(data.companyName ?? ""),
    displayName: String(data.displayName ?? ""),
    vendorType,
    trnNo: String(data.trnNo ?? ""),
    note: String(data.note ?? ""),
    billingAddress: mapAddress(
      data.billingAddress
      ?? findLegacyAddress(data.addresses, ["billing", "work", "billing address"]),
    ),
    shippingAddress: mapAddress(
      data.shippingAddress
      ?? findLegacyAddress(data.addresses, ["shipping", "home", "shipping address"]),
    ),
    contactPersons: [
      mapFormContact(primaryPerson, true),
      ...additionalPeople.map(p => mapFormContact(p, false)),
    ],
  }
}

function toAddressPayload(address: VendorAddress) {
  return {
    city: address?.city || "",
    country: address?.country || "",
    state: address?.state || "",
    street: address?.street || "",
    zip: address?.zip || "",
  }
}

function hasContactData(person: VendorContact): boolean {
  return Boolean(
    person?.firstName?.trim()
    || person?.lastName?.trim()
    || person?.email?.emailId?.trim()
    || person?.phone?.phoneNo?.trim(),
  )
}

function toPrimaryPayload(person: VendorContact) {
  if (!hasContactData(person)) return null
  const emailId = person.email?.emailId?.trim() || ""
  const phoneNo = person.phone?.phoneNo?.trim() || ""
  return {
    firstName: person.firstName?.trim() || "",
    lastName: person.lastName?.trim() || "",
    email: emailId ? { emailId, primary: true } : null,
    phone: phoneNo
      ? { codeNo: person.phone?.codeNo || "+971", phoneNo, primary: true }
      : null,
    primary: true,
  }
}

function toAdditionalPayload(person: VendorContact) {
  if (!hasContactData(person)) return null
  const emailId = person.email?.emailId?.trim() || ""
  const phoneNo = person.phone?.phoneNo?.trim() || ""
  return {
    firstName: person.firstName?.trim() || "",
    lastName: person.lastName?.trim() || "",
    email: emailId ? { emailId } : null,
    phone: phoneNo
      ? { codeNo: person.phone?.codeNo || "+971", phoneNo }
      : null,
  }
}

export function vendorToPayload(values: VendorFormValues) {
  const people = values.contactPersons || []
  const primary = toPrimaryPayload(people[0])
  const additional = people.slice(1).map(toAdditionalPayload).filter(Boolean)
  const contactPersons = primary ? [primary, ...additional] : additional

  return {
    billingAddress: toAddressPayload(values.billingAddress),
    companyName: values.companyName?.trim() || "",
    contactPersons,
    displayName: values.displayName?.trim() || values.companyName?.trim() || "",
    note: values.note?.trim() || "",
    shippingAddress: toAddressPayload(values.shippingAddress),
    trnNo: values.trnNo?.trim() || "",
    vendorType: values.vendorType || "COMPANY",
  }
}

export function formatAddress(address: unknown): string {
  const a = mapAddress(address)
  const parts = [a.street, a.city, a.state, a.zip, a.country].filter(Boolean)
  return parts.length ? parts.join(", ") : "—"
}
