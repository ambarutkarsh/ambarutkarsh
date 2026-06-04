import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, Stepper, Step, StepLabel, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Card, CardContent, Grid, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Switch, FormControlLabel,
  IconButton, Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { dataSourcesApi, DataSource } from '../../api/dataSources'
import { datasetsApi, DatasetField } from '../../api/datasets'
import DataTable from '../../components/DataGrid/DataTable'

const STEPS = ['Basic Info', 'Source Selection', 'Field Mapping', 'Measure Config', 'Preview & Publish']
const FIELD_TYPES = ['attribute', 'measure', 'dimension', 'calculated']
const DATA_TYPES = ['string', 'integer', 'decimal', 'date', 'datetime', 'boolean']
const AGG_TYPES = ['none', 'count', 'count_distinct', 'sum', 'avg', 'min', 'max', 'percentage', 'ratio']

export default function DatasetBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [tables, setTables] = useState<{ name: string; type: string }[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[] } | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    data_source_id: 0,
    source_type: 'table',
    source_config: { table: '', schema: '', sql: '' },
    default_filters: {},
    fields: [] as DatasetField[],
  })

  useEffect(() => {
    dataSourcesApi.list().then(setDataSources)
    if (id) {
      datasetsApi.get(Number(id)).then((ds) => {
        setForm({
          name: ds.name,
          description: ds.description || '',
          data_source_id: ds.data_source_id,
          source_type: ds.source_type,
          source_config: (ds.source_config || { table: '', schema: '', sql: '' }) as any,
          default_filters: ds.default_filters || {},
          fields: ds.fields,
        })
        loadTables(ds.data_source_id, (ds.source_config as any)?.schema)
      })
    }
  }, [id])

  const loadTables = async (dsId: number, schema?: string) => {
    const tbs = await dataSourcesApi.getTables(dsId, schema)
    setTables(tbs)
  }

  const loadColumns = async (table: string) => {
    const cols = await dataSourcesApi.getColumns(form.data_source_id, table, form.source_config.schema)
    setColumns(cols)
    if (form.fields.length === 0) {
      setForm((f) => ({
        ...f,
        fields: cols.map((c, i) => ({
          source_column: c.name,
          business_name: c.name,
          field_type: 'attribute',
          data_type: inferDataType(c.type),
          aggregation_type: 'none',
          decimal_places: 2,
          is_visible: true,
          is_filterable: true,
          is_exportable: true,
          is_pii: false,
          sort_order: i,
        })),
      }))
    }
  }

  const inferDataType = (sqlType: string): string => {
    const t = sqlType.toLowerCase()
    if (t.includes('int') || t.includes('bigint')) return 'integer'
    if (t.includes('decimal') || t.includes('numeric') || t.includes('float') || t.includes('double')) return 'decimal'
    if (t.includes('date') && t.includes('time')) return 'datetime'
    if (t.includes('date')) return 'date'
    if (t.includes('bool')) return 'boolean'
    return 'string'
  }

  const updateField = (idx: number, key: string, value: any) => {
    setForm((f) => {
      const fields = [...f.fields]
      fields[idx] = { ...fields[idx], [key]: value }
      return { ...f, fields }
    })
  }

  const addField = () => {
    setForm((f) => ({
      ...f,
      fields: [...f.fields, {
        source_column: '', business_name: '', field_type: 'attribute', data_type: 'string',
        aggregation_type: 'none', decimal_places: 2, is_visible: true, is_filterable: true,
        is_exportable: true, is_pii: false, sort_order: f.fields.length,
      }],
    }))
  }

  const removeField = (idx: number) => {
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }))
  }

  const save = async () => {
    setError('')
    setLoading(true)
    try {
      if (id) {
        await datasetsApi.update(Number(id), form)
      } else {
        await datasetsApi.create(form as any)
      }
      navigate('/datasets')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error saving dataset')
    }
    setLoading(false)
  }

  const loadPreview = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await datasetsApi.preview(Number(id))
      setPreviewData(data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Preview failed')
    }
    setLoading(false)
  }

  const publish = async () => {
    if (!id) return
    await datasetsApi.publish(Number(id))
    navigate('/datasets')
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>{id ? 'Edit Dataset' : 'New Dataset'}</Typography>
      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Basic Information</Typography>
            <TextField fullWidth label="Dataset Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} margin="normal" required />
            <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} margin="normal" multiline rows={2} />
            <FormControl fullWidth margin="normal">
              <InputLabel>Data Source</InputLabel>
              <Select value={form.data_source_id} label="Data Source" onChange={(e) => {
                const dsId = Number(e.target.value)
                setForm((f) => ({ ...f, data_source_id: dsId }))
                loadTables(dsId)
              }}>
                {dataSources.map((ds) => <MenuItem key={ds.id} value={ds.id}>{ds.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Source Type</InputLabel>
              <Select value={form.source_type} label="Source Type" onChange={(e) => setForm((f) => ({ ...f, source_type: e.target.value }))}>
                <MenuItem value="table">Table</MenuItem>
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="query">Custom SQL</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Source Selection</Typography>
            {form.source_type !== 'query' ? (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Table / View</InputLabel>
                  <Select value={form.source_config.table} label="Table / View" onChange={(e) => {
                    setForm((f) => ({ ...f, source_config: { ...f.source_config, table: e.target.value } }))
                    loadColumns(e.target.value)
                  }}>
                    {tables.map((t) => <MenuItem key={t.name} value={t.name}>{t.name} ({t.type})</MenuItem>)}
                  </Select>
                </FormControl>
              </>
            ) : (
              <TextField fullWidth label="SQL Query" multiline rows={8} value={form.source_config.sql}
                onChange={(e) => setForm((f) => ({ ...f, source_config: { ...f.source_config, sql: e.target.value } }))}
                margin="normal" placeholder="SELECT * FROM renewals WHERE year = 2024" />
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Field Mapping</Typography>
              <Button startIcon={<AddIcon />} onClick={addField} size="small">Add Field</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source Column</TableCell>
                  <TableCell>Business Name</TableCell>
                  <TableCell>Data Type</TableCell>
                  <TableCell>Visible</TableCell>
                  <TableCell>PII</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.fields.map((f, idx) => (
                  <TableRow key={idx}>
                    <TableCell><TextField size="small" value={f.source_column} onChange={(e) => updateField(idx, 'source_column', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" value={f.business_name} onChange={(e) => updateField(idx, 'business_name', e.target.value)} /></TableCell>
                    <TableCell>
                      <Select size="small" value={f.data_type} onChange={(e) => updateField(idx, 'data_type', e.target.value)}>
                        {DATA_TYPES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell><Switch size="small" checked={f.is_visible} onChange={(e) => updateField(idx, 'is_visible', e.target.checked)} /></TableCell>
                    <TableCell><Switch size="small" checked={f.is_pii} onChange={(e) => updateField(idx, 'is_pii', e.target.checked)} /></TableCell>
                    <TableCell><IconButton size="small" color="error" onClick={() => removeField(idx)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Measure & Dimension Configuration</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Business Name</TableCell>
                  <TableCell>Field Type</TableCell>
                  <TableCell>Aggregation</TableCell>
                  <TableCell>Decimal Places</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.fields.map((f, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{f.business_name}</TableCell>
                    <TableCell>
                      <Select size="small" value={f.field_type} onChange={(e) => updateField(idx, 'field_type', e.target.value)}>
                        {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select size="small" value={f.aggregation_type} onChange={(e) => updateField(idx, 'aggregation_type', e.target.value)}>
                        {AGG_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={f.decimal_places} onChange={(e) => updateField(idx, 'decimal_places', Number(e.target.value))} sx={{ width: 80 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Preview & Publish</Typography>
            {id ? (
              <>
                <Button variant="outlined" onClick={loadPreview} disabled={loading} sx={{ mb: 2 }}>
                  {loading ? <CircularProgress size={20} /> : 'Load Preview (50 rows)'}
                </Button>
                {previewData && (
                  <DataTable columns={previewData.columns} rows={previewData.rows} height={300} />
                )}
              </>
            ) : (
              <Alert severity="info">Save the dataset first to preview data.</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <Box display="flex" gap={1}>
          {step < STEPS.length - 1 ? (
            <Button variant="contained" onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <>
              <Button variant="outlined" onClick={save} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Save'}</Button>
              {id && <Button variant="contained" color="success" onClick={publish}>Publish</Button>}
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
