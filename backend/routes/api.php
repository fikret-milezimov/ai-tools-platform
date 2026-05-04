<?php

use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\LoginController;
use Illuminate\Support\Facades\Route;

Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Laravel API is running',
    ]);
});

Route::post('/login', LoginController::class)->middleware('throttle:10,1');

Route::get('/user', CurrentUserController::class)->middleware('auth:sanctum');
