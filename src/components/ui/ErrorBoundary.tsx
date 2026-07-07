import { Component, type ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false } }

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', p:4 }}>
          <Paper variant="outlined" sx={{ p:5, borderRadius:2, textAlign:'center', maxWidth:480 }}>
            <ErrorOutlineIcon sx={{ fontSize:56, color:'error.main', mb:2 }} />
            <Typography variant="h5" sx={{ fontWeight:700, mb:1 }}>Something went wrong</Typography>
            <Typography color="text.secondary" sx={{ mb:3 }}>
              {this.state.error?.message ?? 'An unexpected error occurred. Please refresh the page.'}
            </Typography>
            <Button variant="contained" onClick={() => { this.setState({ hasError:false }); window.location.reload() }}>
              Refresh Page
            </Button>
          </Paper>
        </Box>
      )
    }
    return this.props.children
  }
}
