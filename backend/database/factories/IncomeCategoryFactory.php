<?php

namespace Database\Factories;

use App\Models\IncomeCategory;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncomeCategoryFactory extends Factory
{
    protected $model = IncomeCategory::class;

    public function definition(): array
    {
        return [
            'school_id' => School::factory(),
            'name'      => fake()->randomElement(['School Fees', 'Exam Fees', 'Transport Fees', 'Donations']) . ' ' . fake()->unique()->numberBetween(1, 99999),
            'code'      => strtoupper(fake()->bothify('INC-##')),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
