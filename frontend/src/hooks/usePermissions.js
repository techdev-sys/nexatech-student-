import { useAuth } from '../context/AuthContext'

// Role  capability map. Backend enforces the same logic via middleware.
// This is for UI gating only — never trust client-side for security.

const CAPABILITIES = {
  super_admin: [
    'manage_users', 'manage_students', 'manage_subjects',
    'manage_assessments', 'grade_students', 'take_attendance',
    'manage_finance', 'manage_fee_structures', 'manage_settings',
    'view_reports', 'delete_invoices',
    'view_behaviour', 'manage_behaviour', 'record_behaviour_incident',
    'view_communications', 'send_sms', 'send_email',
    'manage_templates', 'manage_announcements', 'view_delivery_logs',
    'view_timetable', 'view_own_timetable', 'manage_timetable', 'manage_timetable_settings', 'manage_teacher_availability',
    'view_finance', 'approve_expenses',
  ],
  admin: [
    'manage_users', 'manage_students', 'manage_subjects',
    'manage_assessments', 'grade_students', 'take_attendance',
    'manage_finance', 'manage_fee_structures', 'manage_settings',
    'view_reports', 'delete_invoices',
    'view_behaviour', 'manage_behaviour', 'record_behaviour_incident',
    'view_communications', 'send_sms', 'send_email',
    'manage_templates', 'manage_announcements', 'view_delivery_logs',
    'view_timetable', 'view_own_timetable', 'manage_timetable', 'manage_timetable_settings', 'manage_teacher_availability',
    'view_finance', 'approve_expenses',
  ],
  teacher: [
    'manage_students',
    'manage_assessments',
    'grade_students',
    'take_attendance',
    'view_reports',
    'view_behaviour', 'record_behaviour_incident',
    'view_communications', 'manage_announcements',
    'view_timetable', 'view_own_timetable', 'manage_teacher_availability',
  ],
  parent: [
    'view_own_child',
    'view_communications',
    'view_own_timetable',
  ],
  platform_admin: [
    'manage_schools',
  ],
  accountant: [
    'view_finance', 'manage_finance', 'approve_expenses',
  ],
}

/**
 * Returns a `can(capability)` function scoped to the current user's role.
 *
 * Usage:
 *   const { can } = usePermissions()
 *   if (can('manage_finance')) { ... }
 */
export function usePermissions() {
  const { user } = useAuth()
  const role     = user?.role ?? ''
  const caps     = CAPABILITIES[role] ?? []

  const can = (capability) => caps.includes(capability)

  return { can, role }
}
