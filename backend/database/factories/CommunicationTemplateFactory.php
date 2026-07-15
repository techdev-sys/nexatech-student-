<?php

namespace Database\Factories;

use App\Models\CommunicationTemplate;
use App\Models\School;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CommunicationTemplate>
 */
class CommunicationTemplateFactory extends Factory
{
    protected $model = CommunicationTemplate::class;

    public function definition(): array
    {
        return [
            'school_id'   => School::factory(),
            'name'        => fake()->words(3, true),
            'channel'     => 'sms',
            'body'        => 'Dear {{parent_name}}, this is a test message.',
            'is_active'   => true,
        ];
    }

    public function email(): static
    {
        return $this->state(['channel' => 'email', 'subject' => 'Test Subject']);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
