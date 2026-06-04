import React from 'react'
import ReactECharts from 'echarts-for-react'
import { buildBarChartOption } from './chartUtils'

interface Props {
  rows: Record<string, any>[]
  xKey: string
  yKey: string
  stacked?: boolean
  height?: number
}

export default function BarChart({ rows, xKey, yKey, stacked = false, height = 300 }: Props) {
  const option = buildBarChartOption([], rows, xKey, yKey, stacked)
  return <ReactECharts option={option} style={{ height }} notMerge />
}
