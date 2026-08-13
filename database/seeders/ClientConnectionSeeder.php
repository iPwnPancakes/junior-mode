<?php

namespace Database\Seeders;

use App\Models\ClientConnection;
use Illuminate\Database\Seeder;

class ClientConnectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ClientConnection::factory()->count(3)->create();
    }
}
