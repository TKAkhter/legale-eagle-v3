import type { ReactNode } from 'react'
import { usePermission } from '@hooks/usePermission'
interface Props { do: string; children: ReactNode; fallback?: ReactNode }
export function Can({ do: permission, children, fallback = null }: Props) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
