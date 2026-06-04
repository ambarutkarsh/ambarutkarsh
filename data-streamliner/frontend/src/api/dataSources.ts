import apiClient from './client'

export interface DataSource {
  id: number
  name: string
  description?: string
  db_type: string
  host: string
  port: number
  database_name: string
  schema_name?: string
  username: string
  ssl_mode: string
  connection_timeout: number
  query_timeout: number
  is_active: boolean
  created_at?: string
}

export const dataSourcesApi = {
  list: async () => {
    const { data } = await apiClient.get('/data-sources')
    return data as DataSource[]
  },
  create: async (payload: Omit<DataSource, 'id' | 'created_at'> & { password: string }) => {
    const { data } = await apiClient.post('/data-sources', payload)
    return data as DataSource
  },
  update: async (id: number, payload: Partial<DataSource> & { password?: string }) => {
    const { data } = await apiClient.put(`/data-sources/${id}`, payload)
    return data as DataSource
  },
  delete: async (id: number) => {
    await apiClient.delete(`/data-sources/${id}`)
  },
  test: async (id: number) => {
    const { data } = await apiClient.post(`/data-sources/${id}/test`)
    return data
  },
  getSchemas: async (id: number) => {
    const { data } = await apiClient.get(`/data-sources/${id}/schemas`)
    return data.schemas as string[]
  },
  getTables: async (id: number, schema?: string) => {
    const { data } = await apiClient.get(`/data-sources/${id}/tables`, { params: { schema } })
    return data.tables as { name: string; type: string }[]
  },
  getColumns: async (id: number, table: string, schema?: string) => {
    const { data } = await apiClient.get(`/data-sources/${id}/columns`, { params: { table, schema } })
    return data.columns as { name: string; type: string; nullable: boolean }[]
  },
}
