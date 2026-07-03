import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

type Primitive = string | number | boolean | null | undefined

export function useUrlState<T extends Record<string, Primitive>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = Object.fromEntries(
    Object.entries(defaults).map(([key, def]) => {
      const raw = searchParams.get(key)
      if (raw === null) return [key, def]
      if (typeof def === 'number') return [key, Number(raw)]
      if (typeof def === 'boolean') return [key, raw === 'true']
      return [key, raw]
    }),
  ) as T

  const setState = useCallback((updates: Partial<T>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v == null || v === '') next.delete(k)
        else next.set(k, String(v))
      })
      return next
    }, { replace: true })
  }, [setSearchParams])

  const resetState = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  return { state, setState, resetState }
}
