import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, CircularProgress, Alert, Divider, Tab, Tabs,
  Checkbox, FormControlLabel, List, ListItemText, ListItemButton, IconButton,
  Paper, Tooltip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SaveIcon from '@mui/icons-material/Save'
import BarChartIcon from '@mui/icons-material/BarChart'
import TableChartIcon from '@mui/icons-material/TableChart'
import { datasetsApi, Dataset, DatasetField } from '../../api/datasets'
import { reportsApi } from '../../api/reports'
import { queryApi } from '../../api/query'
import DataTable from '../../components/DataGrid/DataTable'
import ChartRenderer from '../../components/Charts/ChartRenderer'

export default function ReportBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[]; row_count: number; execution_time_ms: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState('bar_chart')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [chartRecos, setChartRecos] = useState<string[]>([])
  const [reportName, setReportName] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    datasetsApi.list().then(setDatasets)
    if (id) {
      reportsApi.get(Number(id)).then((report) => {
        setReportName(report.name)
        setReportDesc(report.description || '')
        const cfg = report.config || {}
        setChartType(cfg.chart_type || 'bar_chart')
        setSelectedFields(cfg.selected_fields || [])
        setFilters(cfg.filters || {})
        if (report.dataset_id) {
          datasetsApi.get(report.dataset_id).then(setSelectedDataset)
        }
      })
    }
  }, [id])

  useEffect(() => {
    if (id) {
      reportsApi.chartRecommendations(Number(id)).then((r) => {
        setChartRecos(r.chart_types || [])
        if (r.chart_types?.length > 0) setChartType(r.chart_types[0])
      }).catch(() => {})
    }
  }, [id, selectedFields])

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]
    )
  }

  const runQuery = async () => {
    if (!selectedDataset || selectedFields.length === 0) {
      setError('Select a dataset and at least one field')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await queryApi.runAdHoc(selectedDataset.id, selectedFields, filters, 1000)
      setQueryResult(result)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Query failed')
    }
    setLoading(false)
  }

  const save = async () => {
    if (!reportName || !selectedDataset) return
    setSaving(true)
    const payload = {
      name: reportName,
      description: reportDesc,
      dataset_id: selectedDataset.id,
      config: { selected_fields: selectedFields, filters, chart_type: chartType },
      is_public: false,
      allowed_roles: [],
    }
    try {
      if (id) {
        await reportsApi.update(Number(id), payload)
      } else {
        await reportsApi.create(payload)
      }
      navigate('/reports')
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!id) return
    const response = await queryApi.export(Number(id), format, filters)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `report.${format}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const fieldsByType = {
    attributes: selectedDataset?.fields.filter((f) => f.field_type === 'attribute') || [],
    measures: selectedDataset?.fields.filter((f) => f.field_type === 'measure') || [],
    dimensions: selectedDataset?.fields.filter((f) => f.field_type === 'dimension') || [],
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">{id ? 'Edit Report' : 'New Report'}</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={runQuery} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Run'}
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* Left Panel - Field Selector */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '80vh', overflow: 'auto' }}>
            <CardContent>
              <TextField fullWidth label="Report Name" size="small" value={reportName}
                onChange={(e) => setReportName(e.target.value)} sx={{ mb: 1 }} />
              <TextField fullWidth label="Description" size="small" value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)} sx={{ mb: 2 }} />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Dataset</InputLabel>
                <Select value={selectedDataset?.id || ''} label="Dataset"
                  onChange={(e) => {
                    const ds = datasets.find((d) => d.id === Number(e.target.value))
                    setSelectedDataset(ds || null)
                    setSelectedFields([])
                  }}>
                  {datasets.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>

              {selectedDataset && (
                <>
                  {Object.entries(fieldsByType).map(([groupName, fields]) => fields.length > 0 && (
                    <Box key={groupName} mb={1}>
                      <Typography variant="overline" color="text.secondary">{groupName}</Typography>
                      {fields.map((f) => (
                        <ListItemButton key={f.source_column} dense
                          selected={selectedFields.includes(f.source_column)}
                          onClick={() => toggleField(f.source_column)}
                          sx={{ borderRadius: 1, py: 0.5 }}>
                          <ListItemText
                            primary={f.business_name}
                            secondary={f.aggregation_type !== 'none' ? f.aggregation_type : f.data_type}
                            primaryTypographyProps={{ fontSize: '0.8rem' }}
                            secondaryTypographyProps={{ fontSize: '0.7rem' }}
                          />
                          {f.is_pii && <Chip label="PII" size="small" color="warning" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem' }} />}
                        </ListItemButton>
                      ))}
                    </Box>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Center - Data + Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1 }}>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">Chart:</Typography>
                {chartRecos.map((ct) => (
                  <Chip key={ct} label={ct} size="small" variant={chartType === ct ? 'filled' : 'outlined'}
                    color={chartType === ct ? 'primary' : 'default'}
                    onClick={() => setChartType(ct)} />
                ))}
                <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ ml: 'auto' }}>
                  <Tab value="table" icon={<TableChartIcon />} iconPosition="start" label="Table" sx={{ minHeight: 36, py: 0 }} />
                  <Tab value="chart" icon={<BarChartIcon />} iconPosition="start" label="Chart" sx={{ minHeight: 36, py: 0 }} />
                </Tabs>
              </Box>
            </CardContent>
          </Card>

          {queryResult ? (
            viewMode === 'table' ? (
              <DataTable columns={queryResult.columns} rows={queryResult.rows} rowCount={queryResult.row_count}
                reportId={id ? Number(id) : undefined} onExport={handleExport} height={500}
                title={`${queryResult.row_count.toLocaleString()} rows · ${queryResult.execution_time_ms}ms`} />
            ) : (
              <Card>
                <CardContent>
                  <ChartRenderer
                    chartType={chartType}
                    columns={queryResult.columns}
                    rows={queryResult.rows}
                    height={500}
                  />
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box textAlign="center">
                  <Typography color="text.secondary">Select fields and click Run to see data</Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Panel - Chart Config */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '80vh', overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Chart Config</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Chart Type</InputLabel>
                <Select value={chartType} label="Chart Type" onChange={(e) => setChartType(e.target.value)}>
                  {['kpi_card', 'bar_chart', 'stacked_bar_chart', 'grouped_bar_chart', 'line_chart', 'area_chart', 'pie_chart', 'donut_chart', 'gauge_chart', 'heatmap', 'table'].map((ct) => (
                    <MenuItem key={ct} value={ct}>{ct.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" mb={1}>Selected Fields</Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {selectedFields.map((f) => (
                  <Chip key={f} label={f} size="small" onDelete={() => toggleField(f)} />
                ))}
              </Box>

              {queryResult && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" mb={1}>Execution Stats</Typography>
                  <Typography variant="caption" display="block">Rows: {queryResult.row_count.toLocaleString()}</Typography>
                  <Typography variant="caption" display="block">Time: {queryResult.execution_time_ms}ms</Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
