<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\TeacherAvailability;
use App\Models\TimetablePeriod;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherAvailability>
 */
class TeacherAvailabilityFactory extends Factory
{
    protected $model = TeacherAvailability::class;

    public function definition(): array
    {
        return [
            'school_id'           => School::factory(),
            'teacher_user_id'     => User::factory()->teacher(),
            'day_of_week'         => 'monday',
            'period_id'           => TimetablePeriod::factory(),
            'availability_status' => 'available',
            'reason'              => null,
        ];
    }

    public function unavailable(): static
    {
        return $this->state(['availability_status' => 'unavailable', 'reason' => 'Department meeting']);
    }

    public function preferred(): static
    {
        return $this->state(['availability_status' => 'preferred']);
    }
}
