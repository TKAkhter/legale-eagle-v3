import { useThemeStore } from '@lib/store/themeStore'
export function useRTL() {
  const direction = useThemeStore((s) => s.direction)
  return { isRTL: direction === 'rtl', direction }
}
