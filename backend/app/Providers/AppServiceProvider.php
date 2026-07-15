<?php

namespace App\Providers;

use App\Models\Assessment;
use App\Models\ExamSession;
use App\Models\ExamTimetable;
use App\Models\Attendance;
use App\Models\BehaviourIncident;
use App\Models\BehaviourIncidentType;
use App\Models\Communication;
use App\Models\CommunicationTemplate;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Grade;
use App\Models\IncomeCategory;
use App\Models\Invoice;
use App\Models\ParentStudent;
use App\Models\Student;
use App\Models\TeacherAvailability;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\TimetableRoom;
use App\Models\Transaction;
use App\Observers\AuditObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Audit trail — log WHO changed WHAT and WHEN.
        // NOT observing User model (hashed passwords) or CommunicationDelivery (too high volume).
        // Models with $auditRedact strip sensitive fields before logging.
        foreach ([
            Student::class,
            ParentStudent::class,
            Grade::class,
            Attendance::class,
            Invoice::class,
            Transaction::class,
            Assessment::class,
            BehaviourIncident::class,
            BehaviourIncidentType::class,
            Communication::class,
            CommunicationTemplate::class,
            TimetablePeriod::class,
            TimetableRoom::class,
            TeacherAvailability::class,
            TimetableEntry::class,
            IncomeCategory::class,
            ExpenseCategory::class,
            Expense::class,
            ExamSession::class,
            ExamTimetable::class,
        ] as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
