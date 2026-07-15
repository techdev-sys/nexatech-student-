<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'school_id'   => School::factory(),
            'first_name'  => fake()->firstName(),
            'last_name'   => fake()->lastName(),
            'grade_level' => 'Grade 8',
            'status'      => 'active',
        ];
    }
}
