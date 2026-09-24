<?php

namespace Database\Seeders;

use App\Models\ClientAuthorization;
use Illuminate\Database\Seeder;

class ClientAuthorizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ClientAuthorization::factory()->count(3)->create();
    }
}
