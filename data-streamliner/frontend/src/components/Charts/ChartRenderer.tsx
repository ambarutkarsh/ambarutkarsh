import React from 'react'
import { Box, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import KPICard from './KPICard'
import { buildBarChartOption, buildLineChartOption, buildPieChartOption, buildGroupedBarOption, CHART_COLORS } from './chartUtils'

interface Props {
  chartType: string
  columns: string[]
  rows: Record<string, any>[]
  config?: Record<string, any>
  height?: number
}

export default function ChartRenderer({ chartType, columns, rows, config = {}, height = 350 }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height={height}>
        <Typography color="text.secondary">No data to display</Typography>
      </Box>
    )
  }

  const xKey = config.xKey || columns[0] || ''
  const yKey = config.yKey || columns[1] || columns[0] || ''
  const yKeys = config.yKeys || (columns.length > 2 ? columns.slice(1) : [yKey])

  switch (chartType) {
    case 'kpi_card': {
      const val = rows[0]?.[yKey] ?? rows[0]?.[xKey] ?? 0
      return <KPICard label={yKey || xKey} value={val} format={config.format} />
    }
    case 'bar_chart': {
      const option = buildBarChartOption(columns, rows, xKey, yKey, false)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'stacked_bar_chart': {
      const option = buildBarChartOption(columns, rows, xKey, yKey, true)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'grouped_bar_chart': {
      const option = buildGroupedBarOption(rows, xKey, yKeys)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'line_chart': {
      const option = buildLineChartOption(rows, xKey, yKey, false)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'area_chart': {
      const option = buildLineChartOption(rows, xKey, yKey, true)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'pie_chart': {
      const option = buildPieChartOption(rows, xKey, yKey, false)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'donut_chart': {
      const option = buildPieChartOption(rows, xKey, yKey, true)
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'gauge_chart': {
      const gaugeVal = Number(rows[0]?.[yKey] || 0)
      const option = {
        series: [{
          type: 'gauge',
          data: [{ value: gaugeVal, name: yKey }],
          detail: { formatter: '{value}%' },
          axisLine: { lineStyle: { color: [[0.3, '#E31837'], [0.7, '#FF9800'], [1, '#4CAF50']], width: 20 } },
        }],
      }
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    case 'heatmap': {
      const xVals = [...new Set(rows.map((r) => String(r[xKey])))].sort()
      const yVals = columns.filter((c) => c !== xKey && c !== yKey)
      if (yVals.length === 0) {
        const option = buildBarChartOption(columns, rows, xKey, yKey)
        return <ReactECharts option={option} style={{ height }} notMerge />
      }
      const data = rows.flatMap((r, ri) =>
        yVals.map((yk, yi) => [ri, yi, Number(r[yk] ?? 0)])
      )
      const option = {
        tooltip: { position: 'top' },
        xAxis: { type: 'category', data: rows.map((r) => String(r[xKey])) },
        yAxis: { type: 'category', data: yVals },
        visualMap: { min: 0, max: Math.max(...data.map((d) => d[2] as number)), calculable: true },
        series: [{ name: 'value', type: 'heatmap', data, label: { show: true }, emphasis: { itemStyle: { shadowBlur: 10 } } }],
      }
      return <ReactECharts option={option} style={{ height }} notMerge />
    }
    default:
      return (
        <Box display="flex" alignItems="center" justifyContent="center" height={height}>
          <Typography color="text.secondary">Chart type "{chartType}" not supported</Typography>
        </Box>
      )
  }
}
