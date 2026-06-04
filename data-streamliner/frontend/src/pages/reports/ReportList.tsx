import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Grid, Card, CardContent, Chip, IconButton, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { reportsApi, Report } from '../../api/reports'
import { useAuth } from '../../hooks/useAuth'

export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { isReportCreator } = useAuth()

  const load = () => {
    setLoading(true)
    reportsApi.list().then((data) => { setReports(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteReport = async (id: number) => {
    if (!confirm('Delete this report?')) return
    await reportsApi.delete(id)
    load()
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Reports</Typography>
        {isReportCreator() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/reports/new')}>
            New Report
          </Button>
        )}
      </Box>
      {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {reports.map((r) => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight="600">{r.name}</Typography>
                    <Box>
                      <IconButton size="small" onClick={() => navigate(`/reports/${r.id}`)}><OpenInNewIcon fontSize="small" /></IconButton>
                      {isReportCreator() && (
                        <>
                          <IconButton size="small" onClick={() => navigate(`/reports/${r.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteReport(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                  {r.description && <Typography variant="body2" color="text.secondary" mt={0.5}>{r.description}</Typography>}
                  <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                    {r.is_public && <Chip label="Public" color="success" size="small" />}
                    {r.config?.chart_type && <Chip label={r.config.chart_type} size="small" variant="outlined" />}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {reports.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" textAlign="center">No reports yet.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  )
}
