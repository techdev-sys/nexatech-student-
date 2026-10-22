<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\BehaviourIncident;
use App\Models\BehaviourIncidentType;
use App\Models\Communication;
use App\Models\ExamSession;
use App\Models\ExamTimetable;
use App\Models\Grade;
use App\Models\GradeBoundary;
use App\Models\GradingSystem;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\TimetableRoom;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GreenWoodHighDemoSeeder extends Seeder
{
    private const PASSWORD = 'GreenWood2026!';

    public function run(): void
    {
        if (School::where('email', 'admin@greenwoodhigh.demo')->exists()) {
            $this->command?->info('GreenWood High demo is already seeded.');
            return;
        }

        $school = School::updateOrCreate(['email' => 'admin@greenwoodhigh.demo'], [
            'name' => 'GreenWood High School', 'phone' => '+263 77 555 0140',
            'address' => '18 Borrowdale Road, Harare', 'is_active' => true, 'is_demo' => true,
        ]);

        $admin = $this->user($school->id, 'GreenWood Demo Administrator', 'admin@greenwoodhigh.demo', 'super_admin');
        $teachers = [];
        foreach ([
            ['Ms. R. Moyo', 'r.moyo@greenwoodhigh.demo'], ['Mr. T. Ncube', 't.ncube@greenwoodhigh.demo'],
            ['Mrs. C. Dube', 'c.dube@greenwoodhigh.demo'], ['Mr. F. Sibanda', 'f.sibanda@greenwoodhigh.demo'],
            ['Ms. P. Mlambo', 'p.mlambo@greenwoodhigh.demo'], ['Mr. B. Chirwa', 'b.chirwa@greenwoodhigh.demo'],
            ['Mrs. L. Mutsvangwa', 'l.mutsvangwa@greenwoodhigh.demo'],
        ] as [$name, $email]) $teachers[] = $this->user($school->id, $name, $email, 'teacher');

        $classes = [];
        foreach ([
            'East' => 'Arts', 'West' => 'Sciences', 'North' => 'Commercials',
        ] as $section => $stream) {
            $classes[$section] = SchoolClass::updateOrCreate(
                ['school_id' => $school->id, 'name' => "Form 3 {$section} - {$stream}"],
                ['grade_level' => 'Form 3', 'section' => $section]
            );
        }

        $subjectDefinitions = [
            ['ENG3', 'English Language', null], ['MATH3', 'Mathematics', null], ['SHONA3', 'Shona', null],
            ['HIST3', 'History', 'Arts'], ['GEO3', 'Geography', 'Arts'], ['LIT3', 'Literature in English', 'Arts'],
            ['PHY3', 'Physics', 'Sciences'], ['CHEM3', 'Chemistry', 'Sciences'], ['BIO3', 'Biology', 'Sciences'],
            ['ACC3', 'Principles of Accounts', 'Commercials'], ['BUS3', 'Business Studies', 'Commercials'], ['ECON3', 'Economics', 'Commercials'],
        ];
        $subjects = [];
        foreach ($subjectDefinitions as [$code, $name, $stream]) {
            $subjects[$code] = Subject::updateOrCreate(
                ['school_id' => $school->id, 'code' => $code], ['name' => $name, 'grade_level' => 'Form 3']
            );
        }

        $grading = GradingSystem::updateOrCreate(['school_id' => $school->id, 'name' => 'ZIMSEC Demo Scale'], ['is_default' => true]);
        foreach ([['A','Distinction',75,100,1], ['B','Merit',60,74,2], ['C','Credit',50,59,3], ['D','Pass',40,49,4], ['E','Fail',0,39,null]] as [$letter,$label,$min,$max,$points]) {
            GradeBoundary::updateOrCreate(['grading_system_id' => $grading->id, 'letter_grade' => $letter], ['label' => $label, 'min_score' => $min, 'max_score' => $max, 'is_pass' => $letter !== 'E', 'points' => $points]);
        }
        $grading->load('boundaries');

        $firstNames = ['Tariro','Chiedza','Farai','Rudo','Simba','Kudzai','Tanaka','Nyasha','Tafadzwa','Blessing'];
        $lastNames = ['Moyo','Ncube','Dube','Sibanda','Mlambo','Chirwa','Mutsvangwa','Chikore','Maphosa','Zhou'];
        $studentsBySection = [];
        $studentIndex = 1;
        foreach ($classes as $section => $class) {
            $stream = str_contains($class->name, 'Sciences') ? 'Sciences' : (str_contains($class->name, 'Commercials') ? 'Commercials' : 'Arts');
            for ($i = 1; $i <= 50; $i++, $studentIndex++) {
                $reg = sprintf('GWH-F3-%s-%03d', strtoupper(substr($section, 0, 1)), $i);
                $first = $firstNames[($studentIndex - 1) % count($firstNames)];
                $last = $lastNames[(int) floor(($studentIndex - 1) / count($firstNames)) % count($lastNames)];
                $parent = $this->user($school->id, "{$first} {$last} Parent", strtolower("parent.{$reg}@greenwoodhigh.demo"), 'parent');
                $student = Student::updateOrCreate(['school_id' => $school->id, 'student_number' => $reg], [
                    'parent_user_id' => $parent->id, 'first_name' => $first, 'last_name' => $last,
                    'email' => strtolower("{$reg}@students.greenwoodhigh.demo"), 'grade_level' => 'Form 3', 'section' => $section,
                    'date_of_birth' => now()->subYears(15)->subDays($studentIndex)->toDateString(), 'enrollment_date' => '2026-01-12',
                    'status' => 'active', 'parent_name' => "{$first} {$last} Parent", 'parent_phone' => '+263 77' . str_pad((string) $studentIndex, 7, '0', STR_PAD_LEFT),
                ]);
                ParentStudent::withTrashed()->updateOrCreate(['parent_user_id' => $parent->id, 'student_id' => $student->id], [
                    'school_id' => $school->id, 'relationship' => 'parent', 'is_primary_contact' => true, 'can_receive_sms' => true, 'can_receive_email' => true, 'deleted_at' => null,
                ]);
                $studentsBySection[$section][] = $student;
            }
        }

        $periods = [];
        foreach ([['Period 1','08:00','08:45'],['Period 2','08:50','09:35'],['Period 3','09:40','10:25'],['Period 4','10:45','11:30'],['Period 5','11:35','12:20'],['Period 6','12:25','13:10']] as $order => [$name,$start,$end]) {
            $periods[] = TimetablePeriod::updateOrCreate(['school_id' => $school->id, 'name' => $name], ['starts_at' => $start, 'ends_at' => $end, 'sort_order' => $order + 1, 'is_break' => false, 'is_active' => true]);
        }
        $rooms = [];
        foreach (['East Block 3','Science Lab 1','Commerce Centre'] as $name) $rooms[] = TimetableRoom::updateOrCreate(['school_id' => $school->id, 'name' => $name], ['room_type' => 'classroom', 'capacity' => 50, 'is_active' => true]);

        $streamSubjects = [
            'Arts' => ['ENG3','MATH3','SHONA3','HIST3','GEO3','LIT3'], 'Sciences' => ['ENG3','MATH3','PHY3','CHEM3','BIO3','SHONA3'],
            'Commercials' => ['ENG3','MATH3','ACC3','BUS3','ECON3','SHONA3'],
        ];
        foreach ($classes as $section => $class) {
            $stream = str_contains($class->name, 'Sciences') ? 'Sciences' : (str_contains($class->name, 'Commercials') ? 'Commercials' : 'Arts');
            foreach ($streamSubjects[$stream] as $slot => $code) {
                $teacher = $teachers[$slot % count($teachers)];
                TimetableEntry::updateOrCreate(['school_id' => $school->id, 'class_id' => $class->id, 'day_of_week' => ['monday','tuesday','wednesday','thursday','friday','monday'][$slot], 'period_id' => $periods[$slot]->id], [
                    'subject_id' => $subjects[$code]->id, 'teacher_user_id' => $teacher->id, 'room_id' => $rooms[array_search($section, array_keys($classes))]->id, 'academic_year' => '2026', 'term' => '3', 'status' => 'active',
                ]);
            }
        }

        $examSession = ExamSession::updateOrCreate(['school_id' => $school->id, 'name' => '2026 Year-End Examinations'], ['academic_year' => '2026', 'term' => 3, 'start_date' => '2026-11-16', 'end_date' => '2026-11-27', 'status' => 'active', 'description' => 'Form 3 year-end demonstration examinations']);
        foreach ($classes as $section => $class) {
            $stream = str_contains($class->name, 'Sciences') ? 'Sciences' : (str_contains($class->name, 'Commercials') ? 'Commercials' : 'Arts');
            foreach ($streamSubjects[$stream] as $slot => $code) {
                $subject = $subjects[$code]; $teacher = $teachers[$slot % count($teachers)];
                $assessment = Assessment::updateOrCreate(['school_id' => $school->id, 'name' => "{$class->name} {$subject->name} Year-End Exam"], ['subject_id' => $subject->id, 'grading_system_id' => $grading->id, 'exam_session_id' => $examSession->id, 'academic_year' => '2026', 'term' => '3', 'type' => 'exam', 'weightage' => 70, 'max_marks' => 100]);
                ExamTimetable::updateOrCreate(['school_id' => $school->id, 'exam_session_id' => $examSession->id, 'class_id' => $class->id, 'subject_id' => $subject->id], ['room_id' => $rooms[array_search($section, array_keys($classes))]->id, 'exam_date' => now()->setDate(2026, 11, 16)->addDays($slot)->toDateString(), 'start_time' => '08:30', 'end_time' => '10:30', 'supervisor_user_id' => $teacher->id, 'notes' => 'Bring approved examination materials only.']);
                foreach ($studentsBySection[$section] as $position => $student) {
                    $score = 45 + (($position * 7 + $slot * 9) % 51); $boundary = $grading->resolve($score);
                    Grade::updateOrCreate(['school_id' => $school->id, 'student_id' => $student->id, 'assessment_id' => $assessment->id], ['subject_id' => $subject->id, 'teacher_id' => $teacher->id, 'term' => '3', 'score' => $score, 'weighted_score' => round($score * .7, 2), 'grade_letter' => $boundary?->letter_grade, 'remarks' => $boundary?->label, 'academic_year' => '2026']);
                }
            }
        }

        foreach ($studentsBySection as $section => $studentList) foreach ($studentList as $position => $student) for ($day = 1; $day <= 10; $day++) {
            $status = (($position + $day) % 17 === 0) ? 'absent' : ((($position + $day) % 11 === 0) ? 'late' : 'present');
            Attendance::updateOrCreate(['school_id' => $school->id, 'student_id' => $student->id, 'subject_id' => $subjects['ENG3']->id, 'date' => "2026-10-{$day}"], ['teacher_id' => $teachers[0]->id, 'status' => $status, 'remarks' => $status === 'present' ? null : ucfirst($status) . ' - demo record']);
        }

        $incidentTypes = [];
        foreach ([['Excellent contribution', 5, 'positive'], ['Late to class', -2, 'attendance'], ['Uniform concern', -1, 'conduct']] as [$name,$points,$category]) $incidentTypes[$name] = BehaviourIncidentType::updateOrCreate(['school_id' => $school->id, 'name' => $name], ['default_points' => $points, 'severity' => $points > 0 ? 'positive' : 'minor', 'category' => $category, 'notify_parent' => $points < 0, 'is_active' => true]);
        $allStudents = array_merge(...array_values($studentsBySection));
        foreach (array_slice($allStudents, 0, 18) as $i => $student) {
            $typeName = $i % 3 === 0 ? 'Excellent contribution' : ($i % 3 === 1 ? 'Late to class' : 'Uniform concern'); $type = $incidentTypes[$typeName];
            BehaviourIncident::updateOrCreate(['school_id' => $school->id, 'student_id' => $student->id, 'incident_date' => now()->subDays($i + 1)->toDateString(), 'incident_type_id' => $type->id], ['reported_by_user_id' => $teachers[$i % count($teachers)]->id, 'class_id' => $classes[$student->section]->id, 'subject_id' => $subjects['ENG3']->id, 'term' => '3', 'academic_year' => '2026', 'points' => $type->default_points, 'description' => "Demonstration behaviour record: {$typeName}.", 'action_taken' => $type->default_points < 0 ? 'Student counselled; parent portal note available.' : 'Positive recognition recorded.', 'status' => 'reviewed', 'reviewed_by_user_id' => $admin->id, 'reviewed_at' => now()]);
        }
        foreach ([['Welcome to the GreenWood High demo portal', 'Families can view attendance, results, exam timetables and school announcements securely from one place.'], ['Year-end examinations: Form 3', 'The 2026 Form 3 year-end timetable is now available in the portal. Please check each subject date and arrive 30 minutes early.'], ['GreenWood High app news', 'The school portal now includes attendance summaries, behaviour acknowledgements and parent-friendly result views.']] as [$subject,$body]) Communication::updateOrCreate(['school_id' => $school->id, 'channel' => 'announcement', 'subject' => $subject], ['created_by_user_id' => $admin->id, 'audience_type' => 'all', 'body' => $body, 'published_at' => now(), 'sent_at' => now(), 'status' => 'completed', 'total_recipients' => 150, 'successful_deliveries' => 150, 'failed_deliveries' => 0]);

        $this->command?->info('GreenWood High demo seeded: 3 Form 3 streams, 150 students/parents, teachers, attendance, exams, marks, behaviour, and announcements.');
        $this->command?->info('Demo password for administrator, teachers, and parent portal accounts: ' . self::PASSWORD);
    }

    private function user(int $schoolId, string $name, string $email, string $role): User
    {
        return User::updateOrCreate(['email' => $email], ['school_id' => $schoolId, 'name' => $name, 'password' => Hash::make(self::PASSWORD), 'role' => $role, 'is_demo' => true, 'email_verified_at' => now()]);
    }
}
