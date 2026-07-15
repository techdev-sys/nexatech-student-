<?php

namespace Database\Factories;

use App\Models\Communication;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Communication>
 */
class CommunicationFactory extends Factory
{
    protected $model = Communication::class;

    public function definition(): array
    {
        return [
            'school_id'             => School::factory(),
            'created_by_user_id'    => User::factory(),
            'channel'               => 'sms',
            'audience_type'         => 'parents',
            'body'                  => 'Test broadcast message.',
            'status'                => 'draft',
            'total_recipients'      => 0,
            'successful_deliveries' => 0,
            'failed_deliveries'     => 0,
        ];
    }

    public function announcement(): static
    {
        return $this->state([
            'channel'      => 'announcement',
            'subject'      => fake()->sentence(4),
            'status'       => 'completed',
            'sent_at'      => now(),
            'published_at' => now(), // immediately visible by default
        ]);
    }

    public function sent(): static
    {
        return $this->state([
            'status'                => 'completed',
            'sent_at'               => now(),
            'total_recipients'      => 5,
            'successful_deliveries' => 5,
            'failed_deliveries'     => 0,
        ]);
    }
}
