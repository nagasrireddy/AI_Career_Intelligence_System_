import api from './client'

const d = (p) => p.then((r) => r.data)

export const authApi = {
  register: (body) => d(api.post('/auth/register', body)),
  login: (body) => d(api.post('/auth/login', body)),
  me: () => d(api.get('/auth/me')),
}
export const userApi = {
  update: (body) => d(api.patch('/users/me', body)),
  remove: () => api.delete('/users/me'),
}
export const resumeApi = {
  upload: (file, replaceId, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    if (replaceId) fd.append('replace_resume_id', String(replaceId))
    return d(api.post('/resumes/upload', fd, { onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0) }))
  },
  list: (params) => d(api.get('/resumes', { params })),
  get: (id) => d(api.get(`/resumes/${id}`)),
  remove: (id) => api.delete(`/resumes/${id}`),
  analyze: (id) => d(api.post(`/resumes/${id}/analyze`)),
  editSkills: (id, body) => d(api.patch(`/resumes/${id}/skills`, body)),
}
export const roleApi = {
  list: (params) => d(api.get('/roles', { params })),
  get: (id) => d(api.get(`/roles/${id}`)),
  compare: (ids) => d(api.get('/roles/compare', { params: { ids: ids.join(',') } })),
}
export const gapApi = {
  analyze: (body) => d(api.post('/skill-gap/analyze', body)),
  history: (params) => d(api.get('/skill-gap/history', { params })),
  get: (id) => d(api.get(`/skill-gap/${id}`)),
}
export const roadmapApi = {
  generate: (body) => d(api.post('/roadmaps/generate', body)),
  list: (params) => d(api.get('/roadmaps', { params })),
  get: (id) => d(api.get(`/roadmaps/${id}`)),
  patch: (id, body) => d(api.patch(`/roadmaps/${id}`, body)),
  remove: (id) => api.delete(`/roadmaps/${id}`),
}
export const progressApi = {
  summary: () => d(api.get('/progress/summary')),
  items: (params) => d(api.get('/progress/items', { params })),
  updateItem: (id, body) => d(api.patch(`/progress/items/${id}`, body)),
  history: (params) => d(api.get('/progress/history', { params })),
}
export const dashboardApi = { summary: () => d(api.get('/dashboard/summary')) }
