import React, { useEffect, useState } from 'react'
import { Grid, Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { datasetsApi } from '../api/datasets'
import { reportsApi } from '../api/reports'
import { dashboardsApi } from '../api/dashboards'
import { useAuth } from '../hooks/useAuth'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import TableChartIcon from '@mui/icons-material/TableChart'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ datasets: 0, reports: 0, dashboards: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      datasetsApi.list().catch(() => []),
      reportsApi.list().catch(() => []),
      dashboardsApi.list().catch(() => []),
    ]).then(([datasets, reports, dashboards]) => {
      setStats({ datasets: datasets.length, reports: reports.length, dashboards: dashboards.length })
      setLoading(false)
    })
  }, [])

  const cards = [
    { label: 'Datasets', value: stats.datasets, icon: <TableChartIcon sx={{ fontSize: 40 }} />, path: '/datasets', color: '#1A237E' },
    { label: 'Reports', value: stats.reports, icon: <AssessmentIcon sx={{ fontSize: 40 }} />, path: '/reports', color: '#E31837' },
    { label: 'Dashboards', value: stats.dashboards, icon: <ViewModuleIcon sx={{ fontSize: 40 }} />, path: '/dashboards', color: '#2196F3' },
  ]

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Welcome, {user?.full_name || user?.username}
        </Typography>
        <Typography variant="body1" color="text.secondary" mt={0.5}>
          Star Health Insurance — Renewal Analytics Dashboard
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {cards.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.label}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }, transition: 'all 0.2s' }}
                onClick={() => navigate(c.path)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="overline" color="text.secondary">{c.label}</Typography>
                      <Typography variant="h3" fontWeight="bold" sx={{ color: c.color }}>
                        {c.value}
                      </Typography>
                    </Box>
                    <Box sx={{ color: c.color, opacity: 0.7 }}>{c.icon}</Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="600" mb={2}>Platform Overview</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The Star Health Data Streamliner is a self-service analytics platform for renewal analytics.
              Connect data sources, build datasets with semantic mappings, create reports with multiple chart types,
              and assemble interactive dashboards — all without writing SQL.
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {['Renewal Rate', 'Premium Analytics', 'Claim Trends', 'Policy Lapse', 'Customer Segmentation'].map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" color="primary" />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
