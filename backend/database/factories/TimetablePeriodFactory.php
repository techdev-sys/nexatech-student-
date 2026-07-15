<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\TimetablePeriod;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimetablePeriod>
 */
class TimetablePeriodFactory extends Factory
{
    protected $model = TimetablePeriod::class;

    public function definition(): array
    {
        return [
            'school_id'  => School::factory(),
            'name'       => 'Period ' . fake()->numberBetween(1, 8),
            'starts_at'  => '07:30',
            'ends_at'    => '08:10',
            'sort_order' => fake()->numberBetween(1, 8),
            'is_break'   => false,
            'is_active'  => true,
        ];
    }

    public function break(): static
    {
        return $this->state(['name' => 'Break', 'is_break' => true]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
