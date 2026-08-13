<?php

use App\Http\Controllers\Auth\BootstrapRegistrationController;
use App\Http\Controllers\Auth\LearnerInvitationAcceptanceController;
use App\Http\Controllers\ClientConnectionController;
use App\Http\Controllers\CompetencyArchiveController;
use App\Http\Controllers\CompetencyCatalogController;
use App\Http\Controllers\CompetencyController;
use App\Http\Controllers\CompetencyMergeController;
use App\Http\Controllers\CompetencyTemplateCopyController;
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
    Route::get('learners/{learner}/competency-catalog', CompetencyCatalogController::class)
        ->name('competency-catalogs.show');
    Route::post('learners/{learner}/competencies', [CompetencyController::class, 'store'])
        ->name('competencies.store');
    Route::patch('learners/{learner}/competencies/{competency}', [CompetencyController::class, 'update'])
        ->scopeBindings()
        ->name('competencies.update');
    Route::post('learners/{learner}/competencies/{competency}/archive', CompetencyArchiveController::class)
        ->scopeBindings()
        ->name('competencies.archive');
    Route::post('learners/{learner}/competencies/{competency}/merge', CompetencyMergeController::class)
        ->scopeBindings()
        ->name('competencies.merge');
    Route::post('learners/{learner}/competency-template-copies', CompetencyTemplateCopyController::class)
        ->name('competency-template-copies.store');
});

require __DIR__.'/settings.php';
