import React from 'react'
import ReactECharts from 'echarts-for-react'
import { buildLineChartOption } from './chartUtils'

interface Props {
  rows: Record<string, any>[]
  xKey: string
  yKey: string
  area?: boolean
  height?: number
}

export default function LineChart({ rows, xKey, yKey, area = false, height = 300 }: Props) {
  const option = buildLineChartOption(rows, xKey, yKey, area)
  return <ReactECharts option={option} style={{ height }} notMerge />
}
