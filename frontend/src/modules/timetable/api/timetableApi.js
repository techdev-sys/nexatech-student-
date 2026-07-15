// Timetable API service layer — wraps the SHARED axios client only.
// No second axios instance is created; all calls reuse src/api/axios.js
import api from '../../../api/axios'

const unwrap = (res) => res.data
// Paginated endpoints return { data: [...] }; plain lists return [...].
const list   = (res) => res.data?.data ?? res.data ?? []

export const timetableApi = {
  // ── Views ──
  dashboard:        (params)            => api.get('/api/timetable/dashboard', { params }).then(unwrap),
  classTimetable:   (classId, params)   => api.get(`/api/timetable/class/${classId}`, { params }).then(unwrap),
  teacherTimetable: (teacherId, params) => api.get(`/api/timetable/teacher/${teacherId}`, { params }).then(unwrap),
  myTimetable:      (params)            => api.get('/api/timetable/my', { params }).then(unwrap),

  // ── Entries ──
  entries:       (params)      => api.get('/api/timetable/entries', { params }).then(unwrap),
  createEntry:   (payload)     => api.post('/api/timetable/entries', payload).then(unwrap),
  updateEntry:   (id, payload) => api.patch(`/api/timetable/entries/${id}`, payload).then(unwrap),
  deleteEntry:   (id)          => api.delete(`/api/timetable/entries/${id}`).then(unwrap),
  restoreEntry:  (id)          => api.post(`/api/timetable/entries/${id}/restore`).then(unwrap),

  // ── Periods ──
  periods:       (params)      => api.get('/api/timetable/periods', { params }).then(unwrap),
  createPeriod:  (payload)     => api.post('/api/timetable/periods', payload).then(unwrap),
  updatePeriod:  (id, payload) => api.patch(`/api/timetable/periods/${id}`, payload).then(unwrap),
  deletePeriod:  (id)          => api.delete(`/api/timetable/periods/${id}`).then(unwrap),
  restorePeriod: (id)          => api.post(`/api/timetable/periods/${id}/restore`).then(unwrap),

  // ── Rooms ──
  rooms:        (params)      => api.get('/api/timetable/rooms', { params }).then(unwrap),
  createRoom:   (payload)     => api.post('/api/timetable/rooms', payload).then(unwrap),
  updateRoom:   (id, payload) => api.patch(`/api/timetable/rooms/${id}`, payload).then(unwrap),
  deleteRoom:   (id)          => api.delete(`/api/timetable/rooms/${id}`).then(unwrap),
  restoreRoom:  (id)          => api.post(`/api/timetable/rooms/${id}/restore`).then(unwrap),

  // ── Teacher availability ──
  availability:        (params)      => api.get('/api/timetable/teacher-availability', { params }).then(unwrap),
  createAvailability:  (payload)     => api.post('/api/timetable/teacher-availability', payload).then(unwrap),
  updateAvailability:  (id, payload) => api.patch(`/api/timetable/teacher-availability/${id}`, payload).then(unwrap),
  deleteAvailability:  (id)          => api.delete(`/api/timetable/teacher-availability/${id}`).then(unwrap),
  restoreAvailability: (id)          => api.post(`/api/timetable/teacher-availability/${id}/restore`).then(unwrap),

  // ── Reference data (existing endpoints) ──
  classes:  ()       => api.get('/api/v1/classes').then(list),
  subjects: ()       => api.get('/api/subjects').then(list),
  teachers: ()       => api.get('/api/users', { params: { role: 'teacher' } }).then(list),
}

export { list as unwrapList }
