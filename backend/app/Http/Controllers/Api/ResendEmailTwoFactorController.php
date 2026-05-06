<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ResendEmailTwoFactorRequest;
use App\Services\EmailTwoFactorChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class ResendEmailTwoFactorController extends Controller
{
    public function __invoke(
        ResendEmailTwoFactorRequest $request,
        EmailTwoFactorChallengeService $twoFactor,
    ): JsonResponse {
        $token = $request->validated('pending_token');
        $throttleKey = '2fa-resend:'.hash('sha256', $token).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'pending_token' => [
                    'Too many resend attempts. Try again in '.$seconds.' seconds.',
                ],
            ]);
        }

        RateLimiter::hit($throttleKey, 60);

        if (! $twoFactor->resend($token)) {
            throw ValidationException::withMessages([
                'pending_token' => [__('This sign-in session has expired. Please sign in again.')],
            ]);
        }

        return response()->json([
            'message' => 'A new code has been sent to your email.',
        ]);
    }
}
