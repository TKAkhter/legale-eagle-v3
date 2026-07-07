import { useState, useCallback } from 'react'

interface UseFormSubmitOptions {
  onSuccess?: () => void
  successMessage?: string
}

/**
 * Wraps any async form submit with:
 *  - loading state
 *  - error capture (API message or fallback)
 *  - success callback
 *
 * Usage:
 *   const { submit, error, isSubmitting, clearError } = useFormSubmit({ onSuccess: onClose })
 *   const handleSave = () => submit(() => axiosClient.post(...))
 */
export function useFormSubmit({ onSuccess }: UseFormSubmitOptions = {}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await fn()
      onSuccess?.()
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as { message?: string })?.message
        ?? 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }, [onSuccess])

  return { submit, error, isSubmitting, clearError: () => setError(null) }
}
