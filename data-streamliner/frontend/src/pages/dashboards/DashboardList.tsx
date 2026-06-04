import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Grid, Card, CardContent, Chip, IconButton, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DeleteIcon from '@mui/icons-material/Delete'
import PublishIcon from '@mui/icons-material/Publish'
import { dashboardsApi, Dashboard } from '../../api/dashboards'
import { useAuth } from '../../hooks/useAuth'

export default function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { isReportCreator } = useAuth()

  const load = () => {
    setLoading(true)
    dashboardsApi.list().then((data) => { setDashboards(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const publish = async (id: number) => {
    await dashboardsApi.publish(id)
    load()
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Dashboards</Typography>
        {isReportCreator() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/dashboards/new')}>
            New Dashboard
          </Button>
        )}
      </Box>
      {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {dashboards.map((d) => (
            <Grid item xs={12} sm={6} md={4} key={d.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" fontWeight="600">{d.name}</Typography>
                      {d.description && <Typography variant="body2" color="text.secondary" mt={0.5}>{d.description}</Typography>}
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => navigate(`/dashboards/${d.id}`)}><OpenInNewIcon fontSize="small" /></IconButton>
                      {isReportCreator() && d.status === 'draft' && (
                        <IconButton size="small" color="success" onClick={() => publish(d.id)}><PublishIcon fontSize="small" /></IconButton>
                      )}
                      {isReportCreator() && (
                        <IconButton size="small" color="error" onClick={async () => { await dashboardsApi.delete(d.id); load() }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                    <Chip label={d.status} color={d.status === 'published' ? 'success' : 'warning'} size="small" />
                    <Chip label={`${d.widgets.length} widgets`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {dashboards.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" textAlign="center">No dashboards yet.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  )
}
