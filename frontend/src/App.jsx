import { useState, useCallback, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage                from './pages/LoginPage'
import AppShell                 from './components/AppShell'
import DashboardPage            from './pages/DashboardPage'
import StudentsPage             from './pages/StudentsPage'
import UsersPage                from './pages/UsersPage'
import SubjectsPage             from './pages/SubjectsPage'
import AssessmentsPage          from './pages/AssessmentsPage'
import GradingMatrix            from './components/grading/GradingMatrix'
import AttendancePage           from './pages/AttendancePage'
import InvoiceDashboard         from './components/billing/InvoiceDashboard'
import FeeStructuresPage        from './pages/FeeStructuresPage'
import GradingSystemPage        from './pages/GradingSystemPage'
import ParentPortal             from './components/parent/ParentPortal'
import ParentAttendancePage     from './pages/parent/ParentAttendancePage'
import ParentBehaviourPage      from './pages/parent/ParentBehaviourPage'
import ParentFeesPage           from './pages/parent/ParentFeesPage'
import ParentResultsPage        from './pages/parent/ParentResultsPage'
import ParentReportCardsPage    from './pages/parent/ParentReportCardsPage'
import ParentTimetablePage      from './pages/parent/ParentTimetablePage'
import ParentAnnouncementsPage  from './pages/parent/ParentAnnouncementsPage'
import { ParentChildProvider }  from './context/ParentChildContext'
import ProvisioningScreen       from './components/provisioning/ProvisioningScreen'
import BehaviourDashboard       from './pages/BehaviourDashboard'
import AssignIncidentPage       from './pages/AssignIncidentPage'
import BehaviourIncidentsPage   from './pages/BehaviourIncidentsPage'
import BehaviourIncidentTypesPage from './pages/BehaviourIncidentTypesPage'
import BehaviourReportsPage     from './pages/BehaviourReportsPage'
import CommsDashboard           from './pages/CommsDashboard'
import SmsBroadcastPage         from './pages/SmsBroadcastPage'
import EmailBroadcastPage       from './pages/EmailBroadcastPage'
import AnnouncementsPage        from './pages/AnnouncementsPage'
import CommunicationTemplatesPage from './pages/CommunicationTemplatesPage'
import CommunicationDeliveryLogsPage from './pages/CommunicationDeliveryLogsPage'
import TimetableDashboardPage   from './pages/TimetableDashboardPage'
import ClassTimetablePage       from './pages/ClassTimetablePage'
import TeacherTimetablePage     from './pages/TeacherTimetablePage'
import MyTimetablePage          from './pages/MyTimetablePage'
import TimetableBuilderPage     from './pages/TimetableBuilderPage'
import TimetablePeriodsPage     from './pages/TimetablePeriodsPage'
import TimetableRoomsPage       from './pages/TimetableRoomsPage'
import TeacherAvailabilityPage  from './pages/TeacherAvailabilityPage'
import FinanceDashboardPage     from './pages/FinanceDashboardPage'
import IncomeCategoriesPage     from './pages/IncomeCategoriesPage'
import ExpenseCategoriesPage    from './pages/ExpenseCategoriesPage'
import ExpensesPage             from './pages/ExpensesPage'
import CashbookPage             from './pages/CashbookPage'
import ExamSessionsPage         from './pages/ExamSessionsPage'
import ExamTimetablePage        from './pages/ExamTimetablePage'
import ResultsDashboardPage     from './pages/ResultsDashboardPage'
import MarksEntryPage           from './pages/MarksEntryPage'
import ClassResultsPage         from './pages/ClassResultsPage'
import StudentResultsPage       from './pages/StudentResultsPage'
import ReportCardsPage          from './pages/ReportCardsPage'
import DemoRequestsPage         from './pages/DemoRequestsPage'

function defaultPage(role) {
  if (role === 'parent')         return 'overview'
  if (role === 'platform_admin') return 'provisioning'
  if (role === 'teacher')        return 'grading'
  if (role === 'accountant')     return 'finance-dashboard'
  return 'dashboard'
}

function AppInner() {
  const { user, loading } = useAuth()
  // page is initialized AFTER loading finishes — user?.role is real at that point.
  // We use null as sentinel; once loading is false and user is set, we derive the page.
  const [page, setPage]   = useState(null)
  const [saveStatus, setSaveStatus] = useState('')

  // Set the correct starting page once the user identity is known.
  useEffect(() => {
    if (!loading && user) {
      setPage(prev => prev ?? defaultPage(user.role))
    }
  }, [loading, user])

  const handleSaveStatus = useCallback((status) => {
    setSaveStatus(status)
    if (status === 'saved') setTimeout(() => setSaveStatus(''), 1500)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <LoginPage />
  if (!page)  return null   // brief gap between login completing and useEffect firing

  const statusBadge = saveStatus === 'saving'
    ? <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
    : saveStatus === 'saved'
    ? <span className="text-xs text-emerald-500 font-medium">Saved</span>
    : null

  return (
    <AppShell page={page} onNavigate={setPage} statusBadge={statusBadge}>
      {page === 'dashboard'       && <DashboardPage     onNavigate={setPage} />}
      {page === 'students'        && <StudentsPage onNavigate={setPage} />}
      {page === 'users'           && <UsersPage />}
      {page === 'subjects'        && <SubjectsPage />}
      {page === 'assessments'     && <AssessmentsPage />}
      {page === 'grading'         && <GradingMatrix     onSaveStatus={handleSaveStatus} />}
      {page === 'attendance'      && <AttendancePage />}
      {page === 'billing'         && <InvoiceDashboard />}
      {page === 'fee-structures'  && <FeeStructuresPage onNavigate={setPage} />}
      {page === 'grading-systems' && <GradingSystemPage />}
      {/* Parent portal — all pages wrapped in the shared child-selector context */}
      {user?.role === 'parent' && (
        <ParentChildProvider>
          {page === 'overview'             && <ParentPortal onNavigate={setPage} />}
          {page === 'portal-attendance'    && <ParentAttendancePage />}
          {page === 'portal-behaviour'     && <ParentBehaviourPage />}
          {page === 'portal-fees'          && <ParentFeesPage />}
          {page === 'portal-results'       && <ParentResultsPage />}
          {page === 'portal-report-cards'  && <ParentReportCardsPage />}
          {page === 'portal-timetable'     && <ParentTimetablePage />}
          {page === 'portal-announcements' && <ParentAnnouncementsPage />}
        </ParentChildProvider>
      )}
      {page === 'provisioning'           && <ProvisioningScreen />}
      {page === 'demo-requests'          && <DemoRequestsPage />}
      {page === 'behaviour-dashboard'    && <BehaviourDashboard />}
      {page === 'assign-incident'        && <AssignIncidentPage />}
      {page === 'behaviour-incidents'    && <BehaviourIncidentsPage />}
      {page === 'behaviour-types'        && <BehaviourIncidentTypesPage />}
      {page === 'behaviour-reports'      && <BehaviourReportsPage />}
      {page === 'comms-dashboard'        && <CommsDashboard />}
      {page === 'sms-broadcast'          && <SmsBroadcastPage />}
      {page === 'email-broadcast'        && <EmailBroadcastPage />}
      {page === 'announcements'          && <AnnouncementsPage />}
      {page === 'comm-templates'         && <CommunicationTemplatesPage />}
      {page === 'delivery-logs'          && <CommunicationDeliveryLogsPage />}
      {page === 'tt-dashboard'           && <TimetableDashboardPage />}
      {page === 'tt-class'               && <ClassTimetablePage />}
      {page === 'tt-teacher'             && <TeacherTimetablePage />}
      {page === 'tt-my'                  && <MyTimetablePage />}
      {page === 'tt-builder'             && <TimetableBuilderPage />}
      {page === 'tt-periods'             && <TimetablePeriodsPage />}
      {page === 'tt-rooms'               && <TimetableRoomsPage />}
      {page === 'tt-availability'        && <TeacherAvailabilityPage />}
      {page === 'finance-dashboard'      && <FinanceDashboardPage />}
      {page === 'income-categories'      && <IncomeCategoriesPage />}
      {page === 'expense-categories'     && <ExpenseCategoriesPage />}
      {page === 'expenses'               && <ExpensesPage />}
      {page === 'cashbook'               && <CashbookPage />}
      {page === 'exam-sessions'          && <ExamSessionsPage />}
      {page === 'exam-timetable'         && <ExamTimetablePage />}
      {page === 'results-dashboard'      && <ResultsDashboardPage />}
      {page === 'marks-entry'            && <MarksEntryPage onSaveStatus={handleSaveStatus} />}
      {page === 'class-results'          && <ClassResultsPage />}
      {page === 'student-results'        && <StudentResultsPage />}
      {page === 'report-cards'           && <ReportCardsPage />}
    </AppShell>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ToastProvider>
  )
}
