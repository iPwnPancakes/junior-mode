<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('v1/health', HealthController::class)->name('api.v1.health');
