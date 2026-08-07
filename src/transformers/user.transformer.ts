/**
 * user.transformer.ts
 * BE → canonical User shape.
 */
export interface RawUser {
  id?:             string
  userId?:         string
  firstName?:      string
  lastName?:       string
  email?:          string
  phone?:          string
  companyUserType?:string
  designation?:    { id: string; name: string }
  department?:     { id: string; name: string }
  active?:         boolean
  hod?:            boolean
}

export interface User {
  id:            string
  name:          string
  firstName:     string
  lastName:      string
  email:         string
  phone:         string
  type:          string
  designation:   string
  designationId: string
  department:    string
  departmentId:  string
  active:        boolean
  isHod:         boolean
}

export function transformUser(raw: RawUser): User {
  return {
    id:            raw.id ?? raw.userId ?? "",
    name:          `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim(),
    firstName:     raw.firstName ?? "",
    lastName:      raw.lastName  ?? "",
    email:         raw.email ?? "",
    phone:         raw.phone ?? "",
    type:          raw.companyUserType ?? "ATTORNEY",
    designation:   raw.designation?.name ?? "",
    designationId: raw.designation?.id ?? "",
    department:    raw.department?.name ?? "",
    departmentId:  raw.department?.id ?? "",
    active:        raw.active ?? true,
    isHod:         raw.hod ?? false,
  }
}
