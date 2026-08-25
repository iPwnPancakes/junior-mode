<?php

namespace Database\Factories;

use App\Models\ClientConnection;
use App\Models\CoachingSession;
use App\Models\Competency;
use App\Models\User;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoachingSession>
 */
class CoachingSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'learner_id' => User::factory()->learner(),
            'work_item_id' => WorkItem::factory(),
            'primary_learning_objective_id' => Competency::factory(),
            'client_connection_id' => ClientConnection::factory(),
            'status' => 'active',
            'last_active_at' => now(),
        ];
    }
}
