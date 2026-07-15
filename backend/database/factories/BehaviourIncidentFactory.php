<?php

namespace Database\Factories;

use App\Models\BehaviourIncident;
use App\Models\BehaviourIncidentType;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BehaviourIncident>
 */
class BehaviourIncidentFactory extends Factory
{
    protected $model = BehaviourIncident::class;

    public function definition(): array
    {
        return [
            'school_id'           => School::factory(),
            'student_id'          => Student::factory(),
            'incident_type_id'    => BehaviourIncidentType::factory(),
            'reported_by_user_id' => User::factory(),
            'points'              => -5,
            'incident_date'       => now()->format('Y-m-d'),
            'status'              => 'recorded',
        ];
    }
}
