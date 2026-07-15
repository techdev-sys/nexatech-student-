<?php

namespace Database\Factories;

use App\Models\ExpenseCategory;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseCategoryFactory extends Factory
{
    protected $model = ExpenseCategory::class;

    public function definition(): array
    {
        return [
            'school_id' => School::factory(),
            'name'      => fake()->randomElement(['Salaries', 'Fuel', 'Electricity', 'Internet', 'Repairs']) . ' ' . fake()->unique()->numberBetween(1, 99999),
            'code'      => strtoupper(fake()->bothify('EXP-##')),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
