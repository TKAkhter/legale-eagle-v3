import type { CompanyUserType, Department, Designation } from './common.types'

/**
 * auth.types.ts
 * Types for authentication, JWT payload, permissions, and menu structure.
 * Mirrors the backend's Users entity and menu/group permission shapes.
 */

// ─── JWT decoded payload ──────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string           // userId
  email: string
  accessScope: string   // multi-tenant scope — attach to every API call
  exp: number
  iat: number
  roles?: string[]
}

// ─── Authenticated user ───────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  profilePic?: string
  companyUserType: CompanyUserType
  department?: Department
  designation?: Designation
  accessScope: string
  token: string
  refreshToken?: string
  hod?: boolean
  active?: boolean
  // Extra permissions flags from backend Users entity
  leadSourceEntry?: boolean
  practiceAreaEntry?: boolean
  departmentInvoiceApproval?: boolean
  departmentActivitiesReview?: boolean
  departmentActivitiesReviewAndApproval?: boolean
  manageClientCredit?: boolean
  matterStopWorking?: boolean
  backEntry?: boolean
  backEntryType?: 'Months' | 'Days'
  duration?: number
}

// ─── Menu / permission structure from backend ─────────────────────────────────

/** Maps to backend SubmenuPermission */
export interface SubmenuPermission {
  submenuId: string
  visible: boolean
  add: boolean
  edit: boolean
  delete: boolean
}

/** Maps to backend GroupClass */
export interface MenuPermission {
  menuId: string
  accessModifies: SubmenuPermission[]
}

/** Resolved flat permission set — built from SubmenuPermission by lib/auth/permissions.ts */
export type PermissionSet = Set<string>

// ─── Navigation menu item returned by /api/user/get/access/menu ──────────────
// Matches the backend's Menu entity exactly (see /api/menu/menulist, /api/menu/add):
// { id, menuName, url, parent, seqno, file (icon image) }
// The backend does NOT attach permission flags to the menu node itself —
// permissions live separately on UserGroupDTO.permission[] (see below) and
// must be cross-referenced by menuId.

export interface ApiMenuItem {
  id: string
  menuName: string
  url?: string
  parent?: string        // parent menu id, or "0"/"" for top-level
  seqno?: number
  file?: string           // icon image URL the backend stores (we don't use this — local icon map instead)
  children?: ApiMenuItem[]
}

// ─── Group permission shapes — from /api/group/get ────────────────────────────
// Matches backend GroupClass exactly: { menuId, accessModifies: SubmenuPermission[] }

export interface ApiSubmenuPermission {
  submenuId: string
  visible: boolean
  add: boolean
  edit: boolean
  delete: boolean
}

export interface ApiGroupPermission {
  menuId: string
  accessModifies: ApiSubmenuPermission[]
}

export interface ApiUserGroup {
  id?: string
  name: string
  permission: ApiGroupPermission[]
}

// ─── Login request/response ───────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
  userId: string
  accessScope: string
  user?: Partial<AuthUser>
}

export interface TokenRefreshRequest {
  token: string
  refreshToken: string
  userId: string
  accessScope: string
  deviceId?: string
}

// ─── Auth context value ───────────────────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null
  permissions: PermissionSet
  menuItems: ApiMenuItem[]
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (req: LoginRequest) => Promise<void>
  signOut: () => void
  hasPermission: (permission: string) => boolean
}
