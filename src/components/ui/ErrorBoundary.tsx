/**
 * ErrorBoundary.tsx — React error boundary with a friendly fallback UI.
 *
 * Wraps every page via PageShell. Shows a friendly error card
 * with a retry button and error detail (dev mode only).
 */
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Box, Typography, Button, Paper, Alert } from '@mui/material'
import RefreshIcon    from '@mui/icons-material/Refresh'
import BugReportIcon  from '@mui/icons-material/BugReport'

interface Props    { children: ReactNode; fallback?: ReactNode }
interface State    { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to your error tracking service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info)
  }

  reset() { this.setState({ hasError: false, error: null }) }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback)  return this.props.fallback

    const isDev = import.meta.env.DEV

    return (
      <Box sx={{
        display:        'flex',
        justifyContent: 'center',
        alignItems:     'flex-start',
        p:              4,
        minHeight:      320,
      }}>
        <Paper
          variant="outlined"
          sx={{ p: 4, borderRadius: 2, maxWidth: 560, width: '100%', textAlign: 'center' }}
        >
          {/* Icon */}
          <Box sx={{
            width: 64, height: 64, borderRadius: '50%',
            bgcolor: 'error.light', display: 'flex',
            alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
          }}>
            <BugReportIcon sx={{ fontSize: 32, color: 'error.contrastText' }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
            An unexpected error occurred on this page. You can try refreshing,
            or navigate to another page.
          </Typography>

          {/* Dev-only error detail */}
          {isDev && this.state.error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left', fontSize: 12 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                {this.state.error.message}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => { this.reset(); window.location.reload() }}
            >
              Try again
            </Button>
          </Box>
        </Paper>
      </Box>
    )
  }
}
