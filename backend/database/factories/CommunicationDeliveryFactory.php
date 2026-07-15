<?php

namespace Database\Factories;

use App\Models\Communication;
use App\Models\CommunicationDelivery;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CommunicationDelivery>
 */
class CommunicationDeliveryFactory extends Factory
{
    protected $model = CommunicationDelivery::class;

    public function definition(): array
    {
        return [
            'school_id'        => School::factory(),
            'communication_id' => Communication::factory(),
            'recipient_name'   => fake()->name(),
            'recipient_phone'  => '+263771234567',
            'channel'          => 'sms',
            'delivery_status'  => 'pending',
        ];
    }

    public function sent(): static
    {
        return $this->state(['delivery_status' => 'sent', 'sent_at' => now()]);
    }

    public function failed(): static
    {
        return $this->state(['delivery_status' => 'failed', 'error_message' => 'No phone number on file.', 'failed_at' => now()]);
    }
}
