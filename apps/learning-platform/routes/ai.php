<?php

use App\Http\Controllers\Mcp\ClientAuthorizationApprovalController;
use App\Http\Controllers\Mcp\ClientAuthorizationController;
use App\Http\Controllers\Mcp\ClientAuthorizationTokenController;
use App\Http\Middleware\AuthenticateClientConnection;
use App\Mcp\Servers\JuniorModeServer;
use Illuminate\Support\Facades\Route;
use Laravel\Mcp\Facades\Mcp;

Route::post('/mcp/client-authorizations', [ClientAuthorizationController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('client-authorizations.store');

Route::post('/mcp/client-authorizations/token', ClientAuthorizationTokenController::class)
    ->middleware('throttle:60,1')
    ->name('client-authorizations.token');

Route::middleware(['web', 'auth', 'verified'])
    ->prefix('codex')
    ->group(function (): void {
        Route::get('authorize/{userCode}', [ClientAuthorizationApprovalController::class, 'show'])
            ->where('userCode', '[A-Za-z0-9]{4}-[A-Za-z0-9]{4}')
            ->middleware('throttle:20,1')
            ->name('client-authorizations.approval.show');
        Route::post('authorize/{userCode}', [ClientAuthorizationApprovalController::class, 'store'])
            ->where('userCode', '[A-Za-z0-9]{4}-[A-Za-z0-9]{4}')
            ->middleware('throttle:6,1')
            ->name('client-authorizations.approval.store');
    });

Mcp::web('/mcp', JuniorModeServer::class)
    ->middleware([AuthenticateClientConnection::class, 'throttle:120,1']);
