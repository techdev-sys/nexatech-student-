<?php

namespace Database\Factories;

use App\Models\BehaviourIncidentType;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BehaviourIncidentType>
 */
class BehaviourIncidentTypeFactory extends Factory
{
    protected $model = BehaviourIncidentType::class;

    public function definition(): array
    {
        return [
            'school_id'      => School::factory(),
            'name'           => fake()->words(3, true),
            'default_points' => -5,
            'severity'       => 'medium',
            'category'       => 'negative',
            'notify_parent'  => false,
            'is_active'      => true,
        ];
    }

    public function notifyParent(): static
    {
        return $this->state(['notify_parent' => true, 'severity' => 'high']);
    }
}
