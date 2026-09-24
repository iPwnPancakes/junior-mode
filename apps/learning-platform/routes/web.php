<?php

use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\Auth\BootstrapRegistrationController;
use App\Http\Controllers\Auth\LearnerInvitationAcceptanceController;
use App\Http\Controllers\BaselineAssessmentProposalDecisionController;
use App\Http\Controllers\CatalogProposalController;
use App\Http\Controllers\CatalogProposalDecisionController;
use App\Http\Controllers\CatalogProposalNodeController;
use App\Http\Controllers\CatalogProposalSelectionController;
use App\Http\Controllers\ClientConnectionController;
use App\Http\Controllers\CoachingPriorityController;
use App\Http\Controllers\CoachingPriorityRenewalController;
use App\Http\Controllers\CoachingPriorityReplacementController;
use App\Http\Controllers\CoachingPriorityResolutionController;
use App\Http\Controllers\CoachingRecordController;
use App\Http\Controllers\CoachingSessionController;
use App\Http\Controllers\CompetencyArchiveController;
use App\Http\Controllers\CompetencyCatalogController;
use App\Http\Controllers\CompetencyController;
use App\Http\Controllers\CompetencyMergeController;
use App\Http\Controllers\CompetencyTemplateCopyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EnrolledRepositoryController;
use App\Http\Controllers\LearnerInvitationController;
use App\Http\Controllers\LearningEvidenceCorrectionController;
use App\Http\Controllers\MentorCoachingSettingsController;
use App\Http\Controllers\RepositoryEnrollmentController;
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
    Route::get('repositories', [EnrolledRepositoryController::class, 'index'])
        ->name('enrolled-repositories.index');
    Route::get('coaching-sessions', [CoachingSessionController::class, 'index'])
        ->name('coaching-sessions.index');
    Route::post('learners/{learner}/repositories', [EnrolledRepositoryController::class, 'store'])
        ->name('enrolled-repositories.store');
    Route::patch('learners/{learner}/repositories/{enrolledRepository}', [EnrolledRepositoryController::class, 'update'])
        ->scopeBindings()
        ->name('enrolled-repositories.update');
    Route::post('learners/{learner}/repositories/{enrolledRepository}/enrollment', [RepositoryEnrollmentController::class, 'store'])
        ->scopeBindings()
        ->name('repository-enrollments.store');
    Route::delete('learners/{learner}/repositories/{enrolledRepository}/enrollment', [RepositoryEnrollmentController::class, 'destroy'])
        ->scopeBindings()
        ->name('repository-enrollments.destroy');
    Route::get('learners/{learner}/competency-catalog', CompetencyCatalogController::class)
        ->name('competency-catalogs.show');
    Route::post('learning-evidence/{learningEvidence}/corrections', LearningEvidenceCorrectionController::class)->name('learning-evidence-corrections.store');
    Route::get('learners/{learner}/coaching-record', CoachingRecordController::class)
        ->name('coaching-records.show');
    Route::post('learners/{learner}/assessments', [AssessmentController::class, 'store'])
        ->name('assessments.store');
    Route::post('learners/{learner}/coaching-priorities', [CoachingPriorityController::class, 'store'])
        ->name('coaching-priorities.store');
    Route::patch('learners/{learner}/coaching-priorities/{coachingPriority}', [CoachingPriorityController::class, 'update'])
        ->scopeBindings()
        ->name('coaching-priorities.update');
    Route::post('learners/{learner}/coaching-priorities/{coachingPriority}/renewal', CoachingPriorityRenewalController::class)
        ->scopeBindings()
        ->name('coaching-priority-renewals.store');
    Route::post('learners/{learner}/coaching-priorities/{coachingPriority}/resolution', CoachingPriorityResolutionController::class)
        ->scopeBindings()
        ->name('coaching-priority-resolutions.store');
    Route::post('learners/{learner}/coaching-priorities/{coachingPriority}/replacement', CoachingPriorityReplacementController::class)
        ->scopeBindings()
        ->name('coaching-priority-replacements.store');
    Route::patch('mentor/coaching-settings', MentorCoachingSettingsController::class)
        ->name('mentor-coaching-settings.update');
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
    Route::get('learners/{learner}/catalog-proposals/{catalogProposal}', [CatalogProposalController::class, 'show'])
        ->scopeBindings()
        ->name('catalog-proposals.show');
    Route::post('learners/{learner}/catalog-proposals/{catalogProposal}/nodes', [CatalogProposalNodeController::class, 'store'])
        ->scopeBindings()
        ->name('catalog-proposal-nodes.store');
    Route::patch('learners/{learner}/catalog-proposals/{catalogProposal}/nodes/{node}', [CatalogProposalNodeController::class, 'update'])
        ->scopeBindings()
        ->name('catalog-proposal-nodes.update');
    Route::delete('learners/{learner}/catalog-proposals/{catalogProposal}/nodes/{node}', [CatalogProposalNodeController::class, 'destroy'])
        ->scopeBindings()
        ->name('catalog-proposal-nodes.destroy');
    Route::patch('learners/{learner}/catalog-proposals/{catalogProposal}/nodes/{node}/selection', CatalogProposalSelectionController::class)
        ->scopeBindings()
        ->name('catalog-proposal-selections.update');
    Route::post('learners/{learner}/catalog-proposals/{catalogProposal}/decision', CatalogProposalDecisionController::class)
        ->scopeBindings()
        ->name('catalog-proposal-decisions.store');
    Route::post('learners/{learner}/catalog-proposals/{catalogProposal}/baseline-assessments/{baselineAssessment}/decision', BaselineAssessmentProposalDecisionController::class)
        ->scopeBindings()
        ->name('baseline-assessment-proposal-decisions.store');
});

require __DIR__.'/settings.php';
