import apiClient from './client'

export interface DashboardWidget {
  id?: number
  dashboard_id?: number
  report_id?: number
  position: { x: number; y: number; w: number; h: number }
  title?: string
  widget_type: string
}

export interface Dashboard {
  id: number
  name: string
  description?: string
  layout: Record<string, any>
  filters: Record<string, any>
  status: string
  allowed_roles: string[]
  created_by?: number
  created_at?: string
  updated_at?: string
  widgets: DashboardWidget[]
}

export const dashboardsApi = {
  list: async () => {
    const { data } = await apiClient.get('/dashboards')
    return data as Dashboard[]
  },
  get: async (id: number) => {
    const { data } = await apiClient.get(`/dashboards/${id}`)
    return data as Dashboard
  },
  create: async (payload: Omit<Dashboard, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    const { data } = await apiClient.post('/dashboards', payload)
    return data as Dashboard
  },
  update: async (id: number, payload: Partial<Dashboard>) => {
    const { data } = await apiClient.put(`/dashboards/${id}`, payload)
    return data as Dashboard
  },
  delete: async (id: number) => {
    await apiClient.delete(`/dashboards/${id}`)
  },
  publish: async (id: number) => {
    const { data } = await apiClient.post(`/dashboards/${id}/publish`)
    return data
  },
}
