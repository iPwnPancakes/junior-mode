<?php

use App\Http\Controllers\Auth\BootstrapRegistrationController;
use App\Http\Controllers\Auth\LearnerInvitationAcceptanceController;
use App\Http\Controllers\ClientConnectionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LearnerInvitationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('register', [BootstrapRegistrationController::class, 'create'])
        ->name('register');
    Route::post('register', [BootstrapRegistrationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('register.store');

    Route::get('invitations/{token}', [LearnerInvitationAcceptanceController::class, 'show'])
        ->where('token', '[A-Za-z0-9]{64}')
        ->name('learner-invitations.accept');
    Route::post('invitations/{token}', [LearnerInvitationAcceptanceController::class, 'store'])
        ->where('token', '[A-Za-z0-9]{64}')
        ->middleware('throttle:6,1')
        ->name('learner-invitations.accept.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::post('learner-invitations', [LearnerInvitationController::class, 'store'])
        ->name('learner-invitations.store');
    Route::get('client-connections', [ClientConnectionController::class, 'index'])
        ->name('client-connections.index');
    Route::delete('client-connections/{clientConnection}', [ClientConnectionController::class, 'destroy'])
        ->name('client-connections.destroy');
});

require __DIR__.'/settings.php';
