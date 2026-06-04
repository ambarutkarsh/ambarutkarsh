import React, { useState, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Box, TextField, Button, Typography, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DownloadIcon from '@mui/icons-material/Download'
import { queryApi } from '../../api/query'

interface Props {
  columns: string[]
  rows: Record<string, any>[]
  rowCount?: number
  reportId?: number
  onExport?: (format: 'csv' | 'xlsx') => void
  height?: number
  title?: string
}

export default function DataTable({ columns, rows, rowCount, reportId, onExport, height = 400, title }: Props) {
  const [quickFilter, setQuickFilter] = useState('')
  const gridApiRef = useRef<GridApi | null>(null)

  const colDefs: ColDef[] = columns.map((col) => ({
    field: col,
    headerName: col,
    sortable: true,
    resizable: true,
    filter: true,
    minWidth: 100,
    cellStyle: (params) => {
      const val = params.value
      if (typeof val === 'number') {
        if (col.toLowerCase().includes('rate') || col.toLowerCase().includes('percent')) {
          if (val >= 80) return { color: '#2e7d32', fontWeight: 'bold' }
          if (val >= 60) return { color: '#e65100' }
          return { color: '#c62828' }
        }
      }
      return null
    },
    valueFormatter: (params) => {
      if (params.value === null || params.value === undefined) return ''
      if (typeof params.value === 'number') return params.value.toLocaleString('en-IN')
      return String(params.value)
    },
  }))

  const defaultColDef: ColDef = {
    flex: 1,
    minWidth: 80,
  }

  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridApiRef.current = event.api
  }, [])

  const handleExportCsv = () => {
    if (onExport) {
      onExport('csv')
    } else {
      gridApiRef.current?.exportDataAsCsv({ fileName: `export_${Date.now()}.csv` })
    }
  }

  const handleExportXlsx = () => {
    if (onExport) {
      onExport('xlsx')
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={1} flexWrap="wrap">
        {title && <Typography variant="subtitle1" fontWeight="600">{title}</Typography>}
        <Box display="flex" gap={1} alignItems="center" ml="auto">
          <Typography variant="caption" color="text.secondary">
            {rowCount !== undefined ? `${rowCount.toLocaleString()} rows` : `${rows.length} rows`}
          </Typography>
          <TextField
            size="small"
            placeholder="Search..."
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
            sx={{ width: 180 }}
          />
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportCsv} variant="outlined">
            CSV
          </Button>
          {onExport && (
            <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportXlsx} variant="outlined">
              Excel
            </Button>
          )}
        </Box>
      </Box>
      <Box className="ag-theme-alpine" sx={{ height, width: '100%' }}>
        <AgGridReact
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={25}
          quickFilterText={quickFilter}
          onGridReady={onGridReady}
          animateRows
          suppressMenuHide
          domLayout="normal"
        />
      </Box>
    </Box>
  )
}
