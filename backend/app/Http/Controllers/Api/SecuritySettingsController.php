<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class SecuritySettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'email' => [
                'enabled' => (bool) $user->two_factor_email_enabled,
                'address' => $user->email,
                'can_disable' => $user->hasAnotherTwoFactorMethodBesides('email'),
            ],
            'totp' => [
                'enabled' => $user->two_factor_totp_enabled_at !== null,
                'enabled_at' => $user->two_factor_totp_enabled_at?->toIso8601String(),
                'can_disable' => $user->hasAnotherTwoFactorMethodBesides('totp'),
            ],
            'available_login_methods' => $user->availableTwoFactorMethods(),
        ]);
    }

    public function toggleEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        if (! $data['enabled'] && ! $user->hasAnotherTwoFactorMethodBesides('email')) {
            throw ValidationException::withMessages([
                'enabled' => ['Keep at least one 2FA method enabled. Enable Google Authenticator before turning off email 2FA.'],
            ]);
        }

        $user->update([
            'two_factor_email_enabled' => (bool) $data['enabled'],
        ]);

        return response()->json([
            'message' => $data['enabled']
                ? 'Email 2FA enabled.'
                : 'Email 2FA disabled.',
        ]);
    }

    public function startTotpSetup(Request $request): JsonResponse
    {
        $user = $request->user();
        $google2fa = new Google2FA;

        $secret = $google2fa->generateSecretKey();
        $issuer = (string) config('app.name', 'AI Tools Platform');
        $otpauth = $google2fa->getQRCodeUrl($issuer, $user->email, $secret);
        $setupToken = Str::random(64);

        Cache::put(
            $this->totpSetupKey($setupToken),
            [
                'user_id' => (int) $user->id,
                'secret' => $secret,
                'expires_at' => now()->addMinutes(10)->timestamp,
            ],
            now()->addMinutes(10)
        );

        return response()->json([
            'setup_token' => $setupToken,
            'otpauth_url' => $otpauth,
            'qr_url' => 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='.rawurlencode($otpauth),
            'expires_in_seconds' => 600,
        ]);
    }

    public function confirmTotpSetup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'setup_token' => ['required', 'string', 'size:64'],
            'code' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        $payload = Cache::get($this->totpSetupKey($data['setup_token']));
        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'setup_token' => ['Setup session expired. Start setup again.'],
            ]);
        }

        if ((int) ($payload['user_id'] ?? 0) !== (int) $request->user()->id) {
            throw ValidationException::withMessages([
                'setup_token' => ['Invalid setup session.'],
            ]);
        }

        if (now()->timestamp > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($this->totpSetupKey($data['setup_token']));
            throw ValidationException::withMessages([
                'setup_token' => ['Setup session expired. Start setup again.'],
            ]);
        }

        $secret = (string) ($payload['secret'] ?? '');
        $google2fa = new Google2FA;
        $valid = $google2fa->verifyKey($secret, $data['code'], 2);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authenticator code.'],
            ]);
        }

        $request->user()->update([
            'two_factor_totp_secret' => $secret,
            'two_factor_totp_enabled_at' => now(),
        ]);

        Cache::forget($this->totpSetupKey($data['setup_token']));

        return response()->json([
            'message' => 'Google Authenticator 2FA enabled.',
        ]);
    }

    public function disableTotp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAnotherTwoFactorMethodBesides('totp')) {
            throw ValidationException::withMessages([
                'totp' => ['Keep at least one 2FA method enabled. Enable email 2FA before disabling the authenticator app.'],
            ]);
        }

        $user->update([
            'two_factor_totp_secret' => null,
            'two_factor_totp_enabled_at' => null,
        ]);

        return response()->json([
            'message' => 'Google Authenticator 2FA disabled.',
        ]);
    }

    private function totpSetupKey(string $token): string
    {
        return '2fa:totp:setup:'.hash('sha256', $token);
    }
}
