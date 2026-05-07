<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Services\TwoFactorLoginService;
use Illuminate\Http\JsonResponse;

class LoginController extends Controller
{
    public function __invoke(
        LoginRequest $request,
        TwoFactorLoginService $twoFactor,
    ): JsonResponse {
        $user = $request->authenticateUser();

        if ($user->requiresTwoFactor()) {
            $pending = $twoFactor->createPendingLogin($user);

            return response()->json([
                'requires_2fa' => true,
                'pending_token' => $pending['pending_token'],
                'methods' => $pending['methods'],
                'message' => 'Choose how to verify it’s you.',
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
