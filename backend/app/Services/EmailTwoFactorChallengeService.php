<?php

namespace App\Services;

use App\Mail\LoginOtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class EmailTwoFactorChallengeService
{
    private const TTL_SECONDS = 600;

    private const MAX_ATTEMPTS = 5;

    /**
     * Create a challenge, send OTP email, return plaintext pending token for the client.
     */
    public function createChallenge(User $user): string
    {
        $pendingToken = bin2hex(random_bytes(32));
        $plainCode = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        $payload = [
            'user_id' => $user->id,
            'code_hash' => hash('sha256', $plainCode),
            'attempts' => 0,
            'expires_at' => time() + self::TTL_SECONDS,
        ];

        Cache::put($this->cacheKey($pendingToken), $payload, self::TTL_SECONDS + 120);

        Mail::to($user->email)->send(new LoginOtpMail($plainCode, $user->name));

        return $pendingToken;
    }

    /**
     * Verify code and return the user if valid. Invalidates challenge on success.
     */
    public function verify(string $pendingToken, string $code): ?User
    {
        $key = $this->cacheKey($pendingToken);
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            return null;
        }

        if (time() > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($key);

            return null;
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::forget($key);

            return null;
        }

        $expectedHash = $payload['code_hash'] ?? '';
        $actualHash = hash('sha256', $code);

        if (! hash_equals($expectedHash, $actualHash)) {
            $payload['attempts'] = $attempts + 1;
            Cache::put($key, $payload, self::TTL_SECONDS + 120);

            return null;
        }

        Cache::forget($key);

        return User::query()->find($payload['user_id'] ?? null);
    }

    /**
     * Send a new code for an existing pending challenge. Returns false if challenge missing or expired.
     */
    public function resend(string $pendingToken): bool
    {
        $key = $this->cacheKey($pendingToken);
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            return false;
        }

        if (time() > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($key);

            return false;
        }

        $user = User::query()->find($payload['user_id'] ?? null);
        if (! $user) {
            Cache::forget($key);

            return false;
        }

        $plainCode = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
        $payload['code_hash'] = hash('sha256', $plainCode);
        $payload['attempts'] = 0;
        $payload['expires_at'] = time() + self::TTL_SECONDS;

        Cache::put($key, $payload, self::TTL_SECONDS + 120);

        Mail::to($user->email)->send(new LoginOtpMail($plainCode, $user->name));

        return true;
    }

    private function cacheKey(string $pendingToken): string
    {
        return 'email_2fa:'.hash('sha256', $pendingToken);
    }
}
