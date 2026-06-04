import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, CircularProgress, Alert, Button, Card, CardContent, CardHeader, IconButton, Chip } from '@mui/material'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import RefreshIcon from '@mui/icons-material/Refresh'
import { dashboardsApi, Dashboard, DashboardWidget } from '../../api/dashboards'
import { reportsApi } from '../../api/reports'
import ChartRenderer from '../../components/Charts/ChartRenderer'
import DataTable from '../../components/DataGrid/DataTable'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface WidgetData {
  widgetId: number
  reportId: number
  result: { columns: string[]; rows: any[]; execution_time_ms: number; row_count: number } | null
  loading: boolean
  error: string
  reportName: string
  chartType: string
}

export default function DashboardViewer() {
  const { id } = useParams()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [widgetData, setWidgetData] = useState<Record<number, WidgetData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({})

  const loadWidgetData = useCallback(async (widget: DashboardWidget, filters: Record<string, any>) => {
    if (!widget.report_id) return
    setWidgetData((prev) => ({
      ...prev,
      [widget.id!]: { ...prev[widget.id!], loading: true, error: '' },
    }))
    try {
      const result = await reportsApi.execute(widget.report_id, filters)
      const report = await reportsApi.get(widget.report_id)
      setWidgetData((prev) => ({
        ...prev,
        [widget.id!]: {
          widgetId: widget.id!,
          reportId: widget.report_id!,
          result,
          loading: false,
          error: '',
          reportName: report.name,
          chartType: report.config?.chart_type || 'bar_chart',
        },
      }))
    } catch (e: any) {
      setWidgetData((prev) => ({
        ...prev,
        [widget.id!]: { ...prev[widget.id!], loading: false, error: e.response?.data?.detail || 'Error loading widget' },
      }))
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const dash = await dashboardsApi.get(Number(id))
      setDashboard(dash)
      for (const widget of dash.widgets) {
        await loadWidgetData(widget, globalFilters)
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load dashboard')
    }
    setLoading(false)
  }, [id, globalFilters, loadWidgetData])

  useEffect(() => { loadDashboard() }, [id])

  const refresh = async () => {
    if (!dashboard) return
    for (const widget of dashboard.widgets) {
      await loadWidgetData(widget, globalFilters)
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!dashboard) return null

  const layouts = {
    lg: dashboard.widgets.map((w) => ({
      i: String(w.id),
      x: w.position?.x ?? 0,
      y: w.position?.y ?? 0,
      w: w.position?.w ?? 6,
      h: w.position?.h ?? 4,
    })),
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">{dashboard.name}</Typography>
          {dashboard.description && <Typography variant="body2" color="text.secondary">{dashboard.description}</Typography>}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={dashboard.status} color={dashboard.status === 'published' ? 'success' : 'warning'} size="small" />
          <Button startIcon={<RefreshIcon />} onClick={refresh} variant="outlined" size="small">Refresh</Button>
        </Box>
      </Box>

      {dashboard.widgets.length === 0 ? (
        <Alert severity="info">No widgets in this dashboard. Edit to add reports.</Alert>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 12, sm: 6 }}
          rowHeight={80}
          isDraggable={false}
          isResizable={false}
        >
          {dashboard.widgets.map((widget) => {
            const wd = widgetData[widget.id!]
            return (
              <div key={String(widget.id)}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader
                    title={<Typography variant="subtitle2" fontWeight="600">{widget.title || wd?.reportName || 'Widget'}</Typography>}
                    sx={{ py: 1, px: 2 }}
                  />
                  <CardContent sx={{ flex: 1, pt: 0, overflow: 'hidden' }}>
                    {wd?.loading && <Box display="flex" justifyContent="center"><CircularProgress size={24} /></Box>}
                    {wd?.error && <Alert severity="error" sx={{ py: 0 }}>{wd.error}</Alert>}
                    {wd?.result && !wd.loading && (
                      widget.widget_type === 'table' ? (
                        <DataTable columns={wd.result.columns} rows={wd.result.rows} height={200} />
                      ) : (
                        <ChartRenderer chartType={wd.chartType} columns={wd.result.columns} rows={wd.result.rows} height={200} />
                      )
                    )}
                    {!wd && !loading && <Typography color="text.secondary" variant="body2">No data</Typography>}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </ResponsiveGridLayout>
      )}
    </Box>
  )
}
