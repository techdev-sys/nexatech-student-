<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\TimetableRoom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimetableRoom>
 */
class TimetableRoomFactory extends Factory
{
    protected $model = TimetableRoom::class;

    public function definition(): array
    {
        return [
            'school_id' => School::factory(),
            'name'      => 'Room ' . fake()->numberBetween(1, 30),
            'code'      => strtoupper(fake()->bothify('R-##')),
            'capacity'  => fake()->numberBetween(20, 50),
            'room_type' => 'classroom',
            'is_active' => true,
        ];
    }

    public function laboratory(): static
    {
        return $this->state(['room_type' => 'laboratory', 'name' => 'Science Lab']);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
