<?php

namespace Database\Factories;

use App\Models\CashbookEntry;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashbookEntryFactory extends Factory
{
    protected $model = CashbookEntry::class;

    public function definition(): array
    {
        return [
            'school_id'        => School::factory(),
            'entry_type'       => 'income',
            'transaction_date' => now()->toDateString(),
            'amount'           => fake()->randomFloat(2, 10, 5000),
            'description'      => fake()->sentence(3),
        ];
    }

    public function expense(): static { return $this->state(['entry_type' => 'expense']); }
}
