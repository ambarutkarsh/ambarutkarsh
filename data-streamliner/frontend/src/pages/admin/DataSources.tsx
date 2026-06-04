import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl, Alert, CircularProgress,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { dataSourcesApi, DataSource } from '../../api/dataSources'
import { useForm, Controller } from 'react-hook-form'

const DB_TYPES = ['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle']

interface FormData {
  name: string
  description: string
  db_type: string
  host: string
  port: number
  database_name: string
  schema_name: string
  username: string
  password: string
  ssl_mode: string
  connection_timeout: number
  query_timeout: number
}

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DataSource | null>(null)
  const [error, setError] = useState('')
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; latency_ms?: number }>>({})
  const [testing, setTesting] = useState<number | null>(null)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    defaultValues: { db_type: 'postgresql', port: 5432, ssl_mode: 'disable', connection_timeout: 30, query_timeout: 30 },
  })

  const load = () => {
    setLoading(true)
    dataSourcesApi.list().then((data) => { setSources(data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ db_type: 'postgresql', port: 5432, ssl_mode: 'disable', connection_timeout: 30, query_timeout: 30 })
    setOpen(true)
  }

  const openEdit = (ds: DataSource) => {
    setEditing(ds)
    reset({ ...ds, password: '' })
    setOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      if (editing) {
        await dataSourcesApi.update(editing.id, data)
      } else {
        await dataSourcesApi.create(data as any)
      }
      setOpen(false)
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error saving data source')
    }
  }

  const testConnection = async (id: number) => {
    setTesting(id)
    try {
      const result = await dataSourcesApi.test(id)
      setTestResults((prev) => ({ ...prev, [id]: result }))
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { success: false } }))
    }
    setTesting(null)
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Data Sources</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Data Source</Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>Database</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Connection</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sources.map((ds) => {
              const testResult = testResults[ds.id]
              return (
                <TableRow key={ds.id}>
                  <TableCell>
                    <Typography fontWeight="600">{ds.name}</Typography>
                    {ds.description && <Typography variant="caption" color="text.secondary">{ds.description}</Typography>}
                  </TableCell>
                  <TableCell><Chip label={ds.db_type} size="small" /></TableCell>
                  <TableCell>{ds.host}:{ds.port}</TableCell>
                  <TableCell>{ds.database_name}</TableCell>
                  <TableCell>
                    <Chip label={ds.is_active ? 'Active' : 'Inactive'} color={ds.is_active ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    {testResult && (
                      <Tooltip title={testResult.success ? `Latency: ${testResult.latency_ms}ms` : 'Connection failed'}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {testResult.success
                            ? <><CheckCircleIcon fontSize="small" color="success" /><Typography variant="caption" color="success.main">{testResult.latency_ms}ms</Typography></>
                            : <><ErrorIcon fontSize="small" color="error" /><Typography variant="caption" color="error">Failed</Typography></>
                          }
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => testConnection(ds.id)} disabled={testing === ds.id}>
                      {testing === ds.id ? <CircularProgress size={16} /> : <PlayArrowIcon fontSize="small" color="success" />}
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(ds)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={async () => { await dataSourcesApi.delete(ds.id); load() }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Data Source' : 'Add Data Source'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField fullWidth label="Name" margin="dense" {...register('name', { required: true })} error={!!errors.name} />
            <TextField fullWidth label="Description" margin="dense" {...register('description')} />
            <FormControl fullWidth margin="dense">
              <InputLabel>Database Type</InputLabel>
              <Controller name="db_type" control={control} render={({ field }) => (
                <Select {...field} label="Database Type">
                  {DB_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
            <Box display="flex" gap={1}>
              <TextField fullWidth label="Host" margin="dense" {...register('host', { required: true })} error={!!errors.host} />
              <TextField label="Port" margin="dense" type="number" sx={{ width: 120 }} {...register('port', { required: true, valueAsNumber: true })} />
            </Box>
            <TextField fullWidth label="Database Name" margin="dense" {...register('database_name', { required: true })} error={!!errors.database_name} />
            <TextField fullWidth label="Schema (optional)" margin="dense" {...register('schema_name')} />
            <TextField fullWidth label="Username" margin="dense" {...register('username', { required: true })} error={!!errors.username} />
            <TextField fullWidth label={editing ? 'Password (blank to keep)' : 'Password'} type="password" margin="dense"
              {...register('password', { required: !editing })} error={!!errors.password} />
            <Box display="flex" gap={1}>
              <TextField fullWidth label="Connection Timeout (s)" type="number" margin="dense" {...register('connection_timeout', { valueAsNumber: true })} />
              <TextField fullWidth label="Query Timeout (s)" type="number" margin="dense" {...register('query_timeout', { valueAsNumber: true })} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editing ? 'Update' : 'Add & Test'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
