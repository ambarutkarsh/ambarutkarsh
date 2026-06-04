import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Card, CardContent, Grid, Chip, CircularProgress, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import PublishIcon from '@mui/icons-material/Publish'
import { datasetsApi, Dataset } from '../../api/datasets'
import { useAuth } from '../../hooks/useAuth'

export default function DatasetList() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { isDataAdmin } = useAuth()

  const load = () => {
    setLoading(true)
    datasetsApi.list().then((data) => { setDatasets(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const publish = async (id: number) => {
    await datasetsApi.publish(id)
    load()
  }

  const statusColor = (s: string) => s === 'published' ? 'success' : s === 'draft' ? 'warning' : 'default'

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Datasets</Typography>
        {isDataAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/datasets/new')}>
            New Dataset
          </Button>
        )}
      </Box>
      {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {datasets.map((ds) => (
            <Grid item xs={12} sm={6} md={4} key={ds.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" fontWeight="600">{ds.name}</Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>{ds.description}</Typography>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      {isDataAdmin() && (
                        <>
                          <IconButton size="small" onClick={() => navigate(`/datasets/${ds.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                          {ds.status === 'draft' && (
                            <IconButton size="small" color="success" onClick={() => publish(ds.id)}><PublishIcon fontSize="small" /></IconButton>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>
                  <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                    <Chip label={ds.status} color={statusColor(ds.status) as any} size="small" />
                    <Chip label={ds.source_type} size="small" variant="outlined" />
                    <Chip label={`v${ds.version}`} size="small" variant="outlined" />
                    <Chip label={`${ds.fields.length} fields`} size="small" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {datasets.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" textAlign="center">No datasets yet. Create one to get started.</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  )
}
