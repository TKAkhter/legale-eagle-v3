/**
 * Safely unwrap BE list/page payloads into an array.
 * Handles: raw array | { content } | { data: [] } | { data: { content } }
 */
export function unwrapList<T = Record<string, unknown>>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []
  const root = payload as Record<string, unknown>
  if (Array.isArray(root.content)) return root.content as T[]
  if (Array.isArray(root.data)) return root.data as T[]
  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>
    if (Array.isArray(nested.content)) return nested.content as T[]
    if (Array.isArray(nested.data)) return nested.data as T[]
  }
  return []
}

/** Prefer axios response body → data wrapper → list. */
export function unwrapAxiosList<T = Record<string, unknown>>(resData: unknown): T[] {
  if (!resData || typeof resData !== "object") return []
  const body = resData as Record<string, unknown>
  // Most LMS endpoints: { data: { content: [...] } } or { data: [...] }
  if ("data" in body) return unwrapList<T>(body.data ?? body)
  return unwrapList<T>(body)
}
