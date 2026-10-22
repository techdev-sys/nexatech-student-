<?php

namespace App\Console\Commands;

use App\Models\{School, User, Student, Subject, SchoolClass, Assessment, Grade, Attendance};
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProvisionDemoVisitor extends Command
{
    protected $signature = 'demo:provision-visitor';
    protected $description = 'Provision an isolated read-only visitor login and synthetic demonstration records';

    public function handle(): int
    {
        $hash = (string) getenv('DEMO_VISITOR_PASSWORD_HASH');
        if (! preg_match('/^\$2[aby]\$\d{2}\$[.\/A-Za-z0-9]{53}$/', $hash)) {
            $this->error('DEMO_VISITOR_PASSWORD_HASH must contain a bcrypt hash.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($hash) {
            $school = School::where('email', config('demo.school_email'))->first();
            if (! $school || ! $school->is_demo || ! $school->is_active) {
                throw new RuntimeException('An active demonstration school is required.');
            }
            $visitor = User::firstOrNew(['email' => 'demo-visitor@nexatech.invalid']);
            if ($visitor->exists && (! $visitor->is_demo || $visitor->school_id !== $school->id)) {
                throw new RuntimeException('The visitor email belongs to a different account.');
            }
            $visitor->forceFill([
                'name' => 'Demo Visitor', 'school_id' => $school->id,
                'role' => 'admin', 'is_demo' => true, 'password' => $hash,
                'email_verified_at' => now(),
            ])->save();
            $teacher = User::where('school_id', $school->id)->where('is_demo', true)->where('role', 'teacher')->firstOrFail();
            $subjects = [];
            foreach (['Mathematics', 'English', 'Science', 'Geography'] as $name) {
                $subjects[] = Subject::updateOrCreate(
                    ['school_id' => $school->id, 'code' => 'VIS-'.strtoupper(substr($name, 0, 4))],
                    ['name' => $name.' (Demo)', 'grade_level' => 'Form 3']
                );
            }
            SchoolClass::firstOrCreate(['school_id' => $school->id, 'name' => 'Form 3 Demo'], ['grade_level' => 'Form 3', 'section' => 'D']);
            foreach (['Tariro', 'Tendai', 'Rudo', 'Nyasha', 'Farai', 'Chipo', 'Tinashe', 'Rutendo', 'Tatenda', 'Kudzai', 'Anesu', 'Vimbai'] as $i => $name) {
                $student = Student::updateOrCreate(
                    ['school_id' => $school->id, 'student_number' => sprintf('VIS-%03d', $i + 1)],
                    ['first_name' => $name, 'last_name' => 'Sample', 'grade_level' => 'Form 3',
                     'section' => 'D', 'status' => 'active', 'enrollment_date' => now()->startOfYear(),
                     'date_of_birth' => now()->subYears(15)->startOfYear(), 'parent_name' => 'Sample Guardian']
                );
                foreach ($subjects as $j => $subject) {
                    $assessment = Assessment::updateOrCreate(
                        ['school_id' => $school->id, 'subject_id' => $subject->id, 'name' => 'Demo Term Assessment', 'academic_year' => now()->format('Y'), 'term' => 3],
                        ['weightage' => 100, 'max_marks' => 100]
                    );
                    $score = 52 + (($i * 7 + $j * 11) % 45);
                    Grade::updateOrCreate(
                        ['school_id' => $school->id, 'student_id' => $student->id, 'subject_id' => $subject->id, 'assessment_id' => $assessment->id],
                        ['teacher_id' => $teacher->id, 'term' => '3', 'academic_year' => now()->format('Y'), 'score' => $score,
                         'weighted_score' => $score, 'grade_letter' => $score >= 75 ? 'A' : ($score >= 65 ? 'B' : 'C'), 'remarks' => 'Synthetic demonstration result.']
                    );
                    for ($day = 0; $day < 5; $day++) {
                        $date = now()->subDays($day)->toDateString();
                        $keys = ['school_id' => $school->id, 'student_id' => $student->id, 'subject_id' => $subject->id];
                        $attendance = Attendance::where($keys)->whereDate('date', $date)->first() ?? new Attendance($keys);
                        $attendance->fill(['date' => $date, 'teacher_id' => $teacher->id,
                            'status' => ($i + $day) % 11 === 0 ? 'absent' : 'present',
                            'remarks' => 'Synthetic demo attendance.'])->save();
                    }
                }
            }
        });
        $this->info('Demo visitor ready: demo-visitor@nexatech.invalid (read-only).');
        return self::SUCCESS;
    }
}
