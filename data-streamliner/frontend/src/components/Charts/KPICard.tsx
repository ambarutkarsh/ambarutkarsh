import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { formatValue } from './chartUtils'

interface Props {
  label: string
  value: any
  format?: string
  decimalPlaces?: number
  subtitle?: string
}

export default function KPICard({ label, value, format, decimalPlaces = 2, subtitle }: Props) {
  return (
    <Card sx={{ height: '100%', minHeight: 140 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={1}>
              {label}
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary" mt={0.5}>
              {formatValue(value, format, decimalPlaces)}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: 'primary.light',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              opacity: 0.8,
            }}
          >
            <TrendingUpIcon sx={{ color: 'white' }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
