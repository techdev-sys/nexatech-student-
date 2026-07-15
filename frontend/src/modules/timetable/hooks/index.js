import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '../../../context/ToastContext'
import { timetableApi } from '../api/timetableApi'

// ── Generic read hook ─────────────────────────────────────────────────────────
// Provides { data, loading, error, refetch }. The shared axios interceptor already
// surfaces network/permission/validation errors as toasts; we also expose error
// locally so pages can render inline error states.
function useResource(fetcher, deps = [], { enabled = true, initial = null } = {}) {
  const [data, setData]       = useState(initial)
  const [loading, setLoading] = useState(enabled)
  const [error, setError]     = useState(null)
  const reqId = useRef(0)

  const refetch = useCallback(() => {
    if (!enabled) { setLoading(false); return }
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    Promise.resolve(fetcher())
      .then(res => { if (id === reqId.current) setData(res) })
      .catch(err => { if (id === reqId.current) setError(err) })
      .finally(() => { if (id === reqId.current) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch, setData }
}

// ── Generic mutation hook ──────────────────────────────────────────────────────
// Returns { mutate, loading }. mutate resolves on success (with data) and rejects
// on failure so callers can show inline messages (backend conflict text etc.).
// The axios dedup guard prevents duplicate concurrent submissions.
function useMutation(fn, { successMessage } = {}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    try {
      const result = await fn(...args)
      if (successMessage) toast.success(successMessage)
      return result
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { mutate, loading }
}

// Pull the first human-readable backend validation/conflict message off an error.
export function backendMessage(err, fallback = 'The request could not be completed.') {
  const data = err?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }
  return data?.message ?? fallback
}

// ── Views ──────────────────────────────────────────────────────────────────────
export const useTimetableDashboard = () =>
  useResource(() => timetableApi.dashboard(), [])

export const useClassTimetable = (classId, params = {}) =>
  useResource(() => timetableApi.classTimetable(classId, params),
    [classId, params.term, params.academic_year], { enabled: !!classId })

export const useTeacherTimetable = (teacherId, params = {}) =>
  useResource(() => timetableApi.teacherTimetable(teacherId, params),
    [teacherId, params.term, params.academic_year], { enabled: !!teacherId })

export const useMyTimetable = (params = {}) =>
  useResource(() => timetableApi.myTimetable(params), [params.term, params.academic_year])

// ── Entries ──────────────────────────────────────────────────────────────────
export const useTimetableEntries = (params = {}) =>
  useResource(() => timetableApi.entries(params),
    [params.class_id, params.teacher_user_id, params.term, params.academic_year, params.status, params.page])

export const useCreateTimetableEntry = () =>
  useMutation((payload) => timetableApi.createEntry(payload), { successMessage: 'Timetable entry created.' })

export const useUpdateTimetableEntry = () =>
  useMutation((id, payload) => timetableApi.updateEntry(id, payload), { successMessage: 'Timetable entry updated.' })

export const useDeleteTimetableEntry = () =>
  useMutation((id) => timetableApi.deleteEntry(id), { successMessage: 'Timetable entry deleted.' })

// ── Periods ──────────────────────────────────────────────────────────────────
export const useTimetablePeriods = (params = {}) =>
  useResource(() => timetableApi.periods(params), [params.search, params.is_active, params.page])

export const useCreateTimetablePeriod = () =>
  useMutation((payload) => timetableApi.createPeriod(payload), { successMessage: 'Period created.' })

export const useUpdateTimetablePeriod = () =>
  useMutation((id, payload) => timetableApi.updatePeriod(id, payload), { successMessage: 'Period updated.' })

export const useDeleteTimetablePeriod = () =>
  useMutation((id) => timetableApi.deletePeriod(id), { successMessage: 'Period deleted.' })

export const useRestoreTimetablePeriod = () =>
  useMutation((id) => timetableApi.restorePeriod(id), { successMessage: 'Period restored.' })

// ── Rooms ──────────────────────────────────────────────────────────────────────
export const useTimetableRooms = (params = {}) =>
  useResource(() => timetableApi.rooms(params), [params.search, params.room_type, params.is_active, params.page])

export const useCreateTimetableRoom = () =>
  useMutation((payload) => timetableApi.createRoom(payload), { successMessage: 'Room created.' })

export const useUpdateTimetableRoom = () =>
  useMutation((id, payload) => timetableApi.updateRoom(id, payload), { successMessage: 'Room updated.' })

export const useDeleteTimetableRoom = () =>
  useMutation((id) => timetableApi.deleteRoom(id), { successMessage: 'Room deleted.' })

export const useRestoreTimetableRoom = () =>
  useMutation((id) => timetableApi.restoreRoom(id), { successMessage: 'Room restored.' })

// ── Teacher availability ────────────────────────────────────────────────────────
export const useTeacherAvailability = (params = {}) =>
  useResource(() => timetableApi.availability(params),
    [params.teacher_user_id, params.day_of_week, params.period_id, params.availability_status, params.page])

export const useCreateTeacherAvailability = () =>
  useMutation((payload) => timetableApi.createAvailability(payload), { successMessage: 'Availability saved.' })

export const useUpdateTeacherAvailability = () =>
  useMutation((id, payload) => timetableApi.updateAvailability(id, payload), { successMessage: 'Availability updated.' })

export const useDeleteTeacherAvailability = () =>
  useMutation((id) => timetableApi.deleteAvailability(id), { successMessage: 'Availability deleted.' })

// ── Reference data ──────────────────────────────────────────────────────────────
export const useTimetableClasses  = () => useResource(() => timetableApi.classes(), [], { initial: [] })
export const useTimetableSubjects = () => useResource(() => timetableApi.subjects(), [], { initial: [] })
export const useTimetableTeachers = () => useResource(() => timetableApi.teachers(), [], { initial: [] })
