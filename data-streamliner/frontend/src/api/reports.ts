import apiClient from './client'

export interface Report {
  id: number
  name: string
  description?: string
  dataset_id: number
  config: Record<string, any>
  is_public: boolean
  allowed_roles: string[]
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  row_count: number
  execution_time_ms: number
  truncated: boolean
}

export const reportsApi = {
  list: async () => {
    const { data } = await apiClient.get('/reports')
    return data as Report[]
  },
  get: async (id: number) => {
    const { data } = await apiClient.get(`/reports/${id}`)
    return data as Report
  },
  create: async (payload: Omit<Report, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await apiClient.post('/reports', payload)
    return data as Report
  },
  update: async (id: number, payload: Partial<Report>) => {
    const { data } = await apiClient.put(`/reports/${id}`, payload)
    return data as Report
  },
  delete: async (id: number) => {
    await apiClient.delete(`/reports/${id}`)
  },
  execute: async (id: number, filters?: Record<string, any>, limit?: number) => {
    const { data } = await apiClient.post(`/reports/${id}/execute`, { filters, limit })
    return data as QueryResult
  },
  chartRecommendations: async (id: number) => {
    const { data } = await apiClient.get(`/reports/${id}/chart-recommendations`)
    return data
  },
}
