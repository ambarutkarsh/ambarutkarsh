import React from 'react'
import ReactECharts from 'echarts-for-react'
import { buildPieChartOption } from './chartUtils'

interface Props {
  rows: Record<string, any>[]
  nameKey: string
  valueKey: string
  donut?: boolean
  height?: number
}

export default function PieChart({ rows, nameKey, valueKey, donut = false, height = 300 }: Props) {
  const option = buildPieChartOption(rows, nameKey, valueKey, donut)
  return <ReactECharts option={option} style={{ height }} notMerge />
}
