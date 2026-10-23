import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Icon = ({ d }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

const icons = {
  dashboard:        'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  students:         'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  users:            'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  subjects:         'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  assessments:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  grading:          'M3 10h18M3 6h18M3 14h18M3 18h18',
  attendance:       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  billing:          'M9 14l2 2 4-4M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z',
  fees:             'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  'grading-sys':    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  overview:         'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  schools:          'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  behaviour:        'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  'beh-assign':     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  'beh-list':       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  'beh-types':      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'beh-reports':    'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  comms:            'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  'comms-sms':      'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  'comms-email':    'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  'comms-announce': 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  'comms-template': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  'comms-logs':     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  logout:           'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1',
  timetable:        'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  'tt-class':       'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  'tt-teacher':     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'tt-my':          'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  'tt-builder':     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  'tt-periods':     'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  'tt-rooms':       'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'tt-avail':       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  'fin-dashboard':  'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'fin-income':     'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'fin-expense':    'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  'fin-cashbook':   'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  'exam-sessions':  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  'exam-timetable': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  'results-dash':   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'marks-entry':    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  'class-results':  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  'student-results':'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'report-cards':   'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
}

const ADMIN_NAV = [
  { key: 'dashboard',            label: 'Dashboard',          icon: 'dashboard' },
  { key: 'students',             label: 'Students',           icon: 'students' },
  { key: 'users',                label: 'Staff & Parents',    icon: 'users' },
  { divider: 'Academic' },
  { key: 'subjects',             label: 'Subjects',           icon: 'subjects' },
  { key: 'assessments',          label: 'Assessments',        icon: 'assessments' },
  { key: 'grading',              label: 'Grade Matrix',       icon: 'grading' },
  { key: 'attendance',           label: 'Attendance',         icon: 'attendance' },
  { divider: 'Behaviour' },
  { key: 'behaviour-dashboard',  label: 'Behaviour Dashboard',icon: 'behaviour' },
  { key: 'assign-incident',      label: 'Assign Incident',    icon: 'beh-assign' },
  { key: 'behaviour-incidents',  label: 'Incident List',      icon: 'beh-list' },
  { key: 'behaviour-types',      label: 'Incident Types',     icon: 'beh-types' },
  { key: 'behaviour-reports',    label: 'Behaviour Reports',  icon: 'beh-reports' },
  { divider: 'Communications' },
  { key: 'comms-dashboard',      label: 'Comms Dashboard',    icon: 'comms' },
  { key: 'sms-broadcast',        label: 'SMS Broadcast',      icon: 'comms-sms' },
  { key: 'email-broadcast',      label: 'Email Broadcast',    icon: 'comms-email' },
  { key: 'announcements',        label: 'Announcements',      icon: 'comms-announce' },
  { key: 'comm-templates',       label: 'Templates',          icon: 'comms-template' },
  { key: 'delivery-logs',        label: 'Delivery Logs',      icon: 'comms-logs' },
  { divider: 'Timetable' },
  { key: 'tt-dashboard',         label: 'Timetable Dashboard',icon: 'timetable' },
  { key: 'tt-class',             label: 'Class Timetable',    icon: 'tt-class' },
  { key: 'tt-teacher',           label: 'Teacher Timetable',  icon: 'tt-teacher' },
  { key: 'tt-builder',           label: 'Timetable Builder',  icon: 'tt-builder' },
  { key: 'tt-periods',           label: 'Periods',            icon: 'tt-periods' },
  { key: 'tt-rooms',             label: 'Rooms',              icon: 'tt-rooms' },
  { key: 'tt-availability',      label: 'Teacher Availability',icon: 'tt-avail' },
  { divider: 'Finance' },
  { key: 'billing',              label: 'Invoices',           icon: 'billing' },
  { key: 'fee-structures',       label: 'Fee Structures',     icon: 'fees' },
  { key: 'finance-dashboard',    label: 'Finance Dashboard',  icon: 'fin-dashboard' },
  { key: 'income-categories',    label: 'Income Categories',  icon: 'fin-income' },
  { key: 'expense-categories',   label: 'Expense Categories', icon: 'fin-expense' },
  { key: 'expenses',             label: 'Expenses',           icon: 'fin-expense' },
  { key: 'cashbook',             label: 'Cashbook',           icon: 'fin-cashbook' },
  { divider: 'Examinations' },
  { key: 'exam-sessions',        label: 'Exam Sessions',      icon: 'exam-sessions' },
  { key: 'exam-timetable',       label: 'Exam Timetable',     icon: 'exam-timetable' },
  { key: 'results-dashboard',    label: 'Results Dashboard',  icon: 'results-dash' },
  { key: 'marks-entry',          label: 'Fast Marks',         icon: 'marks-entry' },
  { key: 'class-results',        label: 'Class Results',      icon: 'class-results' },
  { key: 'student-results',      label: 'Student Results',    icon: 'student-results' },
  { key: 'report-cards',         label: 'Report Cards',       icon: 'report-cards' },
  { divider: 'Settings' },
  { key: 'grading-systems',      label: 'Grading Systems',    icon: 'grading-sys' },
]

const TEACHER_NAV = [
  { key: 'grading',              label: 'Grade Matrix',       icon: 'grading' },
  { key: 'attendance',           label: 'Attendance',         icon: 'attendance' },
  { key: 'students',             label: 'Students',           icon: 'students' },
  { key: 'assessments',          label: 'Assessments',        icon: 'assessments' },
  { divider: 'Behaviour' },
  { key: 'behaviour-dashboard',  label: 'Behaviour Dashboard',icon: 'behaviour' },
  { key: 'assign-incident',      label: 'Assign Incident',    icon: 'beh-assign' },
  { key: 'behaviour-incidents',  label: 'Incident List',      icon: 'beh-list' },
  { divider: 'Communications' },
  { key: 'announcements',        label: 'Announcements',      icon: 'comms-announce' },
  { divider: 'Timetable' },
  { key: 'tt-my',                label: 'My Timetable',       icon: 'tt-my' },
  { key: 'tt-class',             label: 'Class Timetable',    icon: 'tt-class' },
  { key: 'tt-teacher',           label: 'Teacher Timetable',  icon: 'tt-teacher' },
  { key: 'tt-availability',      label: 'My Availability',    icon: 'tt-avail' },
  { divider: 'Examinations' },
  { key: 'marks-entry',          label: 'Fast Marks',         icon: 'marks-entry' },
  { key: 'class-results',        label: 'Class Results',      icon: 'class-results' },
  { key: 'student-results',      label: 'Student Results',    icon: 'student-results' },
]

const PARENT_NAV = [
  { key: 'overview',              label: 'Dashboard',       icon: 'dashboard' },
  { divider: 'My Child' },
  { key: 'portal-attendance',     label: 'Attendance',      icon: 'attendance' },
  { key: 'portal-behaviour',      label: 'Behaviour',       icon: 'behaviour' },
  { key: 'portal-fees',           label: 'School Fees',     icon: 'billing' },
  { key: 'portal-results',        label: 'Results',         icon: 'student-results' },
  { key: 'portal-report-cards',   label: 'Report Cards',    icon: 'report-cards' },
  { key: 'portal-timetable',      label: 'Timetable',       icon: 'timetable' },
  { key: 'portal-announcements',  label: 'Announcements',   icon: 'comms-announce' },
]
const PLATFORM_NAV = [
  { key: 'provisioning', label: 'Schools', icon: 'schools' },
  { key: 'demo-requests', label: 'Demo Requests', icon: 'comms' },
]

const ACCOUNTANT_NAV = [
  { divider: 'Finance' },
  { key: 'finance-dashboard',  label: 'Finance Dashboard',  icon: 'fin-dashboard' },
  { key: 'billing',            label: 'Invoices',           icon: 'billing' },
  { key: 'income-categories',  label: 'Income Categories',  icon: 'fin-income' },
  { key: 'expense-categories', label: 'Expense Categories', icon: 'fin-expense' },
  { key: 'expenses',           label: 'Expenses',           icon: 'fin-expense' },
  { key: 'cashbook',           label: 'Cashbook',           icon: 'fin-cashbook' },
]

function getNav(role) {
  if (role === 'parent')         return PARENT_NAV
  if (role === 'platform_admin') return PLATFORM_NAV
  if (role === 'teacher')        return TEACHER_NAV
  if (role === 'accountant')     return ACCOUNTANT_NAV
  return ADMIN_NAV
}

function getPageLabel(nav, page) {
  for (const item of nav) {
    if (!item.divider && item.key === page) return item.label
  }
  return page
}

export default function AppShell({ page, onNavigate, statusBadge, children }) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState({})
  const nav = user?.is_demo ? getNav(user?.role) : [
    ...getNav(user?.role),
    { divider: 'Account' },
    { key: 'account', label: 'Change Password', icon: 'users' },
  ]

  return (
    <div className="h-dvh overflow-hidden bg-[#faf9fe] text-[#1a1b1f] flex flex-col">
      <header className="h-16 shrink-0 bg-white border-b border-[#D2D2D2] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="h-8 w-8 border border-[#D2D2D2] bg-[#F3F3F3] text-[#113264] flex items-center justify-center"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d={collapsed ? 'M8 5l7 7-7 7' : 'M16 5l-7 7 7 7'} />
            </svg>
          </button>
          <div className="scholaris-brand" >
            <img src="/images/scholaris-logo.jpg" alt="Scholaris" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] leading-5 font-bold text-[#1A1A1A] uppercase tracking-normal truncate">
              {user?.school?.name ?? 'Scholaris School Operations Platform'}
            </p>
            <p className="text-[11px] leading-4 text-[#44474f] uppercase truncate">Management Portal</p>
          </div>
        </div>
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
          <div className="relative w-full">
            <input
              className="h-8 w-full border border-[#D2D2D2] bg-[#F3F3F3] px-3 pr-8 text-[13px] leading-[18px] outline-none focus:border-[#005A9C]"
              placeholder="OmniSearch commands, students, invoices..."
              type="text"
            />
            <span className="absolute right-2 top-1.5 text-[#747780] text-[10px] font-bold uppercase">Find</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] leading-4">
          {statusBadge}
          <span className="hidden sm:inline-flex items-center gap-1 font-bold uppercase text-[#107C41]">
            <span className="w-2 h-2 rounded-full bg-[#107C41]" />
            System Online
          </span>
          <span className="hidden lg:inline text-[#44474f] uppercase">{user?.role?.replace('_', ' ')}</span>
          <div className="h-8 w-8 border border-[#D2D2D2] bg-[#e3e2e7] text-[#113264] flex items-center justify-center font-bold text-xs">
            {(user?.name ?? 'Admin').slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={`${collapsed ? 'w-16' : 'w-60'} h-full bg-[#113264] border-r border-[#D2D2D2] flex flex-col shrink-0 transition-all duration-200`}>
          <div className="px-4 py-3 border-b border-white/10 min-h-[54px]">
            {!collapsed ? (
              <>
                <p className="text-[16px] leading-[22px] font-semibold text-white">School workspace</p>
                <p className="text-[10px] leading-4 text-[#acc7ff] uppercase tracking-widest font-bold">{user?.name}</p>
              </>
            ) : (
              <p className="text-center text-white font-bold text-sm">ERP</p>
            )}
          </div>

          <nav aria-label="Main navigation" className="school-navigation flex-1 min-h-0 py-3 overflow-y-auto overscroll-contain">
            {nav.map((item, i) => {
              const section = item.divider || nav.slice(0, i).findLast(entry => entry.divider)?.divider
              const sectionItems = section ? nav.slice(nav.findIndex(entry => entry.divider === section) + 1) : []
              const nextDivider = sectionItems.findIndex(entry => entry.divider)
              const containsActive = (nextDivider < 0 ? sectionItems : sectionItems.slice(0, nextDivider)).some(entry => entry.key === page)
              const expanded = openSections[section] ?? containsActive
              if (item.divider) {
                return collapsed
                  ? <div key={item.divider} className="border-t border-white/10 my-2" />
                  : <button key={item.divider} type="button" aria-expanded={expanded}
                      onClick={() => setOpenSections(current => ({ ...current, [section]: !expanded }))}
                      className="nav-section">
                      <span>{item.divider}</span>
                      <Icon d={expanded ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
                    </button>
              }
              if (!collapsed && section && !expanded) return null
              const active = page === item.key
              return (
                <button key={item.key} onClick={() => onNavigate(item.key)} title={collapsed ? item.label : undefined} aria-current={page === item.key ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] leading-[18px] text-left transition border-l-4 ${active ? 'bg-[#005A9C] border-[#7ab7ff] text-white font-bold' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}>
                  <Icon d={icons[item.icon] ?? icons.dashboard} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>

          <div className="p-3 border-t border-white/10">
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] leading-[18px] text-white/75 hover:bg-white/10 hover:text-white transition" aria-label="Sign out">
              <Icon d={icons.logout} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain">
          <div className="h-9 sticky top-0 z-20 bg-white border-b border-[#D2D2D2] px-4 flex items-center justify-between shrink-0">
            <h1 className="text-[20px] leading-7 font-semibold text-[#001d45] uppercase truncate">{getPageLabel(nav, page)}</h1>
            <span className="text-[11px] leading-4 text-[#44474f] uppercase">Term 3 / 2025</span>
          </div>
          <main className="p-4 bg-[#faf9fe]">{children}</main>
        </div>
      </div>
    </div>
  )
}
