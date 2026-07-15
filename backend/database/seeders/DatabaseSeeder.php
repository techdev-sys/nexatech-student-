<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\FeeStructure;
use App\Models\Grade;
use App\Models\GradeBoundary;
use App\Models\GradingSystem;
use App\Models\Invoice;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Platform admin (no school — bypasses all tenant scoping) ────────
        User::create([
            'school_id' => null,
            'name'      => 'Platform Admin',
            'email'     => 'platform@studentmonitor.app',
            'password'  => Hash::make('password'),
            'role'      => 'platform_admin',
        ]);

        // ── School ──────────────────────────────────────────────
        $school = School::create([
            'name'      => 'Greenwood Academy',
            'email'     => 'admin@greenwood.ac.zw',
            'phone'     => '+263 77 123 4567',
            'address'   => '12 Samora Machel Ave, Harare',
            'is_active' => true,
        ]);

        // ── Users ────────────────────────────────────────────────
        $admin = User::create([
            'school_id' => $school->id,
            'name'      => 'Admin User',
            'email'     => 'admin@greenwood.ac.zw',
            'password'  => Hash::make('password'),
            'role'      => 'super_admin',
        ]);

        $teacher = User::create([
            'school_id' => $school->id,
            'name'      => 'Jane Teacher',
            'email'     => 'teacher@greenwood.ac.zw',
            'password'  => Hash::make('password'),
            'role'      => 'teacher',
        ]);

        // Parent user — linked to student GW001 after student creation below
        $parentUser = User::create([
            'school_id' => $school->id,
            'name'      => 'Blessing Moyo',
            'email'     => 'parent@greenwood.ac.zw',
            'password'  => Hash::make('password'),
            'role'      => 'parent',
        ]);

        // ── Grading System ───────────────────────────────────────
        $gradingSystem = GradingSystem::create([
            'school_id'  => $school->id,
            'name'       => 'Standard (A–E)',
            'is_default' => true,
        ]);

        foreach ([
            ['letter_grade' => 'A', 'label' => 'Distinction', 'min_score' => 75, 'max_score' => 100, 'is_pass' => true,  'points' => 1],
            ['letter_grade' => 'B', 'label' => 'Merit',       'min_score' => 60, 'max_score' => 74,  'is_pass' => true,  'points' => 2],
            ['letter_grade' => 'C', 'label' => 'Credit',      'min_score' => 50, 'max_score' => 59,  'is_pass' => true,  'points' => 3],
            ['letter_grade' => 'D', 'label' => 'Pass',        'min_score' => 40, 'max_score' => 49,  'is_pass' => true,  'points' => 4],
            ['letter_grade' => 'E', 'label' => 'Fail',        'min_score' => 0,  'max_score' => 39,  'is_pass' => false, 'points' => null],
        ] as $b) {
            GradeBoundary::create(array_merge($b, ['grading_system_id' => $gradingSystem->id]));
        }

        // ── Classes ───────────────────────────────────────────────
        $form3 = SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => 'Form 3A',
            'grade_level' => 'Form 3',
            'section'     => 'A',
        ]);

        SchoolClass::create([
            'school_id'   => $school->id,
            'name'        => 'Form 4B',
            'grade_level' => 'Form 4',
            'section'     => 'B',
        ]);

        // ── Subjects ─────────────────────────────────────────────
        $subjects = [];
        foreach ([
            ['name' => 'Mathematics',      'code' => 'MATH301'],
            ['name' => 'English Language', 'code' => 'ENG301'],
            ['name' => 'Science',          'code' => 'SCI301'],
            ['name' => 'History',          'code' => 'HIS301'],
        ] as $s) {
            $subjects[] = Subject::create([
                'school_id'   => $school->id,
                'name'        => $s['name'],
                'code'        => $s['code'],
                'grade_level' => 'Form 3',
            ]);
        }

        // ── Students ──────────────────────────────────────────────
        $students = [];
        foreach ([
            ['first_name' => 'Takudzwa', 'last_name' => 'Moyo',     'number' => 'GW001', 'link_parent' => true],
            ['first_name' => 'Chiedza',  'last_name' => 'Dube',     'number' => 'GW002', 'link_parent' => false],
            ['first_name' => 'Farai',    'last_name' => 'Mhike',    'number' => 'GW003', 'link_parent' => false],
            ['first_name' => 'Simba',    'last_name' => 'Ncube',    'number' => 'GW004', 'link_parent' => false],
            ['first_name' => 'Rudo',     'last_name' => 'Chikwanda','number' => 'GW005', 'link_parent' => false],
        ] as $i => $s) {
            $students[] = Student::create([
                'school_id'      => $school->id,
                'parent_user_id' => $s['link_parent'] ? $parentUser->id : null,
                'first_name'     => $s['first_name'],
                'last_name'      => $s['last_name'],
                'student_number' => $s['number'],
                'email'          => strtolower($s['first_name']) . '@student.greenwood.ac.zw',
                'grade_level'    => 'Form 3',
                'section'        => 'A',
                'date_of_birth'  => now()->subYears(15 + $i)->toDateString(),
                'enrollment_date'=> '2026-01-20',
                'status'         => 'active',
                'parent_name'    => 'Parent of ' . $s['first_name'],
                'parent_phone'   => '+263 77 000 000' . $i,
            ]);
        }

        // ── Assessments ──────────────────────────────────────────
        // Two assessments per subject (mid-term + end-of-term)
        $assessments = [];
        foreach ($subjects as $subject) {
            $assessments[$subject->id]['mid'] = Assessment::create([
                'school_id'         => $school->id,
                'subject_id'        => $subject->id,
                'grading_system_id' => $gradingSystem->id,
                'name'              => $subject->name . ' — Mid-Term Test',
                'academic_year'     => '2026',
                'term'              => 1,
                'weightage'         => 30,
                'max_marks'         => 100,
            ]);
            $assessments[$subject->id]['end'] = Assessment::create([
                'school_id'         => $school->id,
                'subject_id'        => $subject->id,
                'grading_system_id' => $gradingSystem->id,
                'name'              => $subject->name . ' — End-of-Term Exam',
                'academic_year'     => '2026',
                'term'              => 2,
                'weightage'         => 70,
                'max_marks'         => 100,
            ]);
        }

        // ── Grades ─────────────────────────────────────────────
        // One grade row per student / subject / term (unique constraint)
        $gradingSystem->load('boundaries');
        $scores = [82, 67, 55, 91, 44, 73, 60, 88, 38, 70, 85, 63, 50, 77, 41, 68, 92, 57, 80, 46];
        $idx = 0;
        foreach ($students as $student) {
            foreach ($subjects as $subject) {
                foreach (['mid' => 1, 'end' => 2] as $key => $term) {
                    $assessment    = $assessments[$subject->id][$key];
                    $score         = $scores[$idx % count($scores)];
                    $percentage    = ($score / $assessment->max_marks) * 100;
                    $weightedScore = round(($percentage / 100) * $assessment->weightage, 2);
                    $boundary      = $gradingSystem->resolve($percentage);

                    Grade::create([
                        'school_id'      => $school->id,
                        'student_id'     => $student->id,
                        'subject_id'     => $subject->id,
                        'teacher_id'     => $teacher->id,
                        'assessment_id'  => $assessment->id,
                        'term'           => (string) $term,
                        'score'          => $score,
                        'weighted_score' => $weightedScore,
                        'grade_letter'   => $boundary?->letter_grade,
                        'remarks'        => $boundary?->label,
                        'academic_year'  => '2026',
                    ]);
                    $idx++;
                }
            }
        }

        // ── Attendance ────────────────────────────────────────────
        $dates    = ['2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23'];
        $statuses = ['present', 'present', 'present', 'absent', 'present'];

        foreach ($students as $student) {
            foreach ($dates as $di => $date) {
                Attendance::create([
                    'school_id'  => $school->id,
                    'student_id' => $student->id,
                    'subject_id' => $subjects[0]->id,
                    'teacher_id' => $teacher->id,
                    'date'       => $date,
                    'status'     => $statuses[$di],
                    'remarks'    => $statuses[$di] === 'absent' ? 'No reason given' : null,
                ]);
            }
        }

        // ── Fee Structure + Invoices ──────────────────────────────
        $fee = FeeStructure::create([
            'school_id'     => $school->id,
            'title'         => 'Term 1 Tuition — Form 3',
            'academic_year' => '2026',
            'term'          => 1,
            'amount'        => 250.00,
            'currency'      => 'USD',
            'class_id'      => $form3->id,
        ]);

        foreach ($students as $i => $student) {
            $num = str_pad($i + 1, 4, '0', STR_PAD_LEFT);
            Invoice::create([
                'school_id'        => $school->id,
                'student_id'       => $student->id,
                'fee_structure_id' => $fee->id,
                'invoice_number'   => "INV-2026-{$num}",
                'total_amount'     => $fee->amount,
                'paid_amount'      => 0,
                'balance_amount'   => $fee->amount,
                'status'           => 'unpaid',
                'due_date'         => '2026-06-30',
            ]);
        }

        $this->command->info('Seeded: 1 school · 3 users · 5 students · 4 subjects · 8 assessments · 40 grade records · 25 attendance records · 5 invoices');
        $this->command->info('Accounts (password: password):');
        $this->command->info('  super_admin → admin@greenwood.ac.zw');
        $this->command->info('  teacher     → teacher@greenwood.ac.zw');
        $this->command->info('  parent      → parent@greenwood.ac.zw  (linked to GW001 Takudzwa Moyo)');
        $this->command->info('  platform    → platform@studentmonitor.app');
    }
}
