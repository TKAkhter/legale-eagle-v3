/**
 * PageTransition — wraps page content with a smooth fade-in.
 * Used in router.tsx to animate between route changes.
 */
import { Box } from '@mui/material'
import { type ReactNode } from 'react'

interface Props { children: ReactNode }

export function PageTransition({ children }: Props) {
  return (
    <Box
      sx={{
        animation: 'fadeIn 200ms ease-in',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {children}
    </Box>
  )
}
