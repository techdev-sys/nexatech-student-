<?php

namespace Database\Seeders;

use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoSchoolSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::updateOrCreate(
            ['email' => config('demo.school_email')],
            [
                'name' => 'NEXATECH Demonstration School',
                'phone' => null,
                'address' => 'Synthetic demonstration environment',
                'is_active' => true,
                'is_demo' => true,
            ]
        );

        $users = [];
        foreach ([
            'admin' => 'Demo Administrator',
            'teacher' => 'Demo Teacher',
            'parent' => 'Demo Parent',
        ] as $role => $name) {
            $user = User::updateOrCreate(
                ['email' => "demo-{$role}@nexatech.invalid"],
                [
                    'school_id' => $school->id,
                    'name' => $name,
                    'password' => Hash::make(Str::random(64)),
                    'role' => $role,
                    'is_demo' => true,
                    'email_verified_at' => now(),
                ]
            );
            $user->tokens()->delete();
            $users[$role] = $user;
        }

        $class = SchoolClass::updateOrCreate(
            ['school_id' => $school->id, 'name' => 'Form 3 Demo'],
            ['grade_level' => 'Form 3', 'section' => 'D']
        );

        Subject::updateOrCreate(
            ['school_id' => $school->id, 'code' => 'DEMO-MATH'],
            ['name' => 'Mathematics', 'grade_level' => 'Form 3']
        );

        $student = Student::updateOrCreate(
            ['school_id' => $school->id, 'student_number' => 'DEMO-001'],
            [
                'parent_user_id' => $users['parent']->id,
                'first_name' => 'Tariro',
                'last_name' => 'Demo',
                'email' => 'student-demo@nexatech.invalid',
                'grade_level' => 'Form 3',
                'section' => 'D',
                'date_of_birth' => now()->subYears(15)->startOfYear()->toDateString(),
                'enrollment_date' => now()->startOfYear()->toDateString(),
                'status' => 'active',
                'parent_name' => 'Demo Parent',
                'parent_phone' => '+263 000 000 000',
            ]
        );

        ParentStudent::withTrashed()->updateOrCreate(
            ['parent_user_id' => $users['parent']->id, 'student_id' => $student->id],
            [
                'school_id' => $school->id,
                'relationship' => 'guardian',
                'is_primary_contact' => true,
                'can_receive_sms' => false,
                'can_receive_email' => false,
                'deleted_at' => null,
            ]
        );

        $this->command?->info('Seeded isolated read-only demo school with synthetic records.');
    }
}
