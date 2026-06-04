export const CHART_COLORS = [
  '#E31837', '#1A237E', '#2196F3', '#4CAF50', '#FF9800',
  '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#795548',
]

export function formatValue(value: any, format?: string, decimalPlaces = 2): string {
  if (value === null || value === undefined) return '-'
  if (format === 'currency') return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: decimalPlaces })}`
  if (format === 'percentage') return `${Number(value).toFixed(decimalPlaces)}%`
  if (typeof value === 'number') return value.toLocaleString('en-IN', { maximumFractionDigits: decimalPlaces })
  return String(value)
}

export function buildBarChartOption(columns: string[], rows: Record<string, any>[], xKey: string, yKey: string, stacked = false) {
  const categories = rows.map((r) => String(r[xKey] ?? ''))
  const seriesData = rows.map((r) => Number(r[yKey] ?? 0))
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ name: yKey, type: 'bar', data: seriesData, stack: stacked ? 'total' : undefined, itemStyle: { color: CHART_COLORS[0] } }],
    grid: { containLabel: true },
  }
}

export function buildLineChartOption(rows: Record<string, any>[], xKey: string, yKey: string, area = false) {
  const categories = rows.map((r) => String(r[xKey] ?? ''))
  const seriesData = rows.map((r) => Number(r[yKey] ?? 0))
  return {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series: [{
      name: yKey, type: 'line', data: seriesData,
      areaStyle: area ? {} : undefined,
      smooth: true,
      lineStyle: { color: CHART_COLORS[0] },
      itemStyle: { color: CHART_COLORS[0] },
    }],
    grid: { containLabel: true },
  }
}

export function buildPieChartOption(rows: Record<string, any>[], nameKey: string, valueKey: string, donut = false) {
  const pieData = rows.map((r, i) => ({
    name: String(r[nameKey] ?? ''),
    value: Number(r[valueKey] ?? 0),
    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
  }))
  return {
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: valueKey,
      type: 'pie',
      radius: donut ? ['40%', '70%'] : '60%',
      data: pieData,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  }
}

export function buildGroupedBarOption(rows: Record<string, any>[], xKey: string, yKeys: string[]) {
  const categories = rows.map((r) => String(r[xKey] ?? ''))
  const series = yKeys.map((key, i) => ({
    name: key,
    type: 'bar',
    data: rows.map((r) => Number(r[key] ?? 0)),
    itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
  }))
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {},
    xAxis: { type: 'category', data: categories, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series,
    grid: { containLabel: true },
  }
}
