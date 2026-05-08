<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StartTwoFactorMethodRequest;
use App\Services\TwoFactorLoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class StartTwoFactorMethodController extends Controller
{
    public function __invoke(
        StartTwoFactorMethodRequest $request,
        TwoFactorLoginService $twoFactor,
    ): JsonResponse {
        try {
            $twoFactor->startMethod(
                $request->validated('pending_token'),
                $request->validated('method'),
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'method' => [$e->getMessage()],
            ]);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages([
                'method' => [$e->getMessage()],
            ]);
        }

        $method = $request->validated('method');
        $message = match ($method) {
            'email' => 'Check your email for a verification code.',
            'totp' => 'Open your authenticator app and enter the 6-digit code.',
            default => 'Continue with verification.',
        };

        return response()->json([
            'message' => $message,
            'method' => $method,
        ]);
    }
}
