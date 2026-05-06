<?php

use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\ResendEmailTwoFactorController;
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
Route::post('/login/verify-2fa', VerifyEmailTwoFactorController::class)->middleware('throttle:20,1');
Route::post('/login/resend-2fa', ResendEmailTwoFactorController::class)->middleware('throttle:12,1');

Route::get('/user', CurrentUserController::class)->middleware('auth:sanctum');

Route::get('/tool-metadata', ToolMetadataController::class);

Route::get('/tools', [ToolController::class, 'index']);
Route::get('/tools/{tool}', [ToolController::class, 'show']);
Route::post('/tools', [ToolController::class, 'store'])->middleware('auth:sanctum');
Route::put('/tools/{tool}', [ToolController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/tools/{tool}', [ToolController::class, 'destroy'])->middleware('auth:sanctum');
