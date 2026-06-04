import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

interface Props {
  message?: string
  size?: number
}

export default function LoadingSpinner({ message = 'Loading...', size = 40 }: Props) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4} gap={2}>
      <CircularProgress size={size} color="primary" />
      {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
    </Box>
  )
}
