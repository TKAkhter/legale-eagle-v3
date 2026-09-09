/**
 * useDraftSave.ts — auto-save form draft to localStorage.
 * Compatible with react-hook-form v7.
 *
 * Usage:
 *   const { hasDraft, loadDraft, clearDraft } = useDraftSave('lead-form', getValues, reset, isEdit)
 *   {hasDraft && !isEdit && <DraftBanner onRestore={loadDraft} onDiscard={clearDraft} />}
 */
import { useEffect, useRef, useState, useCallback } from 'react'

export interface DraftSaveResult {
  hasDraft:   boolean
  loadDraft:  () => void
  clearDraft: () => void
}

export function useDraftSave(
  key:       string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getValues: () => Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reset:     (values: Record<string, any>) => void,
  isEdit  = false,
  delay   = 2000,
): DraftSaveResult {
  const storageKey = `draft:${key}`
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [hasDraft, setHasDraft] = useState(
    () => { try { return !isEdit && !!localStorage.getItem(storageKey) } catch { return false } }
  )

  /** Call this from your form's onChange to trigger debounced save */
  const onFormChange = useCallback((values: Record<string, unknown>) => {
    if (isEdit) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        const hasContent = Object.values(values).some(v => v !== undefined && v !== '' && v !== null)
        if (hasContent) { localStorage.setItem(storageKey, JSON.stringify(values)); setHasDraft(true) }
      } catch { /* quota exceeded */ }
    }, delay)
  }, [isEdit, storageKey, delay])

  // Expose onFormChange via a ref so callers can subscribe to it
  const onFormChangeRef = useRef(onFormChange)
  useEffect(() => { onFormChangeRef.current = onFormChange }, [onFormChange])

  const loadDraft  = useCallback(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) { reset(JSON.parse(raw)); setHasDraft(false) } }
    catch { /* corrupted */ }
  }, [storageKey, reset])

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); setHasDraft(false) } catch { /* ignore */ }
  }, [storageKey])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { hasDraft, loadDraft, clearDraft }
}
