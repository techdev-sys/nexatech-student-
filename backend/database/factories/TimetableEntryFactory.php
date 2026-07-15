<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\TimetableEntry;
use App\Models\TimetablePeriod;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimetableEntry>
 */
class TimetableEntryFactory extends Factory
{
    protected $model = TimetableEntry::class;

    public function definition(): array
    {
        return [
            'school_id'       => School::factory(),
            'teacher_user_id' => User::factory()->teacher(),
            'period_id'       => TimetablePeriod::factory(),
            'day_of_week'     => 'monday',
            'academic_year'   => '2026',
            'term'            => 'Term 1',
            'status'          => 'active',
            'notes'           => null,
        ];
    }

    public function cancelled(): static
    {
        return $this->state(['status' => 'cancelled']);
    }

    public function draft(): static
    {
        return $this->state(['status' => 'draft']);
    }
}
