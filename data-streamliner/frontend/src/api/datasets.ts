import apiClient from './client'

export interface DatasetField {
  id?: number
  dataset_id?: number
  source_column: string
  business_name: string
  description?: string
  field_type: string
  data_type: string
  aggregation_type: string
  formula?: string
  format_string?: string
  decimal_places: number
  is_visible: boolean
  is_filterable: boolean
  is_exportable: boolean
  is_pii: boolean
  sort_order: number
}

export interface Dataset {
  id: number
  name: string
  description?: string
  data_source_id: number
  source_type: string
  source_config?: Record<string, any>
  default_filters?: Record<string, any>
  status: string
  version: number
  created_by?: number
  created_at?: string
  updated_at?: string
  published_at?: string
  fields: DatasetField[]
}

export const datasetsApi = {
  list: async () => {
    const { data } = await apiClient.get('/datasets')
    return data as Dataset[]
  },
  get: async (id: number) => {
    const { data } = await apiClient.get(`/datasets/${id}`)
    return data as Dataset
  },
  create: async (payload: Omit<Dataset, 'id' | 'status' | 'version' | 'created_at' | 'updated_at' | 'published_at'>) => {
    const { data } = await apiClient.post('/datasets', payload)
    return data as Dataset
  },
  update: async (id: number, payload: Partial<Dataset>) => {
    const { data } = await apiClient.put(`/datasets/${id}`, payload)
    return data as Dataset
  },
  publish: async (id: number) => {
    const { data } = await apiClient.post(`/datasets/${id}/publish`)
    return data
  },
  preview: async (id: number) => {
    const { data } = await apiClient.get(`/datasets/${id}/preview`)
    return data
  },
  getFields: async (id: number) => {
    const { data } = await apiClient.get(`/datasets/${id}/fields`)
    return data as DatasetField[]
  },
}
