<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\VerifyEmailTwoFactorRequest;
use App\Services\EmailTwoFactorChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class VerifyEmailTwoFactorController extends Controller
{
    public function __invoke(
        VerifyEmailTwoFactorRequest $request,
        EmailTwoFactorChallengeService $twoFactor,
    ): JsonResponse {
        $user = $twoFactor->verify(
            $request->validated('pending_token'),
            $request->validated('code'),
        );

        if (! $user) {
            throw ValidationException::withMessages([
                'code' => ['Invalid or expired code.'],
            ]);
        }

        $tokenName = $request->validated('device_name', 'api');
        $plainTextToken = $user->createToken($tokenName)->plainTextToken;

        return response()->json([
            'token' => $plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user->only(['id', 'name', 'email', 'role', 'email_verified_at']),
        ]);
    }
}
