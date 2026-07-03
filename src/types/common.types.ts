/**
 * common.types.ts
 * Shared primitive types used across the entire app.
 * No business logic — pure type definitions.
 */

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Normalised page response — backend returns either this shape or close to it */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number        // current page (0-indexed on backend)
  size: number
  first: boolean
  last: boolean
  empty: boolean
}

/** Params sent to every paginated endpoint (normalised by buildQueryParams util) */
export interface PaginationParams {
  page: number          // 0-indexed, normalised to backend's page/pageNumber
  pageSize: number
}

export interface SortParams {
  sortBy: string
  sortDir: 'asc' | 'desc'
}

export interface GridParams extends PaginationParams, Partial<SortParams> {
  filters?: Record<string, unknown>
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  success?: boolean
}

export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}

// ─── Select / dropdown option ─────────────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
  meta?: Record<string, unknown>
}

// ─── Common entity shapes returned by mini/short-info endpoints ───────────────

export interface UserMini {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePic?: string
  designation?: string
  department?: string
  companyUserType?: 'ATTORNEY' | 'NONATTORNEY' | 'LAWYER' | 'LAWYER_USER' | 'ADMIN'
}

export interface ClientMini {
  id: string
  firstName: string
  lastName: string
  companyName?: string
  email?: string
}

export interface MatterMini {
  id: string
  title: string
  matterSequence?: string
  clientId?: string
  clientName?: string
  status?: MatterStatus
}

export interface LeadMini {
  id: string
  firstName: string
  lastName: string
  companyName?: string
}

// ─── Status enums matching backend ───────────────────────────────────────────

export type MatterStatus = 'OPEN' | 'CLOSE' | 'PENDING' | 'ALL' | 'RE_OPEN'

export type InvoiceStatus =
  | 'Paid' | 'Overdue' | 'Void' | 'Write_Off' | 'Draft'
  | 'Partially_Paid' | 'Due' | 'Canceled' | 'Approval'
  | 'Rejected' | 'All' | 'CreditNote' | 'Disbursement'

export type BillingType =
  | 'Hourly' | 'Fixed' | 'Session' | 'Expense' | 'NoAgreement'
  | 'Contingent' | 'NonContingent' | 'Advance' | 'CourierTranslation'
  | 'Enforcement' | 'CreditNote' | 'WriteOff' | 'SuccessRate'
  | 'Courier' | 'Translation'

export type ActivityType = 'Time' | 'Expense' | 'Fixed'

export type RevenueStatus =
  | 'INITIAL' | 'DRAFT' | 'FOR_APPROVAL' | 'APPROVED'
  | 'ALLOCATION_IN_PROCESS' | 'COMPLETED' | 'REJECTED' | 'DISCOUNTED'

export type TaskStatus =
  | 'Pending' | 'Waiting_For_Approval' | 'Rejected' | 'Completed'
  | 'Submitted' | 'Re_Submitted' | 'Re_Submit' | 'Created'
  | 'Before_Approval_Completed' | 'After_Approval_Completed' | 'Waiting_For_Completion'

export type ConflictCheckStatus = 'Conflicted' | 'No_Conflict' | 'Pending'

export type LeadType = 'COMPANY' | 'PERSON'

export type CompanyUserType = 'ATTORNEY' | 'NONATTORNEY' | 'LAWYER' | 'LAWYER_USER' | 'ADMIN'

export type ActivityCategory =
  | 'ALL' | 'MATTER' | 'LEAD' | 'HEARING' | 'CLIENT'
  | 'MATTER_RATE' | 'INVOICE' | 'ADMIN' | 'BUSINESS_DEVELOPMENT'
  | 'TRAINING_AND_DEVELOPMENT' | 'LEAVE'

export type LfaStatus = 'Draft' | 'Approved' | 'Canceled' | 'Approval'

// ─── Address / contact primitives ────────────────────────────────────────────

export interface Address {
  type?: string
  street?: string
  city?: string
  state?: string
  country?: string
  zip?: string
}

export interface EmailEntry {
  emailId: string
  type?: string
  primary?: boolean
}

export interface PhoneEntry {
  phoneNo: string
  codeNo?: string
  type?: string
  primary?: boolean
}

export interface RepresentativeInfo {
  name: string
  designation: string
}

export interface PartyOpposing {
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  phone?: string
  partyOpposingType?: string
  relation?: string
}

// ─── Department / Designation ─────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  hodId?: string
  hodName?: string
  status?: boolean
  accessScope?: string
}

export interface Designation {
  id: string
  name: string
  rate?: number
  status?: boolean
  accessScope?: string
}

// ─── File upload ──────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string
  document: string
  fileName: string
  uploadedDate: string
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type ColorMode = 'light' | 'dark'
export type Direction = 'ltr' | 'rtl'
export type Language = 'en' | 'ar'
