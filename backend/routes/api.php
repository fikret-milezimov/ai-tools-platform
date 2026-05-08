<?php

use App\Http\Controllers\Api\AdminToolController;
use App\Http\Controllers\Api\AdminLogController;
use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\ResendEmailTwoFactorController;
use App\Http\Controllers\Api\SecuritySettingsController;
use App\Http\Controllers\Api\StartTwoFactorMethodController;
use App\Http\Controllers\Api\ToolController;
use App\Http\Controllers\Api\ToolMetadataController;
use App\Http\Controllers\Api\VerifyEmailTwoFactorController;
use Illuminate\Support\Facades\Route;

Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Laravel API is running',
    ]);
});

Route::post('/login', LoginController::class)->middleware('throttle:10,1');
Route::post('/login/2fa/start', StartTwoFactorMethodController::class)->middleware('throttle:30,1');
Route::post('/login/verify-2fa', VerifyEmailTwoFactorController::class)->middleware('throttle:20,1');
Route::post('/login/resend-2fa', ResendEmailTwoFactorController::class)->middleware('throttle:12,1');

Route::get('/user', CurrentUserController::class)->middleware('auth:sanctum');
Route::get('/settings/security', [SecuritySettingsController::class, 'show'])->middleware('auth:sanctum');
Route::post('/settings/security/email/toggle', [SecuritySettingsController::class, 'toggleEmail'])->middleware('auth:sanctum');
Route::post('/settings/security/totp/setup-start', [SecuritySettingsController::class, 'startTotpSetup'])->middleware('auth:sanctum');
Route::post('/settings/security/totp/setup-confirm', [SecuritySettingsController::class, 'confirmTotpSetup'])->middleware('auth:sanctum');
Route::post('/settings/security/totp/disable', [SecuritySettingsController::class, 'disableTotp'])->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', 'role:owner,pm'])->prefix('admin')->group(function () {
    Route::get('/tools', [AdminToolController::class, 'index']);
    Route::get('/logs', [AdminLogController::class, 'index']);
    Route::post('/tools/{tool}/approve', [AdminToolController::class, 'approve']);
    Route::post('/tools/{tool}/reject', [AdminToolController::class, 'reject']);
});

Route::get('/tool-metadata', ToolMetadataController::class);

Route::get('/tools', [ToolController::class, 'index']);
Route::get('/tools/{tool}', [ToolController::class, 'show']);
Route::post('/tools', [ToolController::class, 'store'])->middleware('auth:sanctum');
Route::put('/tools/{tool}', [ToolController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/tools/{tool}', [ToolController::class, 'destroy'])->middleware('auth:sanctum');
