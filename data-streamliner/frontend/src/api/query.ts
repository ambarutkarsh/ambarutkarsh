import apiClient from './client'
import { QueryResult } from './reports'

export const queryApi = {
  runAdHoc: async (datasetId: number, selectedFields: string[], filters?: Record<string, any>, limit?: number) => {
    const { data } = await apiClient.post('/query', {
      dataset_id: datasetId,
      selected_fields: selectedFields,
      filters,
      limit,
    })
    return data as QueryResult
  },
  export: async (reportId: number, format: 'csv' | 'xlsx', filters?: Record<string, any>) => {
    const response = await apiClient.post('/export', { report_id: reportId, format, filters }, { responseType: 'blob' })
    return response
  },
}
