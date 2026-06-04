import apiClient from './client'

export const semanticApi = {
  list: async () => {
    const { data } = await apiClient.get('/semantic')
    return data
  },
  get: async (id: number) => {
    const { data } = await apiClient.get(`/semantic/${id}`)
    return data
  },
}
