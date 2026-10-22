import { lazy, Suspense, useCallback, useState } from 'react'
import AppShell from './components/AppShell'
import { ParentChildProvider } from './context/ParentChildContext'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'))
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'))
const GradingMatrix = lazy(() => import('./components/grading/GradingMatrix'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const InvoiceDashboard = lazy(() => import('./components/billing/InvoiceDashboard'))
const FeeStructuresPage = lazy(() => import('./pages/FeeStructuresPage'))
const GradingSystemPage = lazy(() => import('./pages/GradingSystemPage'))
const ParentPortal = lazy(() => import('./components/parent/ParentPortal'))
const ParentAttendancePage = lazy(() => import('./pages/parent/ParentAttendancePage'))
const ParentBehaviourPage = lazy(() => import('./pages/parent/ParentBehaviourPage'))
const ParentFeesPage = lazy(() => import('./pages/parent/ParentFeesPage'))
const ParentResultsPage = lazy(() => import('./pages/parent/ParentResultsPage'))
const ParentReportCardsPage = lazy(() => import('./pages/parent/ParentReportCardsPage'))
const ParentTimetablePage = lazy(() => import('./pages/parent/ParentTimetablePage'))
const ParentAnnouncementsPage = lazy(() => import('./pages/parent/ParentAnnouncementsPage'))
const ProvisioningScreen = lazy(() => import('./components/provisioning/ProvisioningScreen'))
const BehaviourDashboard = lazy(() => import('./pages/BehaviourDashboard'))
const AssignIncidentPage = lazy(() => import('./pages/AssignIncidentPage'))
const BehaviourIncidentsPage = lazy(() => import('./pages/BehaviourIncidentsPage'))
const BehaviourIncidentTypesPage = lazy(() => import('./pages/BehaviourIncidentTypesPage'))
const BehaviourReportsPage = lazy(() => import('./pages/BehaviourReportsPage'))
const CommsDashboard = lazy(() => import('./pages/CommsDashboard'))
const SmsBroadcastPage = lazy(() => import('./pages/SmsBroadcastPage'))
const EmailBroadcastPage = lazy(() => import('./pages/EmailBroadcastPage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const CommunicationTemplatesPage = lazy(() => import('./pages/CommunicationTemplatesPage'))
const CommunicationDeliveryLogsPage = lazy(() => import('./pages/CommunicationDeliveryLogsPage'))
const TimetableDashboardPage = lazy(() => import('./pages/TimetableDashboardPage'))
const ClassTimetablePage = lazy(() => import('./pages/ClassTimetablePage'))
const TeacherTimetablePage = lazy(() => import('./pages/TeacherTimetablePage'))
const MyTimetablePage = lazy(() => import('./pages/MyTimetablePage'))
const TimetableBuilderPage = lazy(() => import('./pages/TimetableBuilderPage'))
const TimetablePeriodsPage = lazy(() => import('./pages/TimetablePeriodsPage'))
const TimetableRoomsPage = lazy(() => import('./pages/TimetableRoomsPage'))
const TeacherAvailabilityPage = lazy(() => import('./pages/TeacherAvailabilityPage'))
const FinanceDashboardPage = lazy(() => import('./pages/FinanceDashboardPage'))
const IncomeCategoriesPage = lazy(() => import('./pages/IncomeCategoriesPage'))
const ExpenseCategoriesPage = lazy(() => import('./pages/ExpenseCategoriesPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const CashbookPage = lazy(() => import('./pages/CashbookPage'))
const ExamSessionsPage = lazy(() => import('./pages/ExamSessionsPage'))
const ExamTimetablePage = lazy(() => import('./pages/ExamTimetablePage'))
const ResultsDashboardPage = lazy(() => import('./pages/ResultsDashboardPage'))
const MarksEntryPage = lazy(() => import('./pages/MarksEntryPage'))
const ClassResultsPage = lazy(() => import('./pages/ClassResultsPage'))
const StudentResultsPage = lazy(() => import('./pages/StudentResultsPage'))
const ReportCardsPage = lazy(() => import('./pages/ReportCardsPage'))
const DemoRequestsPage = lazy(() => import('./pages/DemoRequestsPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))

function defaultPage(role) {
  if (role === 'parent') return 'overview'
  if (role === 'platform_admin') return 'provisioning'
  if (role === 'teacher') return 'grading'
  if (role === 'accountant') return 'finance-dashboard'
  return 'dashboard'
}

export default function AuthenticatedApp({ user }) {
  const [page, setPage] = useState(() => defaultPage(user.role))
  const [saveStatus, setSaveStatus] = useState('')

  const handleSaveStatus = useCallback((status) => {
    setSaveStatus(status)
    if (status === 'saved') setTimeout(() => setSaveStatus(''), 1500)
  }, [])

  const statusBadge = saveStatus === 'saving'
    ? <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
    : saveStatus === 'saved'
    ? <span className="text-xs text-emerald-500 font-medium">Saved</span>
    : null

  return (
    <AppShell page={page} onNavigate={setPage} statusBadge={statusBadge}>
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading page...</div>}>
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'students' && <StudentsPage onNavigate={setPage} />}
      {page === 'users' && <UsersPage />}
      {page === 'subjects' && <SubjectsPage />}
      {page === 'assessments' && <AssessmentsPage />}
      {page === 'grading' && <GradingMatrix onSaveStatus={handleSaveStatus} />}
      {page === 'attendance' && <AttendancePage />}
      {page === 'billing' && <InvoiceDashboard />}
      {page === 'fee-structures' && <FeeStructuresPage onNavigate={setPage} />}
      {page === 'grading-systems' && <GradingSystemPage />}
      {user.role === 'parent' && (
        <ParentChildProvider>
          {page === 'overview' && <ParentPortal onNavigate={setPage} />}
          {page === 'portal-attendance' && <ParentAttendancePage />}
          {page === 'portal-behaviour' && <ParentBehaviourPage />}
          {page === 'portal-fees' && <ParentFeesPage />}
          {page === 'portal-results' && <ParentResultsPage />}
          {page === 'portal-report-cards' && <ParentReportCardsPage />}
          {page === 'portal-timetable' && <ParentTimetablePage />}
          {page === 'portal-announcements' && <ParentAnnouncementsPage />}
        </ParentChildProvider>
      )}
      {page === 'provisioning' && <ProvisioningScreen />}
      {page === 'demo-requests' && <DemoRequestsPage />}
      {page === 'account' && <AccountPage />}
      {page === 'behaviour-dashboard' && <BehaviourDashboard />}
      {page === 'assign-incident' && <AssignIncidentPage />}
      {page === 'behaviour-incidents' && <BehaviourIncidentsPage />}
      {page === 'behaviour-types' && <BehaviourIncidentTypesPage />}
      {page === 'behaviour-reports' && <BehaviourReportsPage />}
      {page === 'comms-dashboard' && <CommsDashboard />}
      {page === 'sms-broadcast' && <SmsBroadcastPage />}
      {page === 'email-broadcast' && <EmailBroadcastPage />}
      {page === 'announcements' && <AnnouncementsPage />}
      {page === 'comm-templates' && <CommunicationTemplatesPage />}
      {page === 'delivery-logs' && <CommunicationDeliveryLogsPage />}
      {page === 'tt-dashboard' && <TimetableDashboardPage />}
      {page === 'tt-class' && <ClassTimetablePage />}
      {page === 'tt-teacher' && <TeacherTimetablePage />}
      {page === 'tt-my' && <MyTimetablePage />}
      {page === 'tt-builder' && <TimetableBuilderPage />}
      {page === 'tt-periods' && <TimetablePeriodsPage />}
      {page === 'tt-rooms' && <TimetableRoomsPage />}
      {page === 'tt-availability' && <TeacherAvailabilityPage />}
      {page === 'finance-dashboard' && <FinanceDashboardPage />}
      {page === 'income-categories' && <IncomeCategoriesPage />}
      {page === 'expense-categories' && <ExpenseCategoriesPage />}
      {page === 'expenses' && <ExpensesPage />}
      {page === 'cashbook' && <CashbookPage />}
      {page === 'exam-sessions' && <ExamSessionsPage />}
      {page === 'exam-timetable' && <ExamTimetablePage />}
      {page === 'results-dashboard' && <ResultsDashboardPage />}
      {page === 'marks-entry' && <MarksEntryPage onSaveStatus={handleSaveStatus} />}
      {page === 'class-results' && <ClassResultsPage />}
      {page === 'student-results' && <StudentResultsPage />}
      {page === 'report-cards' && <ReportCardsPage />}
      </Suspense>
    </AppShell>
  )
}
