<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'school_id'           => School::factory(),
            'expense_category_id' => ExpenseCategory::factory(),
            'expense_date'        => now()->toDateString(),
            'reference_number'    => fake()->bothify('REF-####'),
            'vendor_name'         => fake()->company(),
            'amount'              => fake()->randomFloat(2, 10, 5000),
            'payment_method'      => 'bank_transfer',
            'status'              => 'draft',
            'created_by_user_id'  => User::factory(),
        ];
    }

    public function approved(): static { return $this->state(['status' => 'approved']); }
    public function paid(): static     { return $this->state(['status' => 'paid']); }
}
