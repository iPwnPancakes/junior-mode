<?php

use App\Models\ClientConnection;
use App\Models\EnrolledRepository;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

require __DIR__.'/../../learning-platform/vendor/autoload.php';
$app = require __DIR__.'/../../learning-platform/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
Artisan::call('migrate', ['--force' => true]);
$learner = User::factory()->learner()->create(['name' => 'Integration Learner']);
$token = 'jm_'.str_repeat('a', 64);
ClientConnection::factory()->for($learner, 'learner')->create(['token_hash' => hash('sha256', $token)]);
EnrolledRepository::factory()->for($learner, 'learner')->withRemote()->create();
