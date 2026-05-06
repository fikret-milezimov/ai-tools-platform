<?php

use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\ToolController;
use App\Http\Controllers\Api\ToolMetadataController;
use Illuminate\Support\Facades\Route;

Route::get('/status', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Laravel API is running',
    ]);
});

Route::post('/login', LoginController::class)->middleware('throttle:10,1');

Route::get('/user', CurrentUserController::class)->middleware('auth:sanctum');

Route::get('/tool-metadata', ToolMetadataController::class);

Route::get('/tools', [ToolController::class, 'index']);
Route::get('/tools/{tool}', [ToolController::class, 'show']);
Route::post('/tools', [ToolController::class, 'store'])->middleware('auth:sanctum');
Route::put('/tools/{tool}', [ToolController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/tools/{tool}', [ToolController::class, 'destroy'])->middleware('auth:sanctum');
