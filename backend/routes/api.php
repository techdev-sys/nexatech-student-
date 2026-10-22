<?php

use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\ClassResultsController;
use App\Http\Controllers\Api\ExamSessionController;
use App\Http\Controllers\Api\ExamTimetableController;
use App\Http\Controllers\Api\ResultsDashboardController;
use App\Http\Controllers\Api\AssessmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BehaviourIncidentController;
use App\Http\Controllers\Api\BehaviourIncidentTypeController;
use App\Http\Controllers\Api\BehaviourReportController;
use App\Http\Controllers\Api\CommunicationController;
use App\Http\Controllers\Api\CommunicationTemplateController;
use App\Http\Controllers\Api\DemoRequestController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CashbookController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinanceDashboardController;
use App\Http\Controllers\Api\IncomeCategoryController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProvisioningController;
use App\Http\Controllers\Api\FeeStructureController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\GradeMatrixController;
use App\Http\Controllers\Api\GradingSystemController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\ReportCardController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TeacherAvailabilityController;
use App\Http\Controllers\Api\TimetableEntryController;
use App\Http\Controllers\Api\TimetablePeriodController;
use App\Http\Controllers\Api\TimetableRoomController;
use App\Http\Controllers\Api\TimetableViewController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────────────────
if (config('registration.public_enabled')) {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:3,1');
}
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/demo-requests', [DemoRequestController::class, 'store'])->middleware('throttle:8,1');
Route::post('/demo/redeem', [DemoRequestController::class, 'redeem'])->middleware('throttle:5,1');
Route::post('/forgot-password', [PasswordResetController::class, 'requestLink'])->middleware('throttle:3,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');
Route::post('/gateways/{gateway}/callback', [WebhookController::class, 'handle'])
    ->where('gateway', 'paynow|stitch|payfast');

// ── Authenticated ─────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'demo.readonly'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
    Route::get('/me',      [AuthController::class, 'me']);

    // Students — admin+teacher only; parent must use /v1/parent/overview, not this general list
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::apiResource('students', StudentController::class)->except(['destroy']);
    });

    // Report card — admin+teacher+parent; parent restricted to own child inside controller
    Route::middleware('role:super_admin,admin,teacher,parent')->group(function () {
        Route::get('students/{student}/report-card',     [ReportCardController::class, 'show']);
        Route::get('students/{student}/report-card/pdf', [ReportCardController::class, 'pdf']);
    });

    // Communications — templates: admin+teacher can view; admin-only writes are in admin group below
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::get('communications/templates',                         [CommunicationTemplateController::class, 'index']);
        Route::get('communications/templates/{communicationTemplate}', [CommunicationTemplateController::class, 'show']);
    });

    // Communications — dashboard, list, detail, deliveries: admin only
    // (dashboard route must be declared before {communication} to avoid parameter capture)
    Route::middleware('role:super_admin,admin')->group(function () {
        Route::get('communications/dashboard',                       [CommunicationController::class, 'dashboard']);
        Route::get('communications',                                 [CommunicationController::class, 'index']);
        Route::get('communications/{communication}',                 [CommunicationController::class, 'show']);
        Route::get('communications/{communication}/deliveries',      [CommunicationController::class, 'deliveries']);
    });

    // Announcements — read: admin + teacher + parent (parent-filtered in controller)
    Route::middleware('role:super_admin,admin,teacher,parent')->group(function () {
        Route::get('announcements',                [AnnouncementController::class, 'index']);
        Route::get('announcements/{announcement}', [AnnouncementController::class, 'show']);
    });

    // Announcements — create + edit: admin + teacher
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::post('announcements',                    [AnnouncementController::class, 'store']);
        Route::patch('announcements/{announcement}',    [AnnouncementController::class, 'update']);
    });

    // Behaviour — view + record: admin and teacher only
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::get('behaviour/incident-types',                         [BehaviourIncidentTypeController::class, 'index']);
        Route::get('behaviour/incident-types/{behaviourIncidentType}', [BehaviourIncidentTypeController::class, 'show']);
        Route::get('behaviour/incidents',                              [BehaviourIncidentController::class,     'index']);
        Route::post('behaviour/incidents',                             [BehaviourIncidentController::class,     'store']);
        Route::get('behaviour/incidents/{behaviourIncident}',          [BehaviourIncidentController::class,     'show']);
        Route::patch('behaviour/incidents/{behaviourIncident}',        [BehaviourIncidentController::class,     'update']);
        Route::get('behaviour/reports/class',                          [BehaviourReportController::class,       'classReport']);
        Route::get('behaviour/reports/student',                        [BehaviourReportController::class,       'studentReport']);
        Route::get('behaviour/reports/incident-types',                 [BehaviourReportController::class,       'incidentTypeReport']);
    });

    // Student behaviour — admin, teacher, and parent (parent further restricted in controller)
    Route::middleware('role:super_admin,admin,teacher,parent')->group(function () {
        Route::get('students/{student}/behaviour-summary',   [BehaviourIncidentController::class, 'studentSummary']);
        Route::get('students/{student}/behaviour-incidents', [BehaviourIncidentController::class, 'studentIncidents']);
    });

    // ── Timetable (Phase 3A foundation) ────────────────────────────────────────
    // Periods & Rooms — read for admin+teacher; writes are admin-only in the admin block.
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::get('timetable/periods',                 [TimetablePeriodController::class, 'index']);
        Route::get('timetable/periods/{timetablePeriod}',[TimetablePeriodController::class, 'show']);
        Route::get('timetable/rooms',                   [TimetableRoomController::class,   'index']);
        Route::get('timetable/rooms/{timetableRoom}',   [TimetableRoomController::class,   'show']);

        // Timetable entries — read for admin+teacher; writes are admin-only in the admin block.
        Route::get('timetable/entries',                  [TimetableEntryController::class, 'index']);
        Route::get('timetable/entries/{timetableEntry}', [TimetableEntryController::class, 'show']);

        // Timetable views (read-only) — dashboard + teacher timetable: admin+teacher.
        // Teacher is restricted to their own id inside the controller.
        Route::get('timetable/dashboard',           [TimetableViewController::class, 'dashboard']);
        Route::get('timetable/teacher/{teacherId}', [TimetableViewController::class, 'teacherTimetable']);

        // Teacher availability — admin manages all; teacher manages own (enforced in controller).
        Route::get('timetable/teacher-availability',                          [TeacherAvailabilityController::class, 'index']);
        Route::post('timetable/teacher-availability',                         [TeacherAvailabilityController::class, 'store']);
        Route::patch('timetable/teacher-availability/{teacherAvailability}',  [TeacherAvailabilityController::class, 'update']);
        Route::delete('timetable/teacher-availability/{teacherAvailability}', [TeacherAvailabilityController::class, 'destroy']);
        Route::post('timetable/teacher-availability/{id}/restore',            [TeacherAvailabilityController::class, 'restore']);
    });

    // Timetable views accessible to parents too — visibility enforced in the controller
    // (parent restricted to their linked child's class; admins/teachers unrestricted).
    Route::middleware('role:super_admin,admin,teacher,parent')->group(function () {
        Route::get('timetable/my',              [TimetableViewController::class, 'my']);
        Route::get('timetable/class/{classId}', [TimetableViewController::class, 'classTimetable']);
    });

    // Academic routes — admin+teacher only; no other role has teaching access
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        // Subjects
        Route::apiResource('subjects', SubjectController::class)->except(['destroy']);

        // Grades — read/write/bulk; destroy restricted to admin below
        Route::apiResource('grades', GradeController::class)->except(['destroy']);
        Route::post('grades/bulk', [GradeController::class, 'bulk']);

        // Assessments — read/write; destroy restricted to admin below
        Route::apiResource('assessments', AssessmentController::class)->except(['destroy']);

        // Grading systems — read-only; write restricted to admin below
        Route::get('grading-systems',                    [GradingSystemController::class, 'index']);
        Route::get('grading-systems/{grading_system}',   [GradingSystemController::class, 'show']);

        // Attendance — read/write/bulk; destroy restricted to admin below
        Route::apiResource('attendance', AttendanceController::class)->except(['destroy']);
        Route::post('/attendance/bulk', [AttendanceController::class, 'bulkStore']);
    });

    // Billing — read access for finance team only; parents use /api/portal/children/{id}/fees
    Route::middleware('role:super_admin,admin,accountant')->group(function () {
        Route::get('invoices',                   [InvoiceController::class, 'index']);
        Route::get('invoices/{invoice}',         [InvoiceController::class, 'show']);
        Route::get('transactions',               [TransactionController::class, 'index']);
        Route::get('transactions/{transaction}', [TransactionController::class, 'show']);
    });
    // Payment initiation is open to any authenticated user (parents pay via portal)
    Route::post('transactions/initiate', [TransactionController::class, 'initiate']);

    // ── Accounting / Finance (Phase 4A) ────────────────────────────────────────
    // Full module gated to the finance team: super_admin, admin, accountant.
    // Teachers and parents are excluded entirely (no view, no manage).
    Route::middleware('role:super_admin,admin,accountant')->group(function () {
        Route::get('finance/dashboard', [FinanceDashboardController::class, 'index']);

        // Income categories
        Route::get('finance/income-categories',                  [IncomeCategoryController::class, 'index']);
        Route::post('finance/income-categories',                 [IncomeCategoryController::class, 'store']);
        Route::get('finance/income-categories/{incomeCategory}', [IncomeCategoryController::class, 'show']);
        Route::patch('finance/income-categories/{incomeCategory}',[IncomeCategoryController::class, 'update']);
        Route::delete('finance/income-categories/{incomeCategory}',[IncomeCategoryController::class, 'destroy']);
        Route::post('finance/income-categories/{id}/restore',    [IncomeCategoryController::class, 'restore']);

        // Expense categories
        Route::get('finance/expense-categories',                   [ExpenseCategoryController::class, 'index']);
        Route::post('finance/expense-categories',                  [ExpenseCategoryController::class, 'store']);
        Route::get('finance/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show']);
        Route::patch('finance/expense-categories/{expenseCategory}',[ExpenseCategoryController::class, 'update']);
        Route::delete('finance/expense-categories/{expenseCategory}',[ExpenseCategoryController::class, 'destroy']);
        Route::post('finance/expense-categories/{id}/restore',     [ExpenseCategoryController::class, 'restore']);

        // Expenses + lifecycle
        Route::get('finance/expenses',              [ExpenseController::class, 'index']);
        Route::post('finance/expenses',             [ExpenseController::class, 'store']);
        Route::get('finance/expenses/{expense}',    [ExpenseController::class, 'show']);
        Route::patch('finance/expenses/{expense}',  [ExpenseController::class, 'update']);
        Route::delete('finance/expenses/{expense}', [ExpenseController::class, 'destroy']);
        Route::post('finance/expenses/{id}/restore',         [ExpenseController::class, 'restore']);
        Route::post('finance/expenses/{expense}/approve',    [ExpenseController::class, 'approve']);
        Route::post('finance/expenses/{expense}/mark-paid',  [ExpenseController::class, 'markPaid']);
        Route::post('finance/expenses/{expense}/cancel',     [ExpenseController::class, 'cancel']);

        // Cashbook (read-only ledger)
        Route::get('finance/cashbook', [CashbookController::class, 'index']);
    });

    // ── v1 endpoints ──────────────────────────────────────────────────────────
    Route::prefix('v1')->group(function () {
        // Class list + grade matrix — admin+teacher only
        Route::middleware('role:super_admin,admin,teacher')->group(function () {
            Route::get('classes',                                      [ClassController::class,      'index']);
            Route::get('classes/{class}/subjects',                     [ClassController::class,      'subjects']);
            Route::get('classes/{class}/subjects/{subject}/grades',    [GradeMatrixController::class,'index']);
        });

        Route::middleware('role:super_admin,admin,teacher')->group(function () {
            Route::get('invoices', [BillingController::class, 'invoices']);
        });
        Route::post('payments/initiate', [TransactionController::class, 'initiate']);

        Route::middleware('role:parent')->group(function () {
            Route::get('parent/overview', [ParentController::class, 'overview']);
        });

        Route::middleware('role:platform_admin')->prefix('platform')->group(function () {
            Route::get('schools',                            [ProvisioningController::class, 'index']);
            Route::post('schools',                           [ProvisioningController::class, 'store']);
            Route::patch('schools/{school}/toggle-active',   [ProvisioningController::class, 'toggleActive']);
            Route::get('demo-requests',                      [DemoRequestController::class, 'index']);
            Route::post('demo-requests/{demoRequest}/approve',[DemoRequestController::class, 'approve']);
            Route::post('demo-requests/{demoRequest}/reject', [DemoRequestController::class, 'reject']);
        });
    });

    // ── Examinations & Results (Phase 5A) ─────────────────────────────────────
    // Exam sessions — read: admin + teacher; write/destroy: admin-only (in admin block below)
    Route::middleware('role:super_admin,admin,teacher')->group(function () {
        Route::get('exams/sessions',                    [ExamSessionController::class,  'index']);
        Route::get('exams/sessions/{examSession}',      [ExamSessionController::class,  'show']);
        Route::get('exams/timetable',                   [ExamTimetableController::class,'index']);
        Route::get('exams/timetable/{examTimetable}',   [ExamTimetableController::class,'show']);
        Route::get('exams/results/dashboard',           [ResultsDashboardController::class, 'index']);
        Route::get('exams/results/class',               [ClassResultsController::class, 'index']);
    });

    // ── Parent Portal (Phase 5B) ───────────────────────────────────────────────
    // Dedicated /api/portal/ routes: role:parent only.
    // All student access is verified by PortalAccessService (parent_user_id check).
    // No student role exists; student-self portal routes are omitted.
    Route::middleware('role:parent')->prefix('portal')->group(function () {
        // List linked children (1-to-1 currently, array for forward-compat)
        Route::get('children',                                          [PortalController::class, 'children']);
        // Per-child portal views
        Route::get('children/{studentId}/overview',                    [PortalController::class, 'childOverview']);
        Route::get('children/{studentId}/attendance',                  [PortalController::class, 'childAttendance']);
        Route::get('children/{studentId}/behaviour',                   [PortalController::class, 'childBehaviour']);
        Route::get('children/{studentId}/fees',                        [PortalController::class, 'childFees']);
        Route::get('children/{studentId}/results',                     [PortalController::class, 'childResults']);
        Route::get('children/{studentId}/report-cards',                [PortalController::class, 'childReportCards']);
        Route::get('children/{studentId}/timetable',                   [PortalController::class, 'childTimetable']);
        // School announcements filtered for this parent's children
        Route::get('announcements',                                    [PortalController::class, 'announcements']);
    });

    // Parents can view their child's report card (existing route); no new endpoints needed.
    // Report card authorization is handled per-request in ReportCardController.

    // ── Admin-only write + destroy routes ─────────────────────────────────────
    Route::middleware('role:super_admin,admin')->group(function () {
        // User management
        Route::get('users',           [UserController::class, 'index']);
        Route::post('users',          [UserController::class, 'store']);
        Route::patch('users/{user}',  [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);

        // Parent linking
        Route::post('students/{student}/link-parent',   [StudentController::class, 'linkParent']);
        Route::delete('students/{student}/link-parent', [StudentController::class, 'unlinkParent']);

        // Destructive operations (admin only)
        Route::delete('students/{student}',      [StudentController::class,    'destroy']);
        Route::delete('subjects/{subject}',      [SubjectController::class,    'destroy']);
        Route::delete('grades/{grade}',          [GradeController::class,      'destroy']);
        Route::delete('assessments/{assessment}',[AssessmentController::class, 'destroy']);
        Route::delete('attendance/{attendance}', [AttendanceController::class, 'destroy']);

        // Grading systems — full CRUD for admin
        Route::post('grading-systems',                    [GradingSystemController::class, 'store']);
        Route::patch('grading-systems/{grading_system}',  [GradingSystemController::class, 'update']);
        Route::delete('grading-systems/{grading_system}', [GradingSystemController::class, 'destroy']);
        Route::post('grading-systems/{gradingSystem}/boundaries',                    [GradingSystemController::class, 'storeBoundary']);
        Route::put('grading-systems/{gradingSystem}/boundaries/{boundary}',          [GradingSystemController::class, 'updateBoundary']);
        Route::delete('grading-systems/{gradingSystem}/boundaries/{boundary}',       [GradingSystemController::class, 'destroyBoundary']);

        // Finance write
        Route::apiResource('fee-structures', FeeStructureController::class);
        Route::post('invoices/generate',         [InvoiceController::class, 'generate']);
        Route::delete('invoices/{invoice}',      [InvoiceController::class, 'destroy']);

        // Communications — admin write (SMS/email create, send, cancel; template CRUD + restore)
        Route::post('communications/templates',                           [CommunicationTemplateController::class, 'store']);
        Route::patch('communications/templates/{communicationTemplate}',  [CommunicationTemplateController::class, 'update']);
        Route::delete('communications/templates/{communicationTemplate}', [CommunicationTemplateController::class, 'destroy']);
        Route::post('communications/templates/{id}/restore',             [CommunicationTemplateController::class, 'restore']);
        Route::post('communications',                                    [CommunicationController::class,         'store']);
        Route::post('communications/{communication}/send',               [CommunicationController::class,         'send']);
        Route::post('communications/{communication}/cancel',             [CommunicationController::class,         'cancel']);
        // Announcements — admin-only destroy
        Route::delete('announcements/{announcement}',                    [AnnouncementController::class,          'destroy']);

        // Behaviour — admin-only: type management + destroy + restore
        Route::post('behaviour/incident-types',                           [BehaviourIncidentTypeController::class, 'store']);
        Route::patch('behaviour/incident-types/{behaviourIncidentType}',  [BehaviourIncidentTypeController::class, 'update']);
        Route::delete('behaviour/incident-types/{behaviourIncidentType}', [BehaviourIncidentTypeController::class, 'destroy']);
        Route::post('behaviour/incident-types/{id}/restore',              [BehaviourIncidentTypeController::class, 'restore']);
        Route::delete('behaviour/incidents/{behaviourIncident}',          [BehaviourIncidentController::class, 'destroy']);
        Route::post('behaviour/incidents/{id}/restore',                   [BehaviourIncidentController::class, 'restore']);

        // Timetable settings — periods & rooms management (admin only)
        Route::post('timetable/periods',                  [TimetablePeriodController::class, 'store']);
        Route::patch('timetable/periods/{timetablePeriod}',[TimetablePeriodController::class, 'update']);
        Route::delete('timetable/periods/{timetablePeriod}',[TimetablePeriodController::class, 'destroy']);
        Route::post('timetable/periods/{id}/restore',     [TimetablePeriodController::class, 'restore']);
        Route::post('timetable/rooms',                    [TimetableRoomController::class, 'store']);
        Route::patch('timetable/rooms/{timetableRoom}',   [TimetableRoomController::class, 'update']);
        Route::delete('timetable/rooms/{timetableRoom}',  [TimetableRoomController::class, 'destroy']);
        Route::post('timetable/rooms/{id}/restore',       [TimetableRoomController::class, 'restore']);

        // Timetable entries — scheduling writes (admin only); conflict detection enforced in service
        Route::post('timetable/entries',                   [TimetableEntryController::class, 'store']);
        Route::patch('timetable/entries/{timetableEntry}', [TimetableEntryController::class, 'update']);
        Route::delete('timetable/entries/{timetableEntry}',[TimetableEntryController::class, 'destroy']);
        Route::post('timetable/entries/{id}/restore',      [TimetableEntryController::class, 'restore']);

        // Exam sessions — admin write + destroy
        Route::post('exams/sessions',                       [ExamSessionController::class,   'store']);
        Route::patch('exams/sessions/{examSession}',        [ExamSessionController::class,   'update']);
        Route::delete('exams/sessions/{examSession}',       [ExamSessionController::class,   'destroy']);
        Route::post('exams/sessions/{id}/restore',          [ExamSessionController::class,   'restore']);

        // Exam timetable — admin write + destroy (conflict detection in service)
        Route::post('exams/timetable',                      [ExamTimetableController::class, 'store']);
        Route::patch('exams/timetable/{examTimetable}',     [ExamTimetableController::class, 'update']);
        Route::delete('exams/timetable/{examTimetable}',    [ExamTimetableController::class, 'destroy']);
        Route::post('exams/timetable/{id}/restore',         [ExamTimetableController::class, 'restore']);

        // Restore soft-deleted records (admin only)
        Route::post('students/{id}/restore',      [StudentController::class,      'restore']);
        Route::post('assessments/{id}/restore',   [AssessmentController::class,   'restore']);
        Route::post('fee-structures/{id}/restore',[FeeStructureController::class, 'restore']);
        Route::post('invoices/{id}/restore',      [InvoiceController::class,      'restore']);
        Route::post('attendance/{id}/restore',    [AttendanceController::class,   'restore']);
    });
});
